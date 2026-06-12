
require("dotenv").config();

const path = require("path");
const cors = require("cors");
const express = require("express");
const crypto = require("crypto");
const mongoose = require("mongoose");
const multer = require("multer");
const nodemailer = require("nodemailer");
const fs = require("fs");

const Student = require("./models/Student");
if(!Student.schema.path("lastActiveDate"))    Student.schema.add({ lastActiveDate:    { type: Date } });
// NEW FEATURE: V2 student portal fields — added early so findOne() recognises them
if(!Student.schema.path("v2Onboarded"))    Student.schema.add({ v2Onboarded:    { type: Boolean, default: false } });
if(!Student.schema.path("v2DurationType")) Student.schema.add({ v2DurationType: { type: String,  default: null  } });
const DocumentHistory = require("./models/DocumentHistory");
const MailHistory = require("./models/MailHistory");
const { generateDocumentNumber, normalizeDocumentNumber } = require("./utils/documentNumber");
const Notice = require("./models/Notice");
const Notification = require("./models/Notification");
const Attendance = require("./models/Attendance");
const Message = require("./models/Message");
const HR = require("./models/HR");
const Coordinator = require("./models/Coordinator");
const Promotion = require("./models/Promotion");
const BadgeAward = require("./models/BadgeAward");
const BlockList = require("./models/BlockList");

const autoMailLogSchema = new mongoose.Schema({
  studentName:  String,
  studentEmail: String,
  employeeId:   String,
  mailType:     String,
  sentAt:       { type: Date, default: Date.now }
});
const AutoMailLog = mongoose.model('AutoMailLog', autoMailLogSchema);

const bcrypt = require("bcrypt");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const QRCode = require("qrcode");
const cron = require("node-cron");
const http = require("http");
const { Server: SocketIOServer } = require("socket.io");

// All domains supported by the system (Requirement 5: HR Management included).
// Anywhere the backend filters or iterates domains, it should reference this list.
const ALL_DOMAINS = [
    "DevOps with AWS","Python Development","Java Development","Web Development",
    "MERN Stack Development","Artificial Intelligence","Data Science",
    "Cyber Security","Software Engineering","Flutter Development",
    "HR Management",
    "Venture Capital","Vibe Coding","Space Research","Business Analyst","HR"
];

// Shared credential maps (legacy hardcoded accounts).
// Used by /hr-login, /coordinator-login, and chat handshake auth.
// New DB-backed accounts (created via the promotion flow) are stored in the
// `HR` and `Coordinator` collections and looked up alongside these maps.
//
// SECURITY: Passwords are loaded from environment variables in production.
// The fallback defaults below are for LOCAL DEVELOPMENT ONLY and should be
// overridden via HR_CREDENTIALS / COORDINATOR_CREDENTIALS env vars in production.
const _hrCredsEnv = process.env.HR_CREDENTIALS ? JSON.parse(process.env.HR_CREDENTIALS) : null;
const HR_ACCOUNTS = _hrCredsEnv ? {
    "hr_admin":   { password: _hrCredsEnv.hr_admin   || "", name: "HR Administrator", email: "hr.admin@ten.local" },
    "hr_manager": { password: _hrCredsEnv.hr_manager || "", name: "HR Manager",       email: "hr.manager@ten.local" }
} : {
    "hr_admin":   { password: "CHANGE_ME_hr_admin",   name: "HR Administrator", email: "hr.admin@ten.local" },
    "hr_manager": { password: "CHANGE_ME_hr_manager", name: "HR Manager",       email: "hr.manager@ten.local" }
};

const _coordCredsEnv = process.env.COORDINATOR_CREDENTIALS ? JSON.parse(process.env.COORDINATOR_CREDENTIALS) : null;
const _COORD_DOMAINS = {
    "devops_aws_admin":      "DevOps with AWS",
    "python_admin":          "Python Development",
    "java_admin":            "Java Development",
    "web_admin":             "Web Development",
    "mern_admin":            "MERN Stack Development",
    "ai_admin":              "Artificial Intelligence",
    "datascience_admin":     "Data Science",
    "cyber_admin":           "Cyber Security",
    "software_admin":        "Software Engineering",
    "flutter_admin":         "Flutter Development",
    "hrmgmt_admin":          "HR Management",
    "venturecapital_admin":  "Venture Capital",
    "vibecoding_admin":      "Vibe Coding",
    "spaceresearch_admin":   "Space Research",
    "businessanalyst_admin": "Business Analyst",
    "hr_domain_admin":       "HR"
};
const COORDINATORS = {};
for (const [username, domain] of Object.entries(_COORD_DOMAINS)) {
    COORDINATORS[username] = {
        password: (_coordCredsEnv && _coordCredsEnv[username]) || ("CHANGE_ME_" + username),
        domain
    };
}

const app = express();

// ===== Production config =====
const PORT = process.env.PORT || 5000;
const BASE_URL = process.env.BASE_URL || "https://virtualinternships.entrepreneurshipnetwork.net";

// Ensure uploads directory exists (multer writes to it)
const uploadsAbs = path.join(__dirname, "uploads");
try { fs.mkdirSync(uploadsAbs, { recursive: true }); } catch(_) {}

app.set('trust proxy', 1);

// SECURITY: Restrict CORS to configured origins in production.
// If CORS_ALLOWED_ORIGINS is not set, allows all origins (development mode).
const _corsOrigins = process.env.CORS_ALLOWED_ORIGINS
    ? process.env.CORS_ALLOWED_ORIGINS.split(",").map(s => s.trim()).filter(Boolean)
    : null;
app.use(cors(_corsOrigins ? {
    origin: _corsOrigins,
    credentials: true
} : undefined));

app.use(express.json());
app.use(express.static("public"));
app.use('/uploads', express.static('uploads'));


// ===== Feature 14: security hardening =====
// helmet sets secure HTTP headers; we keep CSP off so the existing inline
// scripts and external CDNs (sweetalert2, socket.io.js) keep working.
// We also strip Mongo operator keys ($, .) from req.body to block NoSQL
// injection. We do not touch req.query because Express 5 makes it a
// read-only getter; this is fine because all routes that use ?params read
// strings, not objects.
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false
}));
function _sanitizeKeys(obj){
    if(!obj || typeof obj !== "object") return;
    for(const k of Object.keys(obj)){
        if(k.startsWith("$") || k.indexOf(".") !== -1){
            delete obj[k];
        } else if(obj[k] && typeof obj[k] === "object"){
            _sanitizeKeys(obj[k]);
        }
    }
}
app.use((req, _res, next) => { _sanitizeKeys(req.body); _sanitizeKeys(req.params); next(); });

// Per-IP login rate limit (strictest). Applied directly to the login routes
// further down via the `loginLimiter` reference.
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,            // 15 min
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success:false, message:"Too many login attempts. Please wait 15 minutes." }
});

// Registration rate limit
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,            // 1 hour
    max: 3,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success:false, message:"Too many registration attempts. Please try again later." }
});

// General API rate limit — applied broadly to /api but the project has very
// few endpoints under /api today, so we also expose it for any future use.
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success:false, message:"Too many requests. Please slow down." }
});
app.use('/api', apiLimiter);

// SECURITY: File upload restrictions — limit size and allowed file types
const ALLOWED_MIME_TYPES = new Set([
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "text/plain", "text/csv"
]);
const upload = multer({
    dest: "uploads/",
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
    fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("File type not allowed: " + file.mimetype), false);
        }
    }
});

// ================= MAIL =================

const transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

transporter.verify((error)=>{
    if(error){ console.log(error); }
    else{ console.log("Email Server Ready"); }
});

async function runActivityMailer(){
    try{
        const students = await Student.find();
        const now = new Date();
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const fourteenDaysAgo = new Date(now);
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
        for(const student of students){
            try{
                const email = student.email;
                if(!email) continue;
                const lastActive = student.lastActiveDate ? new Date(student.lastActiveDate) : null;
                const studentName = (student.name || ((student.firstName||"") + " " + (student.lastName||"")).trim()).trim();
                const employeeId = student.employeeId || "";
                if(lastActive && lastActive >= sevenDaysAgo){
                    let mailStatus = "sent";
                    let mailError = "";
                    try {
                        await transporter.sendMail({
                            from: '"TEN HR Department" <hr@entrepreneurshipnetwork.net>',
                            to: email,
                            subject: "Keep it up! You're doing great 🌟",
                            html: `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6">Hi ${studentName||"Intern"},<br><br>Great work staying active this week. Keep it up!<br><br>— TEN HR Team</div>`
                        });
                    } catch (err) {
                        mailStatus = "failed";
                        mailError = err && err.message ? String(err.message) : "";
                    } finally {
                        try {
                            await MailHistory.create({
                                recipientEmail: email,
                                recipientName: studentName || "Intern",
                                studentId: student._id,
                                subject: "Keep it up! You're doing great 🌟",
                                mailType: "active-appreciation",
                                sentAt: new Date(),
                                status: mailStatus,
                                errorMessage: mailError
                            });
                        } catch (_) {}
                    }
                    await AutoMailLog.create({ studentName, studentEmail: email, employeeId, mailType: "active-appreciation" });
                } else if(!lastActive || lastActive < fourteenDaysAgo){
                    let mailStatus = "sent";
                    let mailError = "";
                    try {
                        await transporter.sendMail({
                            from: '"TEN HR Department" <hr@entrepreneurshipnetwork.net>',
                            to: email,
                            subject: "We miss you! Come back and keep growing 💪",
                            html: `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6">Hi ${studentName||"Intern"},<br><br>We noticed you haven’t been active recently. Jump back in whenever you’re ready — we’re here to help you keep growing.<br><br>— TEN HR Team</div>`
                        });
                    } catch (err) {
                        mailStatus = "failed";
                        mailError = err && err.message ? String(err.message) : "";
                    } finally {
                        try {
                            await MailHistory.create({
                                recipientEmail: email,
                                recipientName: studentName || "Intern",
                                studentId: student._id,
                                subject: "We miss you! Come back and keep growing 💪",
                                mailType: "inactive-reengagement",
                                sentAt: new Date(),
                                status: mailStatus,
                                errorMessage: mailError
                            });
                        } catch (_) {}
                    }
                    await AutoMailLog.create({ studentName, studentEmail: email, employeeId, mailType: "inactive-reengagement" });
                }
            }catch(error){
                console.log(error);
            }
        }
    }catch(error){
        console.log(error);
    }
}
cron.schedule('0 9 * * 1', runActivityMailer);

// ======= AUTO DOCUMENT EMAIL HELPERS =======
function tenureToDays(tenure) {
    if (!tenure) return 30;
    const t = tenure.toLowerCase();
    if (t.includes("45")) return 45;
    if (t.includes("6"))  return 180;
    if (t.includes("3"))  return 90;
    return 30;
}

function getInternshipEndDate(joiningDate, tenure) {
    if (!joiningDate) return null;
    const start = new Date(joiningDate);
    if (isNaN(start.getTime())) return null;
    const end = new Date(start);
    end.setDate(end.getDate() + tenureToDays(tenure));
    return end;
}

async function sendAutoDocumentsToStudent(student, docType) {
    try {
        const name       = student.name || ((student.firstName||'') + ' ' + (student.lastName||'')).trim();
        const empId      = student.employeeId || '—';
        const domain     = student.domain || '—';
        const college    = student.collegeName || student.college || '—';
        const email      = student.email;
        const tenure     = student.tenure || '1 Month';
        const joining    = student.joiningDate ? new Date(student.joiningDate).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'}) : '—';
        const endDate    = getInternshipEndDate(student.joiningDate, student.tenure);
        const endStr     = endDate ? endDate.toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'}) : '—';
        const issuedDate = new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'});
        const docKeyMap = { offer: "offer_letter", loc: "loc", lor: "lor", star: "star", all: "internship_documents" };
        const uniqueDocId = normalizeDocumentNumber(generateDocumentNumber(docKeyMap[docType] || "doc"));
        const verifyUrl   = BASE_URL + '/verify-document?id=' + uniqueDocId;

        const docTypeLabels = { offer:'Offer Letter', loc:'Letter of Completion', lor:'Letter of Recommendation', star:'Star Performer Certificate', all:'Internship Documents' };
        const docTypeLabel  = docTypeLabels[docType] || 'Internship Documents';

        await Student.findByIdAndUpdate(student._id, {
            documentsAutoSent:   true,
            documentsAutoSentAt: new Date(),
            autoDocUniqueId:     uniqueDocId,
            documentVerified:    true,
            documentVerifiedAt:  new Date(),
            documentNumber:      uniqueDocId
        });

        const emailHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
            body{font-family:'Times New Roman',serif;background:#f5f5f5;margin:0;padding:20px}
            .wrap{max-width:680px;margin:0 auto;background:#fff;border:2px solid #D4AF37;border-radius:8px;overflow:hidden}
            .hdr{background:linear-gradient(135deg,#1a1a2e,#0f3460);padding:32px;text-align:center}
            .hdr .inf{font-size:48px;color:#D4AF37}.hdr h1{color:#D4AF37;font-size:18px;letter-spacing:3px;text-transform:uppercase;margin:8px 0 4px}
            .hdr p{color:#a08040;font-size:12px;margin:0}.bd{padding:32px 36px}
            .bd h2{color:#1a1a2e;font-size:22px;margin-bottom:8px}.bd p{font-size:14px;line-height:1.8;color:#333}
            .dc{background:#fffbf0;border:1px solid #D4AF37;border-radius:8px;padding:18px 22px;margin:16px 0}
            .dc h3{color:#b8860b;font-size:15px;margin:0 0 6px}.dc p{margin:0;font-size:13px;color:#555}
            .vb{background:#f0f8ff;border:1px solid #4a90d9;border-radius:8px;padding:16px 20px;margin:20px 0;text-align:center}
            .vb p{font-size:13px;color:#333;margin:0 0 8px}.vb a{color:#1a5fb4;font-weight:700;word-break:break-all}
            .did{font-family:'Courier New',monospace;font-size:13px;background:#f5f5f5;border:1px solid #ddd;border-radius:4px;padding:6px 12px;display:inline-block;color:#333;margin:8px 0}
            .ft{background:#1a1a2e;padding:20px;text-align:center}.ft p{color:#a08040;font-size:11px;margin:0}
            table.inf{width:100%;border-collapse:collapse;margin:16px 0;font-size:13px}
            table.inf td{padding:7px 10px;border-bottom:1px solid #f0e8d0}
            table.inf td:first-child{font-weight:700;color:#b8860b;width:40%}
        </style></head><body>
        <div class="wrap">
          <div class="hdr"><div class="inf">∞</div><h1>The Entrepreneurship Network</h1><p>Internship Completion — Official Documents</p></div>
          <div class="bd">
            <h2>Dear ${name},</h2>
            <p>Congratulations on completing your internship with <strong>The Entrepreneurship Network</strong>! Your internship period of <strong>${tenure}</strong> has now concluded.</p>
            <table class="inf">
              <tr><td>Employee ID</td><td>${empId}</td></tr>
              <tr><td>Domain</td><td>${domain}</td></tr>
              <tr><td>College / University</td><td>${college}</td></tr>
              <tr><td>Internship Period</td><td>${joining} — ${endStr}</td></tr>
              <tr><td>Duration</td><td>${tenure}</td></tr>
              <tr><td>Date of Issue</td><td>${issuedDate}</td></tr>
            </table>
            <div class="dc"><h3>📄 Offer Letter</h3><p>Your official internship offer letter from The Entrepreneurship Network.</p></div>
            <div class="dc"><h3>🎓 Letter of Completion (LOC)</h3><p>Certifies successful completion of your ${domain} internship tenure.</p></div>
            <div class="dc"><h3>📝 Letter of Recommendation (LOR)</h3><p>Official recommendation letter from the Director, The Entrepreneurship Network.</p></div>
            <div class="vb">
              <p><strong>🔐 Document Verification</strong></p>
              <p>Your unique Document ID:</p>
              <div class="did">${uniqueDocId}</div>
              <p>Verify authenticity at:</p>
              <a href="${verifyUrl}">${verifyUrl}</a>
            </div>
            <p>Log in to your student portal at <a href="${BASE_URL}">${BASE_URL}</a> to download your full PDF documents.</p>
            <p>For queries: <a href="mailto:hr@entrepreneurshipnetwork.net">hr@entrepreneurshipnetwork.net</a></p>
            <p>Best Regards,<br><strong>HR Department</strong><br>The Entrepreneurship Network</p>
          </div>
          <div class="ft"><p>© The Entrepreneurship Network — Limitless Technologies LLP</p><p style="margin-top:4px">Document ID: ${uniqueDocId}</p></div>
        </div></body></html>`;

        let mailStatus = "sent";
        let mailError = "";
        try {
            await transporter.sendMail({
                from:    '"TEN HR Department" <hr@entrepreneurshipnetwork.net>',
                to:      email,
                subject: `🎓 Your TEN ${docTypeLabel} — ${name} (${empId})`,
                html:    emailHtml
            });
        } catch (err) {
            mailStatus = "failed";
            mailError = err && err.message ? String(err.message) : "";
        }

        await DocumentHistory.create({
            studentId:      student._id,
            studentName:    name,
            studentEmail:   email,
            employeeId:     empId,
            college:        college,
            domain:         domain,
            documentType:   docTypeLabel,
            documentKey:    docKeyMap[docType] || "internship_documents",
            documentNumber: uniqueDocId,
            sentBy:         'HR System',
            sentToEmail:    email,
            sentAt:         new Date()
        });

        try {
            await MailHistory.create({
                recipientEmail: email,
                recipientName: name,
                studentId: student._id,
                subject: `🎓 Your TEN ${docTypeLabel} — ${name} (${empId})`,
                mailType: docKeyMap[docType] || "internship_documents",
                sentAt: new Date(),
                status: mailStatus,
                errorMessage: mailError
            });
        } catch (_) {}
        console.log('[AUTO-DOCS] Emailed to ' + email + ' | ID: ' + uniqueDocId);
    } catch(err) {
        console.error('[AUTO-DOCS] Error:', err.message);
    }
}

async function runAutoDocumentCheck() {
    try {
        const students = await Student.find({ documentsAutoSent: { $ne: true } });
        const now = new Date();
        let count = 0;
        for (const student of students) {
            if (!student.joiningDate || !student.tenure || !student.email) continue;
            const endDate = getInternshipEndDate(student.joiningDate, student.tenure);
            if (endDate && now >= endDate) {
                await sendAutoDocumentsToStudent(student, 'all');
                count++;
                await new Promise(r => setTimeout(r, 2000));
            }
        }
        if (count > 0) console.log('[AUTO-DOCS] Sent to ' + count + ' students.');
    } catch(err) {
        console.error('[AUTO-DOCS] Scheduler error:', err.message);
    }
}
setTimeout(runAutoDocumentCheck, 30000);
setInterval(runAutoDocumentCheck, 6 * 60 * 60 * 1000);
// ======= END AUTO DOCUMENT EMAIL =======

// ================= MONGODB =================

mongoose.connect(
    process.env.MONGODB_URI ||
    "mongodb://nagbishal07_db_user:_DXMzR6bkF!7Bc9@ac-kbv0ma9-shard-00-00.dtg7de6.mongodb.net:27017,ac-kbv0ma9-shard-00-01.dtg7de6.mongodb.net:27017,ac-kbv0ma9-shard-00-02.dtg7de6.mongodb.net:27017/?ssl=true&replicaSet=atlas-ekamxn-shard-0&authSource=admin&appName=Cluster0"
)
.then(()=>console.log("MongoDB Connected"))
.catch((err)=>console.log("MongoDB error:", err.message));

// ================= SCHEMAS =================

const submissionSchema = new mongoose.Schema({
    employeeId: String,
    domain: String,
    task: String,
    githubLink: String,
    note: String,
    image: String,
    pdf: String,
    feedback: { type: String, default: "No Feedback Yet" },
    status: { type: String, default: "Pending" },
    reviewedOnce: { type: Boolean, default: false },
    attendanceAllowed: { type: Boolean, default: false },
    attendanceGiven: { type: Boolean, default: false },
    attendanceCount: { type: Number, default: 0 },
    internshipDuration: { type: String, default: "1 Month" },
    monthlyAttendance: {
        month1: { type: Number, default: 0 },
        month2: { type: Number, default: 0 },
        month3: { type: Number, default: 0 },
        month4: { type: Number, default: 0 },
        month5: { type: Number, default: 0 },
        month6: { type: Number, default: 0 }
    },
    meetingsJoined: { type: Number, default: 0 },
    tasksCompleted: { type: Number, default: 0 },
    performance: { type: String, default: "B" },
    submittedAt: { type: Date, default: Date.now },
    // F8 — task deadline tracking. The deadline itself lives on CoordinatorTask
    // (one per domain); isOverdue is a per-submission flag the cron flips when
    // the deadline elapses without an Approved review.
    isOverdue: { type: Boolean, default: false }
});

const Submission = mongoose.model("Submission", submissionSchema);

function getStudentCollege(student){
    return (student && (student.collegeName || student.college) || "").trim();
}

function collegeDisplay(student){
    return getStudentCollege(student) || "Not Provided";
}

async function attachStudentDetailsToSubmissions(submissions){
    const ids = [...new Set(submissions.map(s => s.employeeId).filter(Boolean))];
    const students = ids.length ? await Student.find({ employeeId: { $in: ids } }) : [];
    const byEmp = new Map(students.map(s => [s.employeeId, s]));
    return submissions.map(sub => {
        const obj = sub.toObject ? sub.toObject() : sub;
        const student = byEmp.get(obj.employeeId);
        return {
            ...obj,
            studentName: student ? (student.name || `${student.firstName || ""} ${student.lastName || ""}`).trim() : (obj.studentName || ""),
            collegeName: student ? collegeDisplay(student) : "Not Provided",
            college: student ? collegeDisplay(student) : "Not Provided"
        };
    });
}

// ================= TEST SCHEMAS =================

const testQuestionSchema = new mongoose.Schema({
    domain: { type: String, required: true },
    question: { type: String, required: true },
    options: [String],
    correctAnswer: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now }
});

const TestQuestion = mongoose.model("TestQuestion", testQuestionSchema);

const testResultSchema = new mongoose.Schema({
    employeeId: { type: String, required: true },
    studentName: { type: String, required: true },
    domain: { type: String, required: true },
    score: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    submittedAt: { type: Date, default: Date.now }
});

const TestResult = mongoose.model("TestResult", testResultSchema);

// ================= ROUTES =================

app.get("/dashboard", (req,res)=>{ res.sendFile(path.join(__dirname,"public","dashboard.html")); });
app.get("/groups", (req,res)=>{ res.sendFile(path.join(__dirname,"public","groups.html")); });
app.get("/edit.html", (req,res)=>{ res.sendFile(path.join(__dirname,"public","edit.html")); });
app.get("/hr-portal", (req,res)=>{ res.sendFile(path.join(__dirname,"public","hr-portal.html")); });
app.get("/hr-login", (req,res)=>{ res.sendFile(path.join(__dirname,"public","hr-login.html")); });

// ── Page routes (GET) ──────────────────────────────────────────────────────
app.get("/login",    (req,res)=>{ res.sendFile(path.join(__dirname,"public","login.html")); });
app.get("/register", (req,res)=>{ res.sendFile(path.join(__dirname,"public","register.html")); });
app.get("/hr/dashboard", (req,res)=>{ res.sendFile(path.join(__dirname,"public","hr-portal.html")); });
app.get("/my-internships", (req,res)=>{ res.sendFile(path.join(__dirname,"public","my-internships.html")); });
app.get("/talent-network", (req,res)=>{ res.sendFile(path.join(__dirname,"public","talent-network.html")); });
app.get("/programs", (req,res)=>{ res.sendFile(path.join(__dirname,"public","programs.html")); });
app.get("/founder/directory", (req,res)=>{ res.sendFile(path.join(__dirname,"public","founder-directory.html")); });
app.get("/mentor/directory",  (req,res)=>{ res.sendFile(path.join(__dirname,"public","mentor-directory.html")); });
app.get("/investor/directory",(req,res)=>{ res.sendFile(path.join(__dirname,"public","investor-directory.html")); });
app.get("/founder-os",        (req,res)=>{ res.sendFile(path.join(__dirname,"public","founder-os.html")); });
app.get("/payment",           (req,res)=>{ res.sendFile(path.join(__dirname,"public","payment.html")); });
app.get("/payment.html",      (req,res)=>{ res.sendFile(path.join(__dirname,"public","payment.html")); });
app.get("/payment/success",   (req,res)=>{ res.sendFile(path.join(__dirname,"public","payment-success.html")); });

// ── Public payment config (safe — no secrets) ─────────────────────────────
app.get("/api/payment/config", (req, res) => {
    res.json({
        upiId:   process.env.UPI_ID   || "paytmqr5k0ods@ptys",
        upiName: process.env.UPI_NAME || "TEN Entrepreneurship Network",
        currency: "INR"
    });
});

// ── Verify UTR and auto-approve certificate ────────────────────────────────
app.post("/api/payment/verify-utr", async (req, res) => {
    try {
        const { utr, certType, empId, orderId } = req.body;
        if (!utr || !certType || !empId)
            return res.status(400).json({ success: false, message: "utr, certType and empId are required" });

        // Authentication: require x-employee-id header to match the empId being verified
        const headerEmpId = req.headers["x-employee-id"];
        if (!headerEmpId || String(headerEmpId) !== String(empId)) {
            return res.status(401).json({ success: false, message: "Authentication required. Please log in again." });
        }

        const student = await Student.findOne({ employeeId: String(empId) });
        if (!student) return res.status(404).json({ success: false, message: "Student not found" });

        const StudentCertificate = require("./models/new/StudentCertificate");

        // Security: require a matching pending cert record with the provided orderId
        if (!orderId) {
            return res.status(400).json({ success: false, message: "orderId is required" });
        }
        let certRecord = await StudentCertificate.findOne({ studentId: student._id, certificateType: certType, orderId: orderId });
        if (!certRecord) {
            return res.status(404).json({ success: false, message: "No pending payment found for this certificate. Please initiate the claim flow again." });
        }
        if (certRecord.paymentStatus === "paid") {
            return res.status(409).json({ success: false, message: "This certificate payment has already been verified." });
        }

        certRecord.paymentStatus = "paid";
        certRecord.paymentTxnId  = String(utr).trim();
        certRecord.paymentPaidAt = new Date();
        await certRecord.save();

        console.log(`[Payment] UTR verified & cert unlocked: ${certType} for ${empId}, UTR: ${utr}`);
        res.json({ success: true, message: "Payment verified! Your certificate is now ready to download.", certType, empId });
    } catch (err) {
        console.error("[Payment] verify-utr error:", err.message);
        res.status(500).json({ success: false, message: "Error verifying payment. Please try again later." });
        res.status(500).json({ success: false, message: "Error verifying payment" });
    }
});

// ── PaymentSetu — Create Order ────────────────────────────────────────────
app.post("/api/payment/create-order", async (req, res) => {
    try {
        const { certType, employeeId } = req.body;
        if (!certType || !employeeId) return res.status(400).json({ success: false, message: "certType and employeeId required" });

        const CERT_PRICES = { expert: 10000, nano_degree: 100000, fellowship: 250000 }; // paise
        const price = CERT_PRICES[certType];
        if (!price) return res.status(400).json({ success: false, message: "Invalid certificate type" });

        const student = await Student.findOne({ employeeId: String(employeeId) });
        if (!student) return res.status(404).json({ success: false, message: "Student not found" });

        const orderId = `CERT_${student._id}_${certType}_${Date.now()}`;
        const redirectUrl = (process.env.BASE_URL || `https://${req.headers.host}`) + "/payment/success?orderId=" + orderId + "&certType=" + certType + "&empId=" + employeeId;

        const axios = require("axios");
        const response = await axios.post("https://paymentsetu.com/api/create_order", {
            order_id:        orderId,
            amount:          price,
            redirect_url:    redirectUrl,
            customer_name:   student.name || `${student.firstName || ""} ${student.lastName || ""}`.trim(),
            customer_email:  student.email || "",
            customer_mobile: student.whatsapp || "",
            remarks:         `TEN ${certType} certificate — ${student.employeeId}`
        }, {
            headers: { "Authorization": `Bearer ${process.env.PAYMENTSETU_API_KEY}`, "Content-Type": "application/json" }
        });

        if (!response.data.status) {
            return res.status(500).json({ success: false, message: response.data.msg || "Payment order creation failed" });
        }

        res.json({ success: true, paymentUrl: response.data.payment_url, orderId });
    } catch (err) {
        console.error("[PaymentSetu] create-order error:", err.message);
        res.status(500).json({ success: false, message: "Payment service error. Please try again later." });
    }
});

// ── PaymentSetu — Webhook (auto-approve on success) ──────────────────────
app.post("/api/payment/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    try {
        const signature = req.headers["x-paymentsetu-signature"] || "";
        const timestamp = req.headers["x-paymentsetu-timestamp"] || "";
        const rawBody   = req.body ? req.body.toString() : "";

        const expected = crypto.createHmac("sha256", process.env.PAYMENTSETU_API_KEY || "")
            .update(timestamp + "." + rawBody)
            .digest("hex");

        const sigBuf = Buffer.from(signature);
        const expBuf = Buffer.from(expected);
        if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(expBuf, sigBuf)) {
            return res.status(401).json({ error: "Invalid signature" });
        }

        const payload = JSON.parse(rawBody);
        if (payload.status !== "success") return res.status(200).json({ received: true });

        const orderId = payload.order_id || "";
        const parts   = orderId.split("_");
        if (parts.length >= 4 && parts[0] === "CERT") {
            // Format: CERT_<studentId>_<certType>_<timestamp>
            // certType may contain underscores (e.g. "nano_degree"), so rejoin middle parts
            const studentIdHex = parts[1];
            const certType     = parts.slice(2, -1).join("_");
            const StudentCertificate = require("./models/new/StudentCertificate");
            let certRecord = await StudentCertificate.findOne({ studentId: studentIdHex, certificateType: certType });
            if (!certRecord) {
                certRecord = new StudentCertificate({ studentId: studentIdHex, certificateType: certType, paymentStatus: "pending" });
            }
            certRecord.paymentStatus = "paid";
            certRecord.paymentTxnId  = payload.txn_utr || "";
            certRecord.paymentPaidAt = new Date(payload.txn_time || Date.now());
            await certRecord.save();
            console.log(`[PaymentSetu] Payment verified & cert unlocked: ${orderId}`);
        }

        res.status(200).json({ received: true });
    } catch (err) {
        console.error("[PaymentSetu] webhook error:", err.message);
        res.status(500).json({ error: "Webhook processing failed" });
    }
});

// ================= EMPLOYEE ID =================

async function generateEmployeeId(domain){
    const domainShortCodes = {
        "DevOps with AWS":          "DEVOPS",
        "Python Development":       "PY",
        "Java Development":         "JAVA",
        "Web Development":          "WEB",
        "MERN Stack Development":   "MERN",
        "Artificial Intelligence":  "AI",
        "Data Science":             "DS",
        "Cyber Security":           "CYBER",
        "Software Engineering":     "SDE",
        "Flutter Development":      "FLUTTER",
        "HR Management":            "HRMGMT",
        "Venture Capital":           "VC",
        "Vibe Coding":               "VIBE",
        "Space Research":            "SPACE",
        "Business Analyst":          "BA",
        "HR":                        "HR"
    };
    const shortCode = domainShortCodes[domain] || domain.toUpperCase();
    const totalStudents = await Student.countDocuments();
    const sequenceNumber = 1001 + totalStudents;
    return `TEN/${shortCode}/${sequenceNumber}`;
}

// ================= REGISTER (Feature 1: welcome email + multi-domain) =================
// A student can register for UP TO 2 domains using the same email + phone.
// The two domains MUST be different. Same domain twice -> blocked.
// On the FIRST domain registration we send a welcome email; on the second
// domain we link the two Student docs via linkedDomains and skip the email.

function welcomeEmailHtml({ name, employeeId, domain, email, password, joinedOn, host }){
    const safe = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
    const loginUrl = (host ? host.replace(/\/$/, "") : "") + "/login.html";
    return `<!doctype html><html><body style="margin:0;background:#0c1220;font-family:Segoe UI,Arial,sans-serif;color:#f0eee8;">
<table width="100%" cellspacing="0" cellpadding="0" style="background:#0c1220;padding:32px 0;"><tr><td align="center">
  <table width="600" cellspacing="0" cellpadding="0" style="background:#0e1628;border:1px solid rgba(245,197,66,0.18);border-radius:18px;overflow:hidden;">
    <tr><td style="background:linear-gradient(135deg,#1a1208,#3a2a08);padding:28px 32px;text-align:center;">
      <div style="font-size:13px;letter-spacing:6px;color:#f5c542;font-weight:700;">THE ENTREPRENEURSHIP NETWORK</div>
      <div style="font-size:24px;color:#fff7d6;font-weight:800;margin-top:8px;">🎉 Welcome, ${safe(name)}!</div>
    </td></tr>
    <tr><td style="padding:28px 34px;">
      <p style="font-size:15px;line-height:1.55;margin:0 0 16px;">Dear <b>${safe(name)}</b>,</p>
      <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">
        We are thrilled to welcome you to <b style="color:#f5c542;">The Entrepreneurship Network</b> as an intern.
        Your journey to build real-world skills starts today!
      </p>
      <table width="100%" cellspacing="0" cellpadding="0" style="background:#0c1220;border:1px solid rgba(245,197,66,0.15);border-radius:12px;margin:18px 0;">
        <tr><td style="padding:18px 22px;">
          <div style="color:#f5c542;font-size:11px;letter-spacing:2px;font-weight:700;">YOUR DETAILS</div>
          <div style="margin-top:10px;font-size:14px;line-height:1.85;">
            <b>Name:</b> ${safe(name)}<br>
            <b>Employee ID:</b> <span style="color:#f5c542;">${safe(employeeId)}</span><br>
            <b>Domain:</b> ${safe(domain)}<br>
            <b>Role:</b> Intern<br>
            <b>Joined On:</b> ${safe(joinedOn)}
          </div>
        </td></tr>
      </table>
      <table width="100%" cellspacing="0" cellpadding="0" style="background:rgba(245,197,66,0.06);border:1px dashed rgba(245,197,66,0.35);border-radius:12px;">
        <tr><td style="padding:18px 22px;">
          <div style="color:#f5c542;font-size:11px;letter-spacing:2px;font-weight:700;">YOUR LOGIN CREDENTIALS</div>
          <div style="margin-top:10px;font-size:14px;line-height:1.85;">
            <b>Email:</b> ${safe(email)}<br>
            <b>Employee ID:</b> <code style="background:#0c1220;padding:3px 8px;border-radius:6px;color:#f5c542;font-family:Consolas,monospace;">${safe(employeeId)}</code><br>
            <b>Password:</b> <code style="background:#0c1220;padding:3px 8px;border-radius:6px;color:#f5c542;font-family:Consolas,monospace;letter-spacing:1px;">${safe(password)}</code><br>
            <b>Login URL:</b> <a href="${safe(loginUrl)}" style="color:#f5c542;">${safe(loginUrl)}</a>
          </div>
          <p style="margin:14px 0 0;font-size:12px;color:#cdb24a;">
            🔒 Keep these credentials safe. Do not share with anyone.
          </p>
        </td></tr>
      </table>
      <p style="font-size:14px;line-height:1.7;margin:20px 0 8px;">
        <b>What to do next:</b>
      </p>
      <ol style="font-size:14px;line-height:1.7;color:#cdd9ec;margin:0 0 16px 22px;padding:0;">
        <li>Login at the portal using the credentials above.</li>
        <li>Mark your attendance every day.</li>
        <li>Submit your daily tasks to your coordinator.</li>
        <li>Reach <b>75%</b> attendance to qualify for certificates.</li>
        <li>Get certified and share on LinkedIn!</li>
      </ol>
      <p style="font-size:14px;margin:24px 0 4px;">Warm regards,</p>
      <p style="font-size:14px;margin:0;"><b>HR Team</b><br/>The Entrepreneurship Network<br/>
        <a href="mailto:ten.hr.contact@gmail.com" style="color:#f5c542;">ten.hr.contact@gmail.com</a>
      </p>
    </td></tr>
    <tr><td style="background:#080d1a;padding:14px 22px;text-align:center;font-size:11px;color:#6a6255;letter-spacing:1px;">
      © The Entrepreneurship Network · Limitless Technologies LLP
    </td></tr>
  </table>
</td></tr></table></body></html>`;
}

app.post("/register", registerLimiter, async(req,res)=>{
try{
    const { firstName, lastName, domain, whatsapp, email, tenure, joiningDate } = req.body;
    const collegeName = String(req.body.collegeName || req.body.college || "").trim();
    if(!email || !domain){
        return res.json({ success:false, message:"Email and domain are required" });
    }
    const emailLc = String(email).trim().toLowerCase();

    // Find every existing Student doc with this email (across any domain).
    const existingByEmail = await Student.find({ email: emailLc });

    // Same domain twice → blocked.
    const sameDomainHit = existingByEmail.find(s => (s.domain||"") === domain);
    if(sameDomainHit){
        return res.json({ success:false, alreadyInDomain:true,
            message:"You are already registered in this domain",
            employeeId: sameDomainHit.employeeId });
    }

    // 2 domains is the maximum.
    if(existingByEmail.length >= 2){
        return res.json({ success:false,
            message:"This email is already registered in 2 domains (the maximum allowed)." });
    }

    const isFirstRegistration = existingByEmail.length === 0;

    const employeeId = await generateEmployeeId(domain);
    // Auto-generated password (we kept the original behavior — register form
    // has no password field). For multi-domain registrations we re-use the
    // existing student's password so the user has one password across both.
    const password = isFirstRegistration
        ? crypto.randomBytes(4).toString("hex")
        : (existingByEmail[0].password || crypto.randomBytes(4).toString("hex"));

    const newStudent = new Student({
        firstName, lastName,
        name: (firstName||"") + " " + (lastName||""),
        domain, whatsapp, email: emailLc,
        collegeName,
        college: collegeName,
        tenure, joiningDate,
        employeeId, password,
        collegeName: collegeName || ""
    });
    await newStudent.save();

    // Maintain linkedDomains on every (now ≤ 2) student doc with this email.
    const allForEmail = [...existingByEmail, newStudent];
    const linked = allForEmail.map(s => ({
        domain: s.domain, studentId: s._id, employeeId: s.employeeId
    }));
    await Promise.all(allForEmail.map(s => Student.findByIdAndUpdate(s._id, { linkedDomains: linked })));

    // Email — only on the FIRST domain registration.
    if(isFirstRegistration){
        try{
            const host = (req.headers["x-forwarded-proto"] || req.protocol) + "://" + req.get("host");
            const joinedOn = new Date().toLocaleDateString("en-IN", { day:"numeric", month:"long", year:"numeric" });
            const html = welcomeEmailHtml({
                name: newStudent.name.trim(), employeeId, domain, email: emailLc, password,
                joinedOn, host
            });
            let mailStatus = "sent";
            let mailError = "";
            try {
                await transporter.sendMail({
                    from:"TEN Internship Portal <ten.internshipportal@gmail.com>",
                    to: emailLc,
                    subject:`🎉 Welcome to The Entrepreneurship Network, ${newStudent.name.trim()}!`,
                    html,
                    text: `Hello ${firstName||""}, your Internship Registration is Successful.\n\nEmployee ID: ${employeeId}\nPassword: ${password}\nDomain: ${domain}\n\nLogin: ${host || ""}/login.html`
                });
            } catch (err) {
                mailStatus = "failed";
                mailError = err && err.message ? String(err.message) : "";
            } finally {
                try {
                    await MailHistory.create({
                        recipientEmail: emailLc,
                        recipientName: newStudent.name.trim(),
                        studentId: newStudent._id,
                        subject: `🎉 Welcome to The Entrepreneurship Network, ${newStudent.name.trim()}!`,
                        mailType: "welcome",
                        sentAt: new Date(),
                        status: mailStatus,
                        errorMessage: mailError
                    });
                } catch (_) {}
            }
        }catch(mailError){ console.log("MAIL ERROR:", mailError && mailError.message); }
    }

    res.json({ success:true, employeeId, secondDomain: !isFirstRegistration });

}catch(error){ console.log(error); res.status(500).json({ success:false, message:"Server Error" }); }
});

// ================= LOGIN =================

app.post("/login", loginLimiter, async(req,res)=>{
try{
    const { employeeId, password } = req.body;
    const student = await Student.findOne({ employeeId, password });
    if(!student){ return res.json({ success:false, message:"Invalid Employee ID or Password" }); }
    await Student.findOneAndUpdate({ employeeId }, { lastActiveDate: new Date() });
    res.json({ success:true, student });
}catch(error){ res.status(500).json({ success:false, message:"Server Error" }); }
});

// ================= SUBMIT TASK =================

app.post("/submit-task", upload.fields([
    { name:"image", maxCount:1 },
    { name:"pdf", maxCount:1 }
]), async(req,res)=>{
try{
    const { employeeId, domain, githubLink, note, task } = req.body;
    const image = req.files["image"] ? "/" + req.files["image"][0].path : "";
    const pdf   = req.files["pdf"]   ? "/" + req.files["pdf"][0].path   : "";

    const student = await Student.findOne({ employeeId });
    let internshipDuration = "1 Month";
    if(student && student.tenure){
        const t = student.tenure.toLowerCase();
        if(t.includes("6")){ internshipDuration = "6 Months"; }
        else if(t.includes("3")){ internshipDuration = "3 Months"; }
        else if(t.includes("45")){ internshipDuration = "45 Days"; }
        else { internshipDuration = "1 Month"; }
    }

    const submission = new Submission({
        employeeId, domain,
        task: task || "",
        githubLink, note,
        image, pdf,
        status: "Pending",
        reviewedOnce: false,
        attendanceAllowed: false,
        attendanceGiven: false,
        attendanceCount: 0,
        internshipDuration,
        monthlyAttendance: { month1:0, month2:0, month3:0, month4:0, month5:0, month6:0 },
        tasksCompleted: 0,
        meetingsJoined: 0,
        performance: "B"
    });

    await submission.save();
    await Student.findOneAndUpdate({ employeeId }, { lastActiveDate: new Date() });
    // Milestones + badges (first-task)
    await setMilestone(employeeId, "firstTaskSubmitted");
    await recomputeBadgesFor(employeeId);
    res.json({ success:true, message:"Task Submitted Successfully" });
}catch(error){
    console.log(error);
    res.json({ success:false, message:"Submission Failed" });
}
});

// ================= STUDENT SUBMISSIONS =================

app.get("/student-submissions/:employeeId", async(req,res)=>{
try{
    const employeeId = decodeURIComponent(req.params.employeeId);
    const submissions = await Submission.find({ employeeId }).sort({ submittedAt:-1 });
    res.json({ success:true, submissions });
}catch(error){
    console.log(error);
    res.json({ success:false, submissions:[] });
}
});

// ================= COORDINATOR DOMAIN SUBMISSIONS =================

app.get("/all-submissions/:domain", async(req,res)=>{
try{
    const domain = decodeURIComponent(req.params.domain);
    const submissions = await Submission.find({ domain }).sort({ submittedAt:-1 });
    res.json(submissions);
}catch(error){
    console.log(error);
    res.json([]);
}
});

// ================= UPDATE STATUS =================

app.post("/update-status", async(req,res)=>{
try{
    const { id, status, feedback, coordinatorId } = req.body;
    if(!coordinatorId){
        return res.status(401).json({ success:false, message:"Coordinator authentication required" });
    }

    const existing = await Submission.findById(id);
    if(!existing){
        return res.json({ success:false, message:"Submission not found" });
    }
    if(existing.reviewedOnce){
        return res.json({ success:false, message:"Already reviewed. Cannot change decision.", alreadyReviewed:true });
    }

    let performance = "B";
    if(status === "Approved"){ performance = "A+"; }

    await Submission.findByIdAndUpdate(id, {
        status,
        feedback,
        reviewedOnce: true,
        attendanceAllowed: status === "Approved",
        performance,
        tasksCompleted: status === "Approved" ? 1 : 0
    }, { new:true });

    // Fire notification to the student
    const submission = await Submission.findById(id);
    if(submission){
        const notif = new Notification({
            title: `Task ${status}`,
            message: `Your task submission has been ${status.toLowerCase()}. Feedback: ${feedback || "No feedback provided"}`,
            type: status === "Approved" ? "success" : "warning",
            from: "Coordinator",
            targetType: "student",
            targetEmployeeId: submission.employeeId,
            targetDomain: submission.domain
        });
        await notif.save();
        // SSE broadcast to student
        broadcastNotification(submission.domain, submission.employeeId, notif);
    }

    // Milestones + badges (first-task-approved + eligibility) — non-blocking
    if(status === "Approved" && submission){
        await setMilestone(submission.employeeId, "firstTaskApproved");
    }
    if(submission){
        await checkCertificateEligibility(submission.employeeId);
        await recomputeBadgesFor(submission.employeeId);
    }

    res.json({ success:true, message:"Status Updated Successfully" });
}catch(error){
    console.log(error);
    res.json({ success:false });
}
});

// ================= ATTENDANCE =================

app.post("/give-attendance", async(req,res)=>{
try{
    const { employeeId } = req.body;
    const submission = await Submission.findOne({ employeeId }).sort({ submittedAt:-1 });

    if(!submission){ return res.json({ success:false, message:"Submit task first" }); }
    if(submission.status === "Pending"){ return res.json({ success:false, message:"Coordinator has not responded yet" }); }
    if(submission.status === "Rejected"){ return res.json({ success:false, message:"Your task was rejected. Please resubmit." }); }
    if(submission.attendanceGiven){ return res.json({ success:false, message:"Attendance already submitted for today" }); }

    submission.attendanceGiven = true;
    submission.attendanceCount += 1;
    submission.meetingsJoined += 1;

    const dur = submission.internshipDuration;
    const ma = submission.monthlyAttendance;

    if(dur === "1 Month"){
        ma.month1 = Math.min(ma.month1 + 1, 20);
    }
    else if(dur === "3 Months"){
        if(ma.month1 < 20){ ma.month1 += 1; }
        else if(ma.month2 < 20){ ma.month2 += 1; }
        else if(ma.month3 < 20){ ma.month3 += 1; }
    }
    else if(dur === "6 Months"){
        if(ma.month1 < 20){ ma.month1 += 1; }
        else if(ma.month2 < 20){ ma.month2 += 1; }
        else if(ma.month3 < 20){ ma.month3 += 1; }
        else if(ma.month4 < 20){ ma.month4 += 1; }
        else if(ma.month5 < 20){ ma.month5 += 1; }
        else if(ma.month6 < 20){ ma.month6 += 1; }
    }

    submission.monthlyAttendance = ma;
    await submission.save();
    await Student.findOneAndUpdate({ employeeId }, { lastActiveDate: new Date() });

    let totalDays = 20;
    let requiredDays = 15;
    if(dur === "3 Months"){ totalDays=60; requiredDays=45; }
    if(dur === "6 Months"){ totalDays=120; requiredDays=90; }

    const count = submission.attendanceCount;
    let thresholdMsg = "";
    if(count < requiredDays){
        thresholdMsg = `${requiredDays - count} more days needed to reach 75% attendance.`;
    } else {
        thresholdMsg = "✅ You have met the 75% attendance requirement!";
    }

    res.json({ success:true, message:"Attendance Submitted", thresholdMsg, attendanceCount: count });
}catch(error){
    console.log(error);
    res.json({ success:false, message:"Attendance Failed" });
}
});

// ================= SSE SYSTEM (Notifications + Notice) =================

// Map: key -> array of { res, employeeId, role }
// key for students: "student:employeeId"
// key for coordinators: "coord:domain"
// key for HR: "hr:all"
const sseClients = new Map();

function addSSEClient(key, res, meta = {}){
    if(!sseClients.has(key)) sseClients.set(key, []);
    sseClients.get(key).push({ res, ...meta });
}

function removeSSEClient(key, res){
    const arr = sseClients.get(key) || [];
    const idx = arr.findIndex(c => c.res === res);
    if(idx !== -1) arr.splice(idx, 1);
}

function sendSSE(res, data){
    try{ res.write(`data: ${JSON.stringify(data)}\n\n`); } catch(e){}
}

function broadcastNotification(domain, employeeId, notif){
    // to specific student
    if(employeeId){
        const key = `student:${employeeId}`;
        const clients = sseClients.get(key) || [];
        clients.forEach(c => sendSSE(c.res, { event:"notification", notification:notif }));
    }
    // to domain coordinator
    if(domain){
        const key = `coord:${domain}`;
        const clients = sseClients.get(key) || [];
        clients.forEach(c => sendSSE(c.res, { event:"notification", notification:notif }));
    }
}

// ================= STUDENT SSE =================

app.get("/student-events/:employeeId", (req,res)=>{
    const employeeId = decodeURIComponent(req.params.employeeId);
    res.setHeader("Content-Type","text/event-stream");
    res.setHeader("Cache-Control","no-cache");
    res.setHeader("Connection","keep-alive");
    res.flushHeaders();
    res.write("data: connected\n\n");

    const key = `student:${employeeId}`;
    addSSEClient(key, res);

    req.on("close",()=>{ removeSSEClient(key, res); });
});

// ================= COORDINATOR SSE =================

app.get("/coord-events/:domain", (req,res)=>{
    const domain = decodeURIComponent(req.params.domain);
    res.setHeader("Content-Type","text/event-stream");
    res.setHeader("Cache-Control","no-cache");
    res.setHeader("Connection","keep-alive");
    res.flushHeaders();
    res.write("data: connected\n\n");

    const key = `coord:${domain}`;
    addSSEClient(key, res, { domain });

    req.on("close",()=>{ removeSSEClient(key, res); });
});

// ================= NOTICE SSE (legacy kept for compat) =================

app.get("/notice-events/:domain", (req,res)=>{
    const domain = decodeURIComponent(req.params.domain);
    res.setHeader("Content-Type","text/event-stream");
    res.setHeader("Cache-Control","no-cache");
    res.setHeader("Connection","keep-alive");
    res.flushHeaders();
    res.write("data: connected\n\n");

    const key = `coord:${domain}`;
    addSSEClient(key, res, { domain });
    req.on("close",()=>{ removeSSEClient(key, res); });
});

// ================= UPDATE NOTICE =================

app.post("/update-notice", async(req,res)=>{
try{
    const { domain, morningMeeting, eveningMeeting, meetingLink, importantNotice } = req.body;

    await Notice.findOneAndUpdate(
        { domain },
        { domain, morningMeeting, eveningMeeting, meetingLink, importantNotice },
        { upsert:true, new:true }
    );

    // Broadcast SSE notice update to domain students
    const key = `coord:${domain}`;
    const clients = sseClients.get(key) || [];
    const payload = JSON.stringify({ event:"notice-updated", domain });
    clients.forEach(c => {
        try{ c.res.write(`data: ${payload}\n\n`); } catch(e){}
    });

    // Also notify students in this domain
    for(const [k, arr] of sseClients.entries()){
        if(k.startsWith("student:")){
            arr.forEach(c => {
                if(c.domain === domain){
                    try{ c.res.write(`data: ${JSON.stringify({ event:"notice-updated", domain })}\n\n`); } catch(e){}
                }
            });
        }
    }

    res.json({ success:true });
}catch(error){
    console.log(error);
    res.status(500).json({ success:false });
}
});

// ================= GET DOMAIN NOTICE =================

app.get("/get-notice/:domain", async(req,res)=>{
try{
    const notice = await Notice.findOne({ domain:req.params.domain });
    res.json(notice || {});
}catch(error){ res.json({ success:false }); }
});

// ================= NOTIFICATIONS - GET FOR STUDENT =================

app.get("/notifications/student/:employeeId", async(req,res)=>{
try{
    const { employeeId } = req.params;
    const student = await Student.findOne({ employeeId });
    const domain = student ? student.domain : "";
    
    const notifs = await Notification.find({
        $or: [
            { targetType: "all" },
            { targetType: "domain", targetDomain: domain },
            { targetType: "student", targetEmployeeId: employeeId }
        ]
    }).sort({ createdAt:-1 }).limit(50);
    
    // Mark unread count
    const unread = notifs.filter(n => !n.readBy.includes(employeeId)).length;
    
    res.json({ success:true, notifications:notifs, unread });
}catch(error){
    console.log(error);
    res.json({ success:false, notifications:[], unread:0 });
}
});

// ================= NOTIFICATIONS - GET FOR COORDINATOR =================

app.get("/notifications/coordinator/:domain", async(req,res)=>{
try{
    const domain = decodeURIComponent(req.params.domain);
    
    const notifs = await Notification.find({
        $or: [
            { targetType: "coordinator" },
            { targetType: "coordinator-domain", targetDomain: domain },
            // HR to all
            { targetType: "all", from: "HR" }
        ]
    }).sort({ createdAt:-1 }).limit(50);
    
    const unread = notifs.filter(n => !n.readBy.includes(`coord:${domain}`)).length;
    
    res.json({ success:true, notifications:notifs, unread });
}catch(error){
    console.log(error);
    res.json({ success:false, notifications:[], unread:0 });
}
});

// ================= NOTIFICATIONS - MARK READ =================

app.post("/notifications/mark-read", async(req,res)=>{
try{
    const { notifId, readerId } = req.body;
    await Notification.findByIdAndUpdate(notifId, {
        $addToSet: { readBy: readerId }
    });
    res.json({ success:true });
}catch(error){
    res.json({ success:false });
}
});

// ================= HR LOGIN =================
// Requirement 4: HR logs in by email + password.
// To not break existing hardcoded HR accounts, this route accepts EITHER an
// email (looked up in the HR DB collection, bcrypt-compared) OR a legacy
// username (looked up in HR_ACCOUNTS, plain compared).

app.post("/hr-login", loginLimiter, async(req,res)=>{
try{
    const password = (req.body && req.body.password) || "";
    // Accept "email" (preferred) or legacy "username" field from older clients
    const identifier = ((req.body && (req.body.email || req.body.username)) || "").trim();
    if(!identifier || !password){
        return res.json({ success:false, message:"Email and password required" });
    }

    // 1) Email path: DB-backed HR (created via promotion flow)
    if(identifier.indexOf("@") !== -1){
        const dbHR = await HR.findOne({ email: identifier.toLowerCase() });
        if(dbHR){
            const ok = await bcrypt.compare(password, dbHR.password);
            if(!ok) return res.json({ success:false, message:"Invalid HR credentials" });
            return res.json({ success:true, hr:{
                username: dbHR.username || dbHR.email,
                email:    dbHR.email,
                name:     dbHR.name,
                role:     "hr"
            }});
        }
        // Also allow legacy hardcoded entries that have an email assigned
        const legacy = Object.entries(HR_ACCOUNTS).find(
            ([_, v]) => (v.email || "").toLowerCase() === identifier.toLowerCase()
        );
        if(legacy){
            const [u, v] = legacy;
            if(v.password !== password) return res.json({ success:false, message:"Invalid HR credentials" });
            return res.json({ success:true, hr:{ username:u, email:v.email, name:v.name, role:"hr" } });
        }
        return res.json({ success:false, message:"Invalid HR credentials" });
    }

    // 2) Legacy username path
    const hr = HR_ACCOUNTS[identifier];
    if(!hr || hr.password !== password){
        return res.json({ success:false, message:"Invalid HR credentials" });
    }
    res.json({ success:true, hr:{ username: identifier, email: hr.email || "", name:hr.name, role:"hr" } });
}catch(error){
    console.log(error);
    res.json({ success:false, message:"Server Error" });
}
});

// ================= HR - SEND NOTIFICATION =================

app.post("/hr/send-notification", async(req,res)=>{
try{
    const { title, message, type, targetType, targetDomain, targetEmployeeId, targetUsername } = req.body;
    
    const notif = new Notification({
        title, message, type: type || "info",
        from: "HR",
        targetType: targetType || "all",
        targetDomain: targetDomain || "",
        targetEmployeeId: targetEmployeeId || "",
        targetUsername: targetUsername || ""
    });
    await notif.save();
    
    // SSE broadcast based on targetType
    if(targetType === "all"){
        // Broadcast to all students and coordinators
        for(const [key, arr] of sseClients.entries()){
            arr.forEach(c => sendSSE(c.res, { event:"notification", notification:notif }));
        }
    } else if(targetType === "domain"){
        // All students of a domain + coordinator of that domain
        for(const [key, arr] of sseClients.entries()){
            if(key === `coord:${targetDomain}`){
                arr.forEach(c => sendSSE(c.res, { event:"notification", notification:notif }));
            }
        }
        // Also need to notify students - broadcast to all SSE clients and they filter on client side
        for(const [key, arr] of sseClients.entries()){
            if(key.startsWith("student:")){
                arr.forEach(c => {
                    if(c.studentDomain === targetDomain){
                        sendSSE(c.res, { event:"notification", notification:notif });
                    }
                });
            }
        }
    } else if(targetType === "student"){
        const key = `student:${targetEmployeeId}`;
        const arr = sseClients.get(key) || [];
        arr.forEach(c => sendSSE(c.res, { event:"notification", notification:notif }));
    } else if(targetType === "coordinator"){
        // All coordinators
        for(const [key, arr] of sseClients.entries()){
            if(key.startsWith("coord:")){
                arr.forEach(c => sendSSE(c.res, { event:"notification", notification:notif }));
            }
        }
    } else if(targetType === "coordinator-domain"){
        const key = `coord:${targetDomain}`;
        const arr = sseClients.get(key) || [];
        arr.forEach(c => sendSSE(c.res, { event:"notification", notification:notif }));
    }
    
    res.json({ success:true, message:"Notification sent successfully" });
}catch(error){
    console.log(error);
    res.json({ success:false, message:"Failed to send notification" });
}
});

// ================= HR - GET ALL STUDENTS =================

app.get("/hr/students", async(req,res)=>{
try{
    const auth = req.headers.authorization;
    if(!auth || !auth.startsWith("Bearer hr_")){
        return res.status(401).json({ message:"Unauthorized" });
    }
    const students = await Student.find().sort({ createdAt:-1 });
    res.json({ success:true, students });
}catch(error){ res.status(500).json({ message:"Error fetching students" }); }
});

// ================= HR - SEND DOCUMENTS NOW =================

app.post('/hr/send-documents-now', async(req, res) => {
    try {
        const auth = req.headers.authorization;
        if(!auth || !auth.startsWith("Bearer hr_")){
            return res.status(401).json({ success:false, message:"Unauthorized" });
        }
        const { employeeId, docType } = req.body;
        if (!employeeId) return res.json({ success: false, message: 'employeeId required' });
        const student = await Student.findOne({ employeeId });
        if (!student)       return res.json({ success: false, message: 'Student not found' });
        if (!student.email) return res.json({ success: false, message: 'Student has no email' });
        student.documentsAutoSent = false;
        await student.save();
        await sendAutoDocumentsToStudent(student, docType || 'all');
        res.json({ success: true, message: 'Documents sent to ' + student.email });
    } catch(err) {
        console.error('[MANUAL-DOCS]', err);
        res.json({ success: false, message: err.message });
    }
});

app.get("/api/hr/document-history", async(req,res)=>{
try{
    const auth = req.headers.authorization;
    if(!auth || !auth.startsWith("Bearer hr_")){
        return res.status(401).json({ message:"Unauthorized" });
    }
    const page = Math.max(1, parseInt(req.query.page || "1", 10) || 1);
    const limit = 50;
    const skip = (page - 1) * limit;
    const total = await DocumentHistory.countDocuments();
    const records = await DocumentHistory.find().sort({ sentAt: -1 }).skip(skip).limit(limit).lean();
    const mapped = (records || []).map(r => {
        const studentName = (r.studentName || r.student_name || "").trim();
        const employeeId = (r.employeeId || r.employee_id || "").trim();
        const college = (r.college || "").trim() || "Not provided";
        const documentNumber = normalizeDocumentNumber(r.documentNumber || r.document_number || "");
        return {
            ...r,
            studentName: studentName || "—",
            employeeId: employeeId || "—",
            college: college || "Not provided",
            documentNumber: documentNumber || "—",
            sentAt: r.sentAt || r.sent_on || r.createdAt,
            student_name: studentName || "—",
            employee_id: employeeId || "—",
            document_number: documentNumber || "—",
            document_type: r.documentKey || r.documentType || ""
        };
    });
    res.json({ records: mapped, total, page });
}catch(error){
    console.log(error);
    res.status(500).json({ records:[], total:0, page:1 });
}
});

async function verifyByDocumentNumber(documentNumber) {
    if (!documentNumber) {
        return { verified: false, message: "Please enter a document number" };
    }
    const cleaned = normalizeDocumentNumber(documentNumber);
    let record = await DocumentHistory.findOne({ documentNumber: cleaned }).lean();
    if (!record) {
        record = await DocumentHistory.findOne({ documentNumber: { $regex: "^" + cleaned.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$", $options: "i" } }).lean();
    }
    if (!record) {
        return { verified: false, message: "Document not found. Check the number and try again." };
    }
    return {
        verified: true,
        document_number: record.documentNumber,
        student_name: record.studentName || "—",
        employee_id: record.employeeId || "—",
        document_type: record.documentType || record.documentKey || "—",
        domain: record.domain || "N/A",
        college: record.college || "N/A",
        issued_date: record.sentAt || record.createdAt,
        issued_by: "The Entrepreneurship Network (TEN)"
    };
}

app.post("/api/hr/verify-document", async (req, res) => {
    try {
        const auth = req.headers.authorization;
        if(!auth || !auth.startsWith("Bearer hr_")){
            return res.status(401).json({ message:"Unauthorized" });
        }
        const { documentNumber } = req.body || {};
        const out = await verifyByDocumentNumber(documentNumber);
        res.json(out);
    } catch (err) {
        res.status(500).json({ verified: false, message: "Server error during verification" });
    }
});

app.get("/api/hr/verify-check", async(req,res)=>{
try{
    const auth = req.headers.authorization;
    if(!auth || !auth.startsWith("Bearer hr_")){
        return res.status(401).json({ message:"Unauthorized" });
    }
    const { employeeId } = req.query;
    if (!employeeId) return res.status(400).json({ error: 'employeeId required' });
    const s = await Student.findOne({ employeeId }).select(
      'firstName lastName employeeId collegeName college documentVerified documentVerifiedAt documentNumber autoDocUniqueId domain'
    );
    if (!s) return res.json({ verified: false, message: 'Student not found' });
    res.json({
        verified: s.documentVerified || false,
        studentName: (s.firstName||'') + ' ' + (s.lastName||''),
        college:     s.collegeName || s.college || '—',
        documentType: 'Internship Documents',
        documentNumber: s.documentNumber || s.autoDocUniqueId || '—',
        verifiedAt:  s.documentVerifiedAt || null
    });
}catch(error){
    console.log(error);
    res.json({ verified: false, message: "Student not found" });
}
});

app.get("/api/hr/verify-by-docnumber", async(req,res)=>{
try{
    const auth = req.headers.authorization;
    if(!auth || !auth.startsWith("Bearer hr_")){
        return res.status(401).json({ message:"Unauthorized" });
    }
    const { documentNumber } = req.query;
    if (!documentNumber) return res.status(400).json({ verified: false, message: 'documentNumber required' });
    const out = await verifyByDocumentNumber(documentNumber);
    res.json(out);
}catch(error){
    console.log(error);
    res.status(500).json({ verified: false, message: "Server error during verification" });
}
});

app.get("/api/hr/automail-history", async(req,res)=>{
try{
    const auth = req.headers.authorization;
    if(!auth || !auth.startsWith("Bearer hr_")){
        return res.status(401).json({ message:"Unauthorized" });
    }
    const page = Math.max(1, parseInt(req.query.page || "1", 10) || 1);
    const limit = 50;
    const skip = (page - 1) * limit;
    const total = await AutoMailLog.countDocuments();
    const records = await AutoMailLog.find().sort({ sentAt: -1 }).skip(skip).limit(limit);
    res.json({ records, total, page });
}catch(error){
    console.log(error);
    res.status(500).json({ records:[], total:0, page:1 });
}
});

app.get("/api/hr/intern-stats", async(req,res)=>{
try{
    const auth = req.headers.authorization;
    if(!auth || !auth.startsWith("Bearer hr_")){
        return res.status(401).json({ message:"Unauthorized" });
    }
    const now = new Date();
    const cutoff30 = new Date(now);
    cutoff30.setDate(cutoff30.getDate() - 30);
    const totalInterns = await Student.countDocuments();
    const activeThisMonth = await Student.countDocuments({ lastActiveDate: { $gte: cutoff30 } });
    const inactiveInterns = await Student.countDocuments({ $or: [
        { lastActiveDate: { $exists: false } },
        { lastActiveDate: null },
        { lastActiveDate: { $lt: cutoff30 } }
    ]});
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const joins = await Student.find().select("joiningDate joinDate");
    let newJoinsThisMonth = 0;
    for(const s of joins){
        const jd = s.joinDate || s.joiningDate;
        if(!jd) continue;
        const dt = new Date(jd);
        if(isNaN(dt.getTime())) continue;
        if(dt >= monthStart && dt < monthEnd) newJoinsThisMonth++;
    }
    res.json({ totalInterns, activeThisMonth, inactiveInterns, newJoinsThisMonth });
}catch(error){
    console.log(error);
    res.status(500).json({ totalInterns:0, activeThisMonth:0, inactiveInterns:0, newJoinsThisMonth:0 });
}
});

app.get("/api/hr/intern-stats/monthly", async(req,res)=>{
try{
    const auth = req.headers.authorization;
    if(!auth || !auth.startsWith("Bearer hr_")){
        return res.status(401).json({ message:"Unauthorized" });
    }
    const now = new Date();
    const months = [];
    const keyMap = new Map();
    for(let i=5;i>=0;i--){
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const y = d.getFullYear();
        const m = d.getMonth();
        const key = y + "-" + String(m + 1).padStart(2, "0");
        const month = d.toLocaleString("en-US", { month: "short" });
        const obj = { key, month, count: 0 };
        months.push(obj);
        keyMap.set(key, obj);
    }
    const students = await Student.find().select("joiningDate joinDate");
    for(const s of students){
        const jd = s.joinDate || s.joiningDate;
        if(!jd) continue;
        const dt = new Date(jd);
        if(isNaN(dt.getTime())) continue;
        const key = dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0");
        const hit = keyMap.get(key);
        if(hit) hit.count++;
    }
    res.json(months.map(x => ({ month: x.month, count: x.count })));
}catch(error){
    console.log(error);
    res.status(500).json([]);
}
});

app.get('/api/hr/intern-list', async (req, res) => {
  try{
    const auth = req.headers.authorization;
    if(!auth || !auth.startsWith("Bearer hr_")){
        return res.status(401).json({ message:"Unauthorized" });
    }
    const type = req.query.type;
    const now = new Date();
    const d30 = new Date(now - 30*24*60*60*1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    let query = {};
    if (type === 'active')    query = { lastActiveDate: { $gte: d30 } };
    if (type === 'inactive')  query = { $or: [{ lastActiveDate: { $lt: d30 } }, { lastActiveDate: null }, { lastActiveDate: { $exists: false } }] };
    let students = await Student.find(query)
      .select('firstName lastName employeeId domain collegeName college lastActiveDate joiningDate joinDate')
      .sort({ joiningDate: -1 }).limit(400);
    if (type === 'newJoins'){
      students = students.filter(s => {
        const jd = s.joinDate || s.joiningDate;
        if(!jd) return false;
        const dt = new Date(jd);
        if(isNaN(dt.getTime())) return false;
        return dt >= monthStart;
      }).sort((a,b)=>{
        const ad = new Date(a.joinDate || a.joiningDate || 0).getTime();
        const bd = new Date(b.joinDate || b.joiningDate || 0).getTime();
        return bd - ad;
      }).slice(0,200);
    } else {
      students = students.slice(0,200);
    }
    res.json({ students: students.map(s => ({
      name: (s.firstName||'') + ' ' + (s.lastName||''),
      employeeId: s.employeeId,
      domain: s.domain,
      college: s.collegeName || s.college
    }))});
  }catch(e){
    console.log(e);
    res.status(500).json({ students: [] });
  }
});

// ================= HR - GET STUDENTS BY DOMAIN =================

app.get("/hr/students/domain/:domain", async(req,res)=>{
try{
    const auth = req.headers.authorization;
    if(!auth || !auth.startsWith("Bearer hr_")){
        return res.status(401).json({ message:"Unauthorized" });
    }
    const domain = decodeURIComponent(req.params.domain);
    const students = await Student.find({ domain }).sort({ createdAt:-1 });
    res.json({ success:true, students });
}catch(error){ 
    console.log(error);
    res.status(500).json({ message:"Error fetching domain students" }); 
}
});

// ================= HR - GET ALL COORDINATORS =================
// Returns the union of:
//   - the legacy hardcoded COORDINATORS map (one per domain)
//   - any DB-backed Coordinator documents (created via the promotion flow)
// Used by the HR Promotions section ("Promote to HR" tab).
app.get("/hr/coordinators", async(req,res)=>{
try{
    const auth = req.headers.authorization;
    if(!auth || !auth.startsWith("Bearer hr_")){
        return res.status(401).json({ success:false, message:"Unauthorized" });
    }
    const out = [];
    // Legacy hardcoded coordinators
    for(const [username, info] of Object.entries(COORDINATORS)){
        out.push({
            _id: "",
            source: "legacy",
            username,
            name: username,
            email: "",
            domain: info.domain || ""
        });
    }
    // DB-backed (promoted) coordinators
    try {
        const dbList = await Coordinator.find({}).sort({ createdAt:-1 });
        for(const c of dbList){
            out.push({
                _id: String(c._id),
                source: "db",
                username: c.username || c.email || "",
                name: c.name || c.username || c.email || "",
                email: c.email || "",
                domain: c.domain || "",
                employeeId: c.employeeId || ""
            });
        }
    } catch(_) { /* if Coordinator collection doesn't exist yet, just return legacy */ }

    res.json({ success:true, coordinators: out });
}catch(error){
    console.log("Error fetching coordinators:", error);
    res.status(500).json({ success:false, message:"Error fetching coordinators" });
}
});

// ================= HR - GET ALL SUBMISSIONS =================

app.get("/hr/submissions", async(req,res)=>{
try{
    const auth = req.headers.authorization;
    if(!auth || !auth.startsWith("Bearer hr_")){
        return res.status(401).json({ message:"Unauthorized" });
    }
    const submissions = await Submission.find().sort({ submittedAt:-1 });
    res.json({ success:true, submissions: await attachStudentDetailsToSubmissions(submissions) });
}catch(error){ res.status(500).json({ message:"Error" }); }
});

app.get("/hr/submissions/filter", async(req,res)=>{
try{
    const auth = req.headers.authorization;
    if(!auth || !auth.startsWith("Bearer hr_")){
        return res.status(401).json({ message:"Unauthorized" });
    }
    const status = String(req.query.status || "").trim();
    const query = status ? { status } : {};
    const submissions = await Submission.find(query).sort({ submittedAt:-1 });
    res.json({ success:true, submissions: await attachStudentDetailsToSubmissions(submissions) });
}catch(error){ res.status(500).json({ message:"Error" }); }
});

// ================= HR - GET STATS =================

app.get("/hr/stats", async(req,res)=>{
try{
    const auth = req.headers.authorization;
    if(!auth || !auth.startsWith("Bearer hr_")){
        return res.status(401).json({ message:"Unauthorized" });
    }
    const totalStudents = await Student.countDocuments();
    const totalSubmissions = await Submission.countDocuments();
    const approved = await Submission.countDocuments({ status:"Approved" });
    const rejected = await Submission.countDocuments({ status:"Rejected" });
    const pending = await Submission.countDocuments({ status:"Pending" });
    
    // Domain breakdown — uses canonical ALL_DOMAINS so HR Management is included
    const domains = ALL_DOMAINS;
    const domainStats = [];
    for(const d of domains){
        const count = await Student.countDocuments({ domain:d });
        if(count > 0) domainStats.push({ domain:d, count });
    }
    
    const notifications = await Notification.find({ from:"HR" }).sort({ createdAt:-1 }).limit(10);
    
    res.json({ 
        success:true, 
        stats:{ totalStudents, totalSubmissions, approved, rejected, pending },
        domainStats,
        notifications
    });
}catch(error){ res.status(500).json({ message:"Error" }); }
});

// ================= HR - GET ALL NOTIFICATIONS SENT =================

app.get("/hr/notifications", async(req,res)=>{
try{
    const auth = req.headers.authorization;
    if(!auth || !auth.startsWith("Bearer hr_")){
        return res.status(401).json({ message:"Unauthorized" });
    }
    const notifs = await Notification.find().sort({ createdAt:-1 }).limit(100);
    res.json({ success:true, notifications:notifs });
}catch(error){ res.status(500).json({ success:false }); }
});

// ================= HR - DELETE NOTIFICATION =================

app.delete("/hr/notifications/:id", async(req,res)=>{
try{
    const auth = req.headers.authorization;
    if(!auth || !auth.startsWith("Bearer hr_")){
        return res.status(401).json({ success:false, message:"Unauthorized" });
    }
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ success:true });
}catch(error){ res.json({ success:false }); }
});

// ================= ALL STUDENTS (legacy admin) =================

app.get("/students", async(req,res)=>{
    const adminPassword = req.headers.authorization;
    const expectedSecret = process.env.ADMIN_API_SECRET;
    if(!expectedSecret || adminPassword !== "Bearer " + expectedSecret){
        return res.status(401).json({ message:"Unauthorized" });
    }
    try{
        const students = await Student.find().sort({ createdAt:-1 });
        res.json(students);
    }catch(error){ res.status(500).json({ message:"Error fetching students" }); }
});

// ================= UPDATE STUDENT =================

app.put("/students/:id", async(req,res)=>{
try{
    const adminPassword = req.headers.authorization;
    const expectedSecret = process.env.ADMIN_API_SECRET;
    if(!expectedSecret || adminPassword !== "Bearer " + expectedSecret){
        return res.status(401).json({ message:"Unauthorized" });
    }
    const body = { ...req.body };
    if(body.firstName !== undefined || body.lastName !== undefined){
        body.name = `${body.firstName || ""} ${body.lastName || ""}`.trim();
    }
    if(body.collegeName !== undefined || body.college !== undefined){
        const collegeName = String(body.collegeName || body.college || "").trim();
        body.collegeName = collegeName;
        body.college = collegeName;
    }
    await Student.findByIdAndUpdate(req.params.id, body, { new:true });
    res.json({ message:"Student Updated" });
}catch(error){ res.status(500).json({ message:"Update Failed" }); }
});

// ================= DELETE STUDENT =================

app.delete("/students/:id", async(req,res)=>{
try{
    const adminPassword = req.headers.authorization;
    const expectedSecret = process.env.ADMIN_API_SECRET;
    if(!expectedSecret || adminPassword !== "Bearer " + expectedSecret){
        return res.status(401).json({ message:"Unauthorized" });
    }
    await Student.findByIdAndDelete(req.params.id);
    res.json({ message:"Student deleted" });
}catch(error){ res.status(500).json({ message:"Error deleting student" }); }
});

// ================= STUDENT LOGIN =================

app.post("/student-login", loginLimiter, async(req,res)=>{
try{
    const { employeeId, password } = req.body;
    const student = await Student.findOne({ employeeId, password });
    if(!student){ return res.json({ success:false, message:"Invalid Employee ID or Password" }); }

    // Internship end date (used by student dashboard profile modal)
    // tenure values in this app are "1 Month" | "3 Months" | "6 Months".
    let computedEndDate = null;
    if(student.joiningDate){
        const jd = new Date(student.joiningDate);
        if(!isNaN(jd.getTime())){
            const t = String(student.tenure || "").toLowerCase();
            const days = t.includes("6") ? 180 : t.includes("3") ? 90 : 30;
            const end = new Date(jd);
            end.setDate(end.getDate() + days);
            computedEndDate = end;
        }
    }

    await Student.findOneAndUpdate({ employeeId }, { lastActiveDate: new Date() });
    res.json({
        success:true,
        student:{
            name: student.firstName + " " + student.lastName,
            firstName: student.firstName, lastName: student.lastName,
            email: student.email || "",
            // Student schema in this project uses `whatsapp` for phone.
            phone: student.whatsapp || "",
            college: getStudentCollege(student),
            collegeName: getStudentCollege(student),

            employeeId: student.employeeId,
            domain: student.domain,
            tenure: student.tenure,

            // Dashboard uses `joiningDate` for the Joined field
            joiningDate: student.joiningDate,

            // Dashboard uses `internshipEnd` / `endDate` for the Internship End field
            internshipEnd: computedEndDate ? computedEndDate.toISOString() : null,
            endDate: computedEndDate ? computedEndDate.toISOString() : null,

            linkedDomains: student.linkedDomains || []
        }
    });
}catch(error){
    console.log(error);
    res.json({ success:false, message:"Server Error" });
}
});

// ================= COORDINATOR LOGIN =================

app.post("/coordinator-login", loginLimiter, async(req,res)=>{
try{
    const password = (req.body && req.body.password) || "";
    const identifier = ((req.body && (req.body.username || req.body.email)) || "").trim();
    if(!identifier || !password){
        return res.json({ success:false });
    }

    // 1) Hardcoded coordinator (legacy) — exact-username match
    const legacy = COORDINATORS[identifier];
    if(legacy && legacy.password === password){
        return res.json({ success:true, coordinator:{ username:identifier, domain:legacy.domain } });
    }

    // 2) DB-backed coordinator (created via promotion flow). Accepts either
    //    email or username.
    const q = identifier.indexOf("@") !== -1
        ? { email: identifier.toLowerCase() }
        : { $or: [{ username: identifier }, { email: identifier.toLowerCase() }] };
    const dbCoord = await Coordinator.findOne(q);
    if(dbCoord){
        const ok = await bcrypt.compare(password, dbCoord.password);
        if(ok){
            return res.json({ success:true, coordinator:{
                username: dbCoord.username || dbCoord.email,
                domain:   dbCoord.domain
            }});
        }
    }
    return res.json({ success:false });
}catch(error){
    console.log(error);
    res.json({ success:false });
}
});

// ================= TEST: COORDINATOR SAVE QUESTIONS =================

app.post("/save-test-questions", async(req,res)=>{
try{
    const { domain, questions, coordinatorId } = req.body;
    if(!domain || !coordinatorId){
        return res.status(401).json({ success:false, message:"Coordinator authentication required" });
    }
    // Verify coordinator is authorized for this domain
    const legacyCoord = Object.values(COORDINATORS).find(c => c.domain === domain);
    const dbCoord = await Coordinator.findOne({ domain });
    if(!legacyCoord && !dbCoord){
        return res.status(403).json({ success:false, message:"No coordinator found for this domain" });
    }
    await TestQuestion.deleteMany({ domain });
    const docs = questions.map(q=>({ domain, question:q.question, options:q.options, correctAnswer:q.correctAnswer }));
    await TestQuestion.insertMany(docs);
    res.json({ success:true, message:"Test questions saved" });
}catch(error){
    console.log(error);
    res.json({ success:false, message:"Failed to save questions" });
}
});

// ================= TEST: GET QUESTIONS FOR STUDENT =================

app.get("/get-test-questions/:domain", async(req,res)=>{
try{
    const domain = decodeURIComponent(req.params.domain);
    const questions = await TestQuestion.find({ domain }, { correctAnswer:0 });
    res.json({ success:true, questions });
}catch(error){
    console.log(error);
    res.json({ success:false, questions:[] });
}
});

// ================= TEST: SUBMIT TEST =================

app.post("/submit-test", async(req,res)=>{
try{
    const { employeeId, studentName, domain, answers } = req.body;

    const questions = await TestQuestion.find({ domain });
    if(questions.length === 0){
        return res.json({ success:false, message:"No test available" });
    }

    let score = 0;
    answers.forEach((ans, idx)=>{
        if(questions[idx] && ans === questions[idx].correctAnswer){ score++; }
    });

    const percentage = Math.round((score / questions.length) * 100);

    await TestResult.findOneAndUpdate(
        { employeeId, domain },
        { employeeId, studentName, domain, score, totalQuestions:questions.length, percentage, submittedAt:new Date() },
        { upsert:true, new:true }
    );

    res.json({ success:true, score, totalQuestions:questions.length, percentage });
}catch(error){
    console.log(error);
    res.json({ success:false, message:"Test submission failed" });
}
});

// ================= TEST: LEADERBOARD =================

app.get("/test-leaderboard/:domain", async(req,res)=>{
try{
    const domain = decodeURIComponent(req.params.domain);
    const results = await TestResult.find({ domain }).sort({ percentage:-1, submittedAt:1 });
    res.json({ success:true, leaderboard:results });
}catch(error){
    console.log(error);
    res.json({ success:false, leaderboard:[] });
}
});


// ================= COORDINATOR TASK SCHEMA =================

const coordinatorTaskSchema = new mongoose.Schema({
    domain:    { type: String, required: true, unique: true },
    tasks:     [String],
    fileUrl:   { type: String, default: "" },
    fileName:  { type: String, default: "" },
    // F8 — optional submission deadline for the domain task. When present and
    // in the past, the hourly cron flips the per-student `isOverdue` flag and
    // sends a one-time overdue notification (idempotent via lastOverdueRun).
    deadline:           { type: Date,   default: null },
    lastOverdueRunAt:   { type: Date,   default: null },
    updatedAt: { type: Date, default: Date.now }
});
const CoordinatorTask = mongoose.model("CoordinatorTask", coordinatorTaskSchema);

// ================= COORDINATOR TASKS - GET =================

app.get("/coordinator/tasks/:domain", async(req,res)=>{
try{
    const domain = decodeURIComponent(req.params.domain);
    const ct = await CoordinatorTask.findOne({ domain });
    res.json({ success:true, tasks: ct?.tasks||[], fileUrl: ct?.fileUrl||"", fileName: ct?.fileName||"" });
}catch(e){ res.json({ success:true, tasks:[], fileUrl:"", fileName:"" }); }
});

// ================= COORDINATOR TASKS - SAVE =================

app.post("/coordinator/tasks", async(req,res)=>{
try{
    const { domain, tasks, deadline } = req.body;
    // Empty string clears the deadline; a real ISO/parsable date sets it.
    let deadlineVal = undefined;     // undefined means: don't touch in $set
    if(deadline === "" || deadline === null){
        deadlineVal = null;
    } else if(deadline){
        const d = new Date(deadline);
        if(!isNaN(d.getTime())) deadlineVal = d;
    }
    const update = { domain, tasks, updatedAt: new Date() };
    if(deadlineVal !== undefined){
        update.deadline = deadlineVal;
        // Reset cron-throttle when the deadline changes, so the new
        // deadline can fire its overdue notifications fresh.
        update.lastOverdueRunAt = null;
    }
    await CoordinatorTask.findOneAndUpdate(
        { domain },
        update,
        { upsert:true, new:true }
    );
    res.json({ success:true });
}catch(e){ res.json({ success:false, message:"Failed to save tasks" }); }
});

// ================= COORDINATOR TASKS - UPLOAD FILE =================

app.post("/coordinator/tasks/upload-file", upload.single("taskFile"), async(req,res)=>{
try{
    const { domain } = req.body;
    if(!req.file){ return res.json({ success:false, message:"No file uploaded" }); }
    const fileUrl  = "/" + req.file.path;
    const fileName = req.file.originalname;
    await CoordinatorTask.findOneAndUpdate(
        { domain },
        { domain, fileUrl, fileName, updatedAt: new Date() },
        { upsert:true, new:true }
    );
    res.json({ success:true, fileUrl, fileName });
}catch(e){ res.json({ success:false, message:"Upload failed: " + e.message }); }
});

// ================= COORDINATOR TASKS - REMOVE FILE =================

app.post("/coordinator/tasks/remove-file", async(req,res)=>{
try{
    const { domain } = req.body;
    await CoordinatorTask.findOneAndUpdate({ domain }, { fileUrl:"", fileName:"" });
    res.json({ success:true });
}catch(e){ res.json({ success:false }); }
});

// ==================================================================
// ============ DUAL ATTENDANCE & CERTIFICATE WORKFLOW ==============
// ==================================================================
// New primary attendance system (models/Attendance.js).
// SELF attendance: student marks once per calendar day (independent of tasks).
// CLASS attendance: coordinator marks/edit any date (Present/Absent).
// Two-step certificate approval: Coordinator -> HR -> Generate certificates.

// ---- Helpers ----
function toDateKey(d){
    const dt = new Date(d);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const day = String(dt.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function parseJoinDate(joiningDate){
    if(!joiningDate) return null;
    const d = new Date(joiningDate);
    if(isNaN(d.getTime())) return null;
    return d;
}

// Working days from joining date to today (inclusive), excluding Sundays only.
// Saturday IS a working day. Used for ALL attendance percentage calculations.
function countDaysExcludingSundays(start, end){
    let count = 0;
    const cur = new Date(start); cur.setHours(0,0,0,0);
    const e = new Date(end);     e.setHours(0,0,0,0);
    while(cur <= e){
        if(cur.getDay() !== 0) count++;   // 0 = Sunday → skip
        cur.setDate(cur.getDate() + 1);
    }
    return count;
}

// Attendance % = (present days) / (working days since joining) * 100.
// Working days are calendar days from joiningDate to today (inclusive), excluding Sundays only.
// We DO NOT use marked-day count as the denominator. If the joining date is unknown
// or no working days exist yet (e.g. only-Sunday range), all percentages are 0.
async function computeAttendanceStats(employeeId, joiningDate){
    const records = await Attendance.find({ employeeId });
    const self   = records.filter(r => r.markedBy === "self");
    const coord  = records.filter(r => r.markedBy === "coordinator");

    const selfPresent  = self.filter(r => r.status === "Present").length;
    const coordPresent = coord.filter(r => r.status === "Present").length;
    const coordAbsent  = coord.filter(r => r.status === "Absent").length;

    // Union of distinct calendar days the student was Present in EITHER source
    const presentDayKeys = new Set();
    records.forEach(r => { if(r.status === "Present") presentDayKeys.add(r.dateKey); });
    const combinedPresentDays = presentDayKeys.size;

    // Denominator: working days from joining date → today (inclusive), excluding Sundays.
    let workingDays = 0;
    const jd = parseJoinDate(joiningDate);
    if(jd){
        const today = new Date();
        const j = new Date(jd); j.setHours(0,0,0,0);
        const t = new Date(today); t.setHours(0,0,0,0);
        if(j <= t) workingDays = countDaysExcludingSundays(j, t);
    }

    // No valid joining date / no working days yet → percentages are not defined (0).
    if(workingDays < 1){
        return {
            selfPresent, selfTotal: self.length,
            coordPresent, coordAbsent, coordTotal: coord.length,
            combinedPresentDays, workingDays: 0,
            selfPct: 0, coordPct: 0, combinedPct: 0,
            eligible: false
        };
    }

    // Cap at 100 to guard against marks on excluded days (e.g. Sunday entries).
    const combinedPct = Math.min(100, Math.round((combinedPresentDays / workingDays) * 100));
    const selfPct     = Math.min(100, Math.round((selfPresent  / workingDays) * 100));
    const coordPct    = Math.min(100, Math.round((coordPresent / workingDays) * 100));

    return {
        selfPresent, selfTotal: self.length,
        coordPresent, coordAbsent, coordTotal: coord.length,
        combinedPresentDays, workingDays,
        selfPct, coordPct, combinedPct,
        eligible: combinedPct >= 75
    };
}

// ---- STUDENT: mark own attendance (once per day) ----
app.post("/attendance/self", async(req,res)=>{
try{
    const { employeeId } = req.body;
    if(!employeeId) return res.json({ success:false, message:"Employee ID required" });

    const student = await Student.findOne({ employeeId });
    if(!student) return res.json({ success:false, message:"Student not found" });

    const now = new Date();
    const dateKey = toDateKey(now);

    const existing = await Attendance.findOne({ employeeId, dateKey, markedBy:"self" });
    if(existing) return res.json({ success:false, alreadyMarked:true, message:"Already marked for today" });

    const att = new Attendance({
        studentId: student._id, employeeId, domain: student.domain,
        date: now, dateKey, status:"Present", markedBy:"self"
    });
    await att.save();
    await Student.findOneAndUpdate({ employeeId }, { lastActiveDate: new Date() });
    // Streak + milestones + badges (Features 6, 7, 11)
    await bumpStreakAndMilestones(student);
    await checkCertificateEligibility(employeeId);
    await recomputeBadgesFor(employeeId);
    res.json({ success:true, message:"Attendance marked for today", attendance:att });
}catch(e){
    if(e.code === 11000) return res.json({ success:false, alreadyMarked:true, message:"Already marked for today" });
    console.log(e); res.json({ success:false, message:"Failed to mark attendance" });
}
});

// ---- COORDINATOR: mark/update class attendance for any date ----
app.post("/attendance/coordinator", async(req,res)=>{
try{
    const { employeeId, date, status, coordinatorId } = req.body;
    if(!employeeId || !date) return res.json({ success:false, message:"Employee ID and date required" });

    const student = await Student.findOne({ employeeId });
    if(!student) return res.json({ success:false, message:"Student not found" });

    const st = (status === "Absent") ? "Absent" : "Present";
    const d = new Date(date);
    if(isNaN(d.getTime())) return res.json({ success:false, message:"Invalid date" });
    const dateKey = toDateKey(d);

    // Idempotent: if already marked for that day, update it instead of erroring
    let att = await Attendance.findOne({ employeeId, dateKey, markedBy:"coordinator" });
    if(att){
        att.status = st;
        att.coordinatorId = coordinatorId || att.coordinatorId;
        att.date = d;
        await att.save();
        // Notify the student so their dashboard refreshes attendance
        try{
            const notif = new Notification({
                title: "Class attendance updated",
                message: `Coordinator updated your class attendance for ${dateKey}: ${st}.`,
                type: "info", from: "Coordinator",
                targetType: "student", targetEmployeeId: employeeId, targetDomain: student.domain
            });
            await notif.save();
            broadcastNotification(student.domain, employeeId, notif);
        }catch(_){}
        return res.json({ success:true, updated:true, message:"Attendance updated", attendance:att });
    }

    att = new Attendance({
        studentId: student._id, employeeId, domain: student.domain,
        date: d, dateKey, status: st, markedBy:"coordinator", coordinatorId: coordinatorId || ""
    });
    await att.save();
    // Notify the student so their dashboard refreshes attendance
    try{
        const notif = new Notification({
            title: "Class attendance marked",
            message: `Coordinator marked your class attendance for ${dateKey}: ${st}.`,
            type: st === "Present" ? "success" : "warning",
            from: "Coordinator",
            targetType: "student", targetEmployeeId: employeeId, targetDomain: student.domain
        });
        await notif.save();
        broadcastNotification(student.domain, employeeId, notif);
    }catch(_){}
    res.json({ success:true, message:"Attendance marked", attendance:att });
}catch(e){
    if(e.code === 11000) return res.json({ success:false, message:"Already marked for this date" });
    console.log(e); res.json({ success:false, message:"Failed to mark attendance" });
}
});

// ---- COORDINATOR: edit an existing attendance record ----
app.put("/attendance/:id", async(req,res)=>{
try{
    const { status, coordinatorId } = req.body;
    const att = await Attendance.findById(req.params.id);
    if(!att) return res.json({ success:false, message:"Record not found" });
    if(att.markedBy !== "coordinator")
        return res.json({ success:false, message:"Only coordinator-marked attendance can be edited" });

    if(status) att.status = (status === "Absent") ? "Absent" : "Present";
    if(coordinatorId) att.coordinatorId = coordinatorId;
    await att.save();
    res.json({ success:true, message:"Attendance updated", attendance:att });
}catch(e){ console.log(e); res.json({ success:false, message:"Failed to update" }); }
});

// ---- GET attendance history + stats for one student ----
app.get("/attendance/student/:employeeId", async(req,res)=>{
try{
    const employeeId = decodeURIComponent(req.params.employeeId);
    const student = await Student.findOne({ employeeId });
    const records = await Attendance.find({ employeeId }).sort({ date:-1 });
    const stats = await computeAttendanceStats(employeeId, student ? student.joiningDate : null);
    const today = toDateKey(new Date());
    const markedToday = records.some(r => r.markedBy === "self" && r.dateKey === today);
    res.json({ success:true, attendance:records, stats, markedToday });
}catch(e){ console.log(e); res.json({ success:false, attendance:[], stats:null }); }
});

// ---- HR: attendance monitor (all students summary) ----
app.get("/attendance/monitor", async(req,res)=>{
try{
    const auth = req.headers.authorization;
    if(!auth || !auth.startsWith("Bearer hr_")) return res.status(401).json({ success:false, message:"Unauthorized" });

    const students = await Student.find().sort({ createdAt:-1 });
    const result = [];
    for(const s of students){
        const stats = await computeAttendanceStats(s.employeeId, s.joiningDate);
        result.push({
            _id:s._id, employeeId:s.employeeId,
            name:(s.name || ((s.firstName||"")+" "+(s.lastName||""))).trim(),
            domain:s.domain, joiningDate:s.joiningDate,
            collegeName: collegeDisplay(s), college: collegeDisplay(s),
            stats
        });
    }
    res.json({ success:true, students:result });
}catch(e){ console.log(e); res.json({ success:false, students:[] }); }
});

// ---- COORDINATOR: student overview for their domain ----
// Returns each student's tasks, attendance stats, performance & approval state.
app.get("/coordinator/student-overview/:domain", async(req,res)=>{
try{
    const domain = decodeURIComponent(req.params.domain);
    const studentsRaw = await Student.find({ domain }).sort({ createdAt:-1 });
    // BUG FIX 2: deduplicate by employeeId so each student appears only once.
    // Earlier registrations may have produced duplicate Student docs with the
    // same employeeId; keep only the most recent.
    const seen = new Set();
    const students = [];
    for(const s of studentsRaw){
        const key = s.employeeId || String(s._id);
        if(seen.has(key)) continue;
        seen.add(key);
        students.push(s);
    }
    const result = [];
    for(const s of students){
        const submissions = await Submission.find({ employeeId:s.employeeId }).sort({ submittedAt:-1 });
        const stats = await computeAttendanceStats(s.employeeId, s.joiningDate);
        // Replace the old letter-grade performance with the professional formula.
        const perf = await calculatePerformance(s);
        result.push({
            _id:s._id, employeeId:s.employeeId,
            name:(s.name || ((s.firstName||"")+" "+(s.lastName||""))).trim(),
            domain:s.domain, joiningDate:s.joiningDate, tenure:s.tenure,
            submissions: submissions.map(x => ({ task:x.task, status:x.status, feedback:x.feedback, submittedAt:x.submittedAt })),
            stats,
            // Backward-compatible: keep `performance` as a label, plus a structured object.
            performance: perf ? (perf.score + " · " + perf.grade) : "—",
            performanceObj: perf || null,
            certificateApprovedByCoordinator: s.certificateApprovedByCoordinator,
            coordinatorRemarks: s.coordinatorRemarks,
            coordinatorApprovedAt: s.coordinatorApprovedAt,
            certificateApprovedByHR: s.certificateApprovedByHR,
            hrRejected: s.hrRejected,
            hrRejectionReason: s.hrRejectionReason
        });
    }
    res.json({ success:true, students:result });
}catch(e){ console.log(e); res.json({ success:false, students:[] }); }
});

// ---- COORDINATOR: all attendance records for a domain (optionally one date) ----
app.get("/coordinator/attendance/:domain", async(req,res)=>{
try{
    const domain = decodeURIComponent(req.params.domain);
    const query = { domain };
    if(req.query.date) query.dateKey = req.query.date;
    const records = await Attendance.find(query).sort({ date:-1 });
    res.json({ success:true, records });
}catch(e){ console.log(e); res.json({ success:false, records:[] }); }
});

// ---- COORDINATOR: approve student for certificate consideration ----
app.post("/students/:id/coordinator-approve", async(req,res)=>{
try{
    const { coordinatorId, remarks } = req.body;
    const student = await Student.findById(req.params.id);
    if(!student) return res.json({ success:false, message:"Student not found" });

    student.certificateApprovedByCoordinator = true;
    student.approvedByCoordinatorId = coordinatorId || "coordinator";
    student.coordinatorApprovedAt = new Date();
    student.coordinatorRemarks = remarks || "";
    // Clear any prior HR rejection so the student re-enters HR's pending queue
    student.hrRejected = false;
    student.hrRejectionReason = "";
    student.milestones = student.milestones || {};
    if(!student.milestones.coordinatorApproved) student.milestones.coordinatorApproved = new Date();
    await student.save();

    // Notify the student
    const notif = new Notification({
        title:"Coordinator Approved You ✅",
        message:"Your coordinator has approved you for certificate consideration. Awaiting HR final review.",
        type:"success", from:"Coordinator",
        targetType:"student", targetEmployeeId:student.employeeId, targetDomain:student.domain
    });
    await notif.save();
    broadcastNotification(student.domain, student.employeeId, notif);

    res.json({ success:true, message:"Student approved and sent to HR for review" });
}catch(e){ console.log(e); res.json({ success:false, message:"Failed to approve" }); }
});

// ---- COORDINATOR: revoke a previously given approval ----
app.post("/students/:id/coordinator-revoke", async(req,res)=>{
try{
    const student = await Student.findById(req.params.id);
    if(!student) return res.json({ success:false, message:"Student not found" });

    student.certificateApprovedByCoordinator = false;
    student.coordinatorApprovedAt = null;
    student.coordinatorRemarks = "";
    // Revoking coordinator approval also removes any HR approval (chain broken)
    student.certificateApprovedByHR = false;
    student.hrApprovedAt = null;
    student.hrRemarks = "";
    await student.save();

    res.json({ success:true, message:"Approval revoked" });
}catch(e){ console.log(e); res.json({ success:false, message:"Failed to revoke" }); }
});

// ---- HR: list students approved by coordinator & awaiting HR review ----
app.get("/students/coordinator-approved", async(req,res)=>{
try{
    const auth = req.headers.authorization;
    if(!auth || !auth.startsWith("Bearer hr_")) return res.status(401).json({ success:false, message:"Unauthorized" });

    const students = await Student.find({
        certificateApprovedByCoordinator: true,
        certificateApprovedByHR: false
    }).sort({ coordinatorApprovedAt:-1 });

    const result = [];
    for(const s of students){
        const submissions = await Submission.find({ employeeId:s.employeeId }).sort({ submittedAt:-1 });
        const stats = await computeAttendanceStats(s.employeeId, s.joiningDate);
        result.push({
            _id:s._id, employeeId:s.employeeId,
            name:(s.name || ((s.firstName||"")+" "+(s.lastName||""))).trim(),
            domain:s.domain, joiningDate:s.joiningDate, tenure:s.tenure,
            collegeName: collegeDisplay(s), college: collegeDisplay(s),
            submissions: submissions.map(x => ({ task:x.task, status:x.status, submittedAt:x.submittedAt })),
            stats,
            approvedByCoordinatorId: s.approvedByCoordinatorId,
            coordinatorRemarks: s.coordinatorRemarks,
            coordinatorApprovedAt: s.coordinatorApprovedAt,
            hrRejected: s.hrRejected, hrRejectionReason: s.hrRejectionReason
        });
    }
    res.json({ success:true, students:result });
}catch(e){ console.log(e); res.json({ success:false, students:[] }); }
});

// ---- HR: final approval ----
app.post("/students/:id/hr-approve", async(req,res)=>{
try{
    const auth = req.headers.authorization;
    if(!auth || !auth.startsWith("Bearer hr_")) return res.status(401).json({ success:false, message:"Unauthorized" });

    const { hrId, remarks } = req.body;
    const student = await Student.findById(req.params.id);
    if(!student) return res.json({ success:false, message:"Student not found" });
    if(!student.certificateApprovedByCoordinator)
        return res.json({ success:false, message:"Coordinator has not approved this student yet" });

    student.certificateApprovedByHR = true;
    student.approvedByHRId = hrId || "hr";
    student.hrApprovedAt = new Date();
    student.hrRemarks = remarks || "";
    student.hrRejected = false;
    student.hrRejectionReason = "";
    student.milestones = student.milestones || {};
    if(!student.milestones.hrApproved) student.milestones.hrApproved = new Date();
    await student.save();

    const notif = new Notification({
        title:"Certificate Approved 🎉",
        message:"HR has given final approval. Your certificates are now available.",
        type:"success", from:"HR",
        targetType:"student", targetEmployeeId:student.employeeId, targetDomain:student.domain
    });
    await notif.save();
    broadcastNotification(student.domain, student.employeeId, notif);

    res.json({ success:true, message:"Student fully approved for certificates" });
}catch(e){ console.log(e); res.json({ success:false, message:"Failed to approve" }); }
});

// ---- HR: reject (sends student back to coordinator with a reason) ----
app.post("/students/:id/hr-reject", async(req,res)=>{
try{
    const auth = req.headers.authorization;
    if(!auth || !auth.startsWith("Bearer hr_")) return res.status(401).json({ success:false, message:"Unauthorized" });

    const { reason } = req.body;
    const student = await Student.findById(req.params.id);
    if(!student) return res.json({ success:false, message:"Student not found" });

    student.certificateApprovedByHR = false;
    student.hrApprovedAt = null;
    student.hrRejected = true;
    student.hrRejectionReason = reason || "No reason provided";
    // Send back to coordinator: clear coordinator approval so they must re-review
    student.certificateApprovedByCoordinator = false;
    await student.save();

    const notif = new Notification({
        title:"Certificate Review: Action Needed",
        message:`HR returned your certificate review to the coordinator. Reason: ${student.hrRejectionReason}`,
        type:"warning", from:"HR",
        targetType:"coordinator-domain", targetDomain:student.domain
    });
    await notif.save();

    res.json({ success:true, message:"Student rejected and returned to coordinator" });
}catch(e){ console.log(e); res.json({ success:false, message:"Failed to reject" }); }
});

// ---- HR: list fully approved (certificate-eligible) students ----
app.get("/students/hr-approved", async(req,res)=>{
try{
    const auth = req.headers.authorization;
    if(!auth || !auth.startsWith("Bearer hr_")) return res.status(401).json({ success:false, message:"Unauthorized" });

    const students = await Student.find({ certificateApprovedByHR: true }).sort({ hrApprovedAt:-1 });
    const result = [];
    for(const s of students){
        const stats = await computeAttendanceStats(s.employeeId, s.joiningDate);
        result.push({
            _id:s._id, employeeId:s.employeeId,
            name:(s.name || ((s.firstName||"")+" "+(s.lastName||""))).trim(),
            domain:s.domain, joiningDate:s.joiningDate, tenure:s.tenure,
            collegeName: collegeDisplay(s), college: collegeDisplay(s),
            stats,
            coordinatorRemarks:s.coordinatorRemarks, hrRemarks:s.hrRemarks,
            hrApprovedAt:s.hrApprovedAt
        });
    }
    res.json({ success:true, students:result });
}catch(e){ console.log(e); res.json({ success:false, students:[] }); }
});

// ==================================================================
// =============== TASK SUBMISSION DELETION (BUG FIX 3) =============
// ==================================================================
// Owner-only delete; Pending submissions cannot be deleted (must be reviewed first).
app.delete("/submissions/:id", async(req,res)=>{
try{
    const id = req.params.id;
    // Body or query for the requesting student's employeeId (ownership check)
    const requesterEmployeeId =
        (req.body && req.body.employeeId) ||
        (req.query && req.query.employeeId) || "";

    if(!requesterEmployeeId){
        return res.status(400).json({ success:false, message:"employeeId required to verify ownership" });
    }
    const sub = await Submission.findById(id);
    if(!sub) return res.status(404).json({ success:false, message:"Submission not found" });
    if(sub.employeeId !== requesterEmployeeId){
        return res.status(403).json({ success:false, message:"You can only delete your own submissions" });
    }
    if(sub.status !== "Approved" && sub.status !== "Rejected"){
        return res.status(400).json({ success:false, message:"Only reviewed (Approved/Rejected) submissions can be deleted" });
    }

    // Best-effort cleanup of uploaded files (image/pdf) — never fails the request
    [sub.image, sub.pdf].forEach(p => {
        if(!p) return;
        try{
            const local = p.replace(/^\//, "");
            if(local && fs.existsSync(local)) fs.unlinkSync(local);
        }catch(_){}
    });

    await Submission.findByIdAndDelete(id);
    res.json({ success:true, message:"Submission deleted" });
}catch(e){
    console.log(e);
    res.status(500).json({ success:false, message:"Failed to delete submission" });
}
});

// ==================================================================
// =================== REAL-TIME CHAT (Socket.IO) ===================
// ==================================================================
// Rooms:
//   "domain_<DomainName>"  — students of that domain + the coordinator of that domain
//   "general"              — every authenticated user
//   "hr_coordinators"      — all HR + all coordinators
//   "hr_internal"          — HR only
// Identity is captured at the REST/Socket layer from the client's session
// (employeeId for students, username for coord/HR) and verified against DB or
// the HR_ACCOUNTS / COORDINATORS maps before any chat action is allowed.

async function verifyChatIdentity(claim){
    if(!claim || !claim.role) return null;
    if(claim.role === "student"){
        if(!claim.employeeId) return null;
        const s = await Student.findOne({ employeeId: claim.employeeId });
        if(!s) return null;
        return {
            role: "student",
            id: s.employeeId,
            name: (s.name || ((s.firstName||"")+" "+(s.lastName||""))).trim() || s.employeeId,
            domain: s.domain || ""
        };
    }
    if(claim.role === "coordinator"){
        // The handshake field is named `username` for backward compatibility, but
        // it can hold either a legacy username or an email (DB-backed coordinator).
        const id = claim.username || claim.email;
        if(!id) return null;
        const legacy = COORDINATORS[id];
        if(legacy) return { role: "coordinator", id, name: id, domain: legacy.domain };
        // DB-backed: created via promotion flow
        const q = id.indexOf("@") !== -1
            ? { email: id.toLowerCase() }
            : { $or: [{ username: id }, { email: id.toLowerCase() }] };
        const dbC = await Coordinator.findOne(q);
        if(dbC) return { role: "coordinator", id: dbC.email || dbC.username || id, name: dbC.name, domain: dbC.domain };
        return null;
    }
    if(claim.role === "hr"){
        const id = claim.username || claim.email;
        if(!id) return null;
        // Legacy hardcoded HR (by username key)
        const legacy = HR_ACCOUNTS[id];
        if(legacy) return { role: "hr", id, name: legacy.name, domain: "" };
        // Legacy hardcoded HR (by their assigned email)
        const legacyByEmail = Object.entries(HR_ACCOUNTS).find(
            ([_, v]) => (v.email || "").toLowerCase() === String(id).toLowerCase()
        );
        if(legacyByEmail){
            const [u, v] = legacyByEmail;
            return { role: "hr", id: v.email || u, name: v.name, domain: "" };
        }
        // DB-backed HR (created via promotion flow)
        if(id.indexOf("@") !== -1){
            const dbH = await HR.findOne({ email: id.toLowerCase() });
            if(dbH) return { role: "hr", id: dbH.email, name: dbH.name, domain: "" };
        }
        return null;
    }
    return null;
}

function roomsAllowedFor(identity){
    const rooms = ["general"];
    if(identity.role === "student"){
        if(identity.domain) rooms.push("domain_" + identity.domain);
    } else if(identity.role === "coordinator"){
        if(identity.domain) rooms.push("domain_" + identity.domain);
        rooms.push("hr_coordinators");
    } else if(identity.role === "hr"){
        rooms.push("hr_coordinators");
        rooms.push("hr_internal");
    }
    return rooms;
}
function canAccessRoom(identity, room){
    if(!room) return false;
    if(roomsAllowedFor(identity).indexOf(room) !== -1) return true;
    // domain_* rooms only allowed if the suffix matches the user's domain
    if(room.indexOf("domain_") === 0 && identity.domain && room === "domain_" + identity.domain) return true;
    return false;
}
function canDeleteIn(identity, room){
    // Per spec: coordinator (in their domain chat); coordinator+HR (general/staff); HR (hr_internal).
    if(!canAccessRoom(identity, room)) return false;
    if(identity.role === "student") return false;
    return true;
}

// REST: load last 50 messages for a room (after permission check)
app.get("/chat/messages/:room", async(req,res)=>{
try{
    const room = decodeURIComponent(req.params.room);
    const identity = await verifyChatIdentity({
        role: req.query.role,
        employeeId: req.query.employeeId,
        username: req.query.username
    });
    if(!identity) return res.status(401).json({ success:false, message:"Unauthorized" });
    if(!canAccessRoom(identity, room)) return res.status(403).json({ success:false, message:"Forbidden" });

    const messages = await Message.find({ chatRoom: room }).sort({ timestamp: -1 }).limit(50);
    messages.reverse();   // chronological for the UI
    res.json({ success:true, messages });
}catch(e){ console.log(e); res.status(500).json({ success:false, messages:[] }); }
});

// REST fallback for delete (Socket.IO event is the primary path)
app.delete("/chat/messages/:messageId", async(req,res)=>{
try{
    const identity = await verifyChatIdentity({
        role: (req.body && req.body.role) || req.query.role,
        employeeId: (req.body && req.body.employeeId) || req.query.employeeId,
        username: (req.body && req.body.username) || req.query.username
    });
    if(!identity) return res.status(401).json({ success:false, message:"Unauthorized" });
    const msg = await Message.findById(req.params.messageId);
    if(!msg) return res.status(404).json({ success:false, message:"Message not found" });
    if(!canDeleteIn(identity, msg.chatRoom)) return res.status(403).json({ success:false, message:"Forbidden" });
    await Message.findByIdAndDelete(msg._id);
    if(io){ io.to(msg.chatRoom).emit("message_deleted", { messageId: String(msg._id), room: msg.chatRoom }); }
    res.json({ success:true });
}catch(e){ console.log(e); res.status(500).json({ success:false }); }
});

// ==================================================================
// ================= PERFORMANCE CALCULATION ========================
// ==================================================================
// Requirement 6: weighted out of 100. Reusable from anywhere.
//   Factor 1 — Attendance (max 30): combinedAttendance% * 0.30
//   Factor 2 — Task Completion (max 35): approved/totalSubmitted * 35
//   Factor 3 — Task Quality (max 25): approved/max(totalSubmitted,1) * 25
//   Factor 4 — Consistency (max 10): activeWeeks/totalWeeks * 10

function gradeForScore(score){
    if(score >= 90) return "Outstanding ⭐";
    if(score >= 75) return "Excellent 🟢";
    if(score >= 60) return "Good 🔵";
    if(score >= 45) return "Average 🟡";
    return "Needs Improvement 🔴";
}

async function calculatePerformance(studentRefOrId){
    // Resolve a student doc whether passed an ObjectId, an employeeId or a doc.
    let student = null;
    if(!studentRefOrId) return null;
    if(typeof studentRefOrId === "string"){
        student = await Student.findOne({ employeeId: studentRefOrId })
                || (mongoose.isValidObjectId(studentRefOrId) ? await Student.findById(studentRefOrId) : null);
    } else if(studentRefOrId.employeeId){
        student = studentRefOrId;
    } else if(studentRefOrId._id){
        student = await Student.findById(studentRefOrId._id);
    }
    if(!student) return null;

    const stats = await computeAttendanceStats(student.employeeId, student.joiningDate);
    const submissions = await Submission.find({ employeeId: student.employeeId });
    const totalSubmitted = submissions.length;
    const approved = submissions.filter(s => s.status === "Approved").length;

    // Factor 1
    const attendanceScore = (Math.min(100, stats.combinedPct || 0) / 100) * 30;

    // Factor 2
    const taskScore = totalSubmitted > 0 ? (approved / totalSubmitted) * 35 : 0;

    // Factor 3 (per spec)
    const qualityScore = (approved / Math.max(totalSubmitted, 1)) * 25;

    // Factor 4 — consistency: weeks-since-joining vs weeks with at least one mark
    let consistencyScore = 0;
    const jd = parseJoinDate(student.joiningDate);
    if(jd){
        const today = new Date(); today.setHours(0,0,0,0);
        const j = new Date(jd); j.setHours(0,0,0,0);
        const ms = today - j;
        const totalWeeks = Math.max(1, Math.ceil(ms / (7 * 24 * 3600 * 1000)) || 1);
        const records = await Attendance.find({ employeeId: student.employeeId });
        const activeWeeks = new Set();
        records.forEach(r => {
            const d = new Date(r.date);
            const days = Math.floor((d - j) / (24 * 3600 * 1000));
            if(days >= 0) activeWeeks.add(Math.floor(days / 7));
        });
        consistencyScore = (Math.min(activeWeeks.size, totalWeeks) / totalWeeks) * 10;
    }

    const total = attendanceScore + taskScore + qualityScore + consistencyScore;
    const score = Math.round(total * 10) / 10;
    return {
        score,
        grade: gradeForScore(score),
        breakdown: {
            attendance:  Math.round(attendanceScore  * 10) / 10,
            task:        Math.round(taskScore        * 10) / 10,
            quality:     Math.round(qualityScore     * 10) / 10,
            consistency: Math.round(consistencyScore * 10) / 10,
            // Inputs (useful for UI tooltips)
            combinedAttendancePct: stats.combinedPct,
            approved, totalSubmitted
        }
    };
}

// ---- GET performance for a student ----
app.get("/students/:id/performance", async(req,res)=>{
try{
    const id = req.params.id;
    let student = null;
    if(mongoose.isValidObjectId(id)) student = await Student.findById(id);
    if(!student) student = await Student.findOne({ employeeId: id });
    if(!student) return res.status(404).json({ success:false, message:"Student not found" });
    const perf = await calculatePerformance(student);
    res.json({ success:true, performance: perf });
}catch(e){ console.log(e); res.status(500).json({ success:false }); }
});

// ==================================================================
// =================== PROMOTION FLOW ===============================
// ==================================================================
// Requirement 1+2+3: HR promotes a student/coordinator, the promoted user
// receives an email with a 12-char temporary password, and completes
// registration at /promoted-register.html within 48 hours.

function generateSecureTempPassword(){
    // 12 chars: uppercase, lowercase, digits, symbols. No ambiguous chars.
    const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lower = "abcdefghijkmnpqrstuvwxyz";
    const digit = "23456789";
    const sym   = "!@#$%^&*-_=+";
    const all   = upper + lower + digit + sym;
    const buf   = crypto.randomBytes(12);
    // Guarantee each class appears at least once
    const must = [
        upper[buf[0] % upper.length],
        lower[buf[1] % lower.length],
        digit[buf[2] % digit.length],
        sym[buf[3] % sym.length]
    ];
    const rest = [];
    for(let i = 4; i < 12; i++) rest.push(all[buf[i] % all.length]);
    // Shuffle deterministically using the same buffer
    const out = must.concat(rest);
    for(let i = out.length - 1; i > 0; i--){
        const j = buf[i] % (i + 1);
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out.join("");
}

function promotionEmailHtml({ name, fromRoleLabel, toRoleLabel, employeeId, domain, email, tempPassword, loginUrl, dateStr }){
    const safe = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
    return `<!doctype html><html><body style="margin:0;background:#0c1220;font-family:Segoe UI,Arial,sans-serif;color:#f0eee8;">
<table width="100%" cellspacing="0" cellpadding="0" style="background:#0c1220;padding:32px 0;"><tr><td align="center">
  <table width="600" cellspacing="0" cellpadding="0" style="background:#0e1628;border:1px solid rgba(245,197,66,0.18);border-radius:18px;overflow:hidden;">
    <tr><td style="background:linear-gradient(135deg,#1a1208,#3a2a08);padding:28px 32px;text-align:center;">
      <div style="font-size:13px;letter-spacing:6px;color:#f5c542;font-weight:700;">THE ENTREPRENEURSHIP NETWORK</div>
      <div style="font-size:24px;color:#fff7d6;font-weight:800;margin-top:8px;">🎉 Congratulations, ${safe(name)}!</div>
    </td></tr>
    <tr><td style="padding:28px 34px;">
      <p style="font-size:15px;line-height:1.55;margin:0 0 16px;">Dear <b>${safe(name)}</b>,</p>
      <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">
        We are thrilled to inform you that you have been officially promoted from
        <b>${safe(fromRoleLabel)}</b> to <b style="color:#f5c542;">${safe(toRoleLabel)}</b>
        at The Entrepreneurship Network, effective <b>${safe(dateStr)}</b>.
      </p>
      <table width="100%" cellspacing="0" cellpadding="0" style="background:#0c1220;border:1px solid rgba(245,197,66,0.15);border-radius:12px;margin:18px 0;">
        <tr><td style="padding:18px 22px;">
          <div style="color:#f5c542;font-size:11px;letter-spacing:2px;font-weight:700;">YOUR DETAILS</div>
          <div style="margin-top:10px;font-size:14px;line-height:1.85;">
            <b>Name:</b> ${safe(name)}<br>
            <b>Employee ID:</b> <span style="color:#f5c542;">${safe(employeeId)}</span><br>
            <b>New Role:</b> ${safe(toRoleLabel)}<br>
            <b>Domain:</b> ${safe(domain || "—")}<br>
            <b>Promoted On:</b> ${safe(dateStr)}
          </div>
        </td></tr>
      </table>
      <table width="100%" cellspacing="0" cellpadding="0" style="background:rgba(245,197,66,0.06);border:1px dashed rgba(245,197,66,0.35);border-radius:12px;">
        <tr><td style="padding:18px 22px;">
          <div style="color:#f5c542;font-size:11px;letter-spacing:2px;font-weight:700;">YOUR NEW PORTAL ACCESS CREDENTIALS</div>
          <div style="margin-top:10px;font-size:14px;line-height:1.85;">
            <b>Email:</b> ${safe(email)}<br>
            <b>Temporary Password:</b> <code style="background:#0c1220;padding:3px 8px;border-radius:6px;color:#f5c542;font-family:Consolas,monospace;letter-spacing:1px;">${safe(tempPassword)}</code><br>
            <b>Login URL:</b> <a href="${safe(loginUrl)}" style="color:#f5c542;">${safe(loginUrl)}</a>
          </div>
          <p style="margin:14px 0 0;font-size:12px;color:#cdb24a;">
            ⚠️ Please complete your registration using these credentials within <b>48 hours</b>.
            This password expires after first use.
          </p>
        </td></tr>
      </table>
      <p style="font-size:14px;line-height:1.7;margin:20px 0 8px;">
        <b>Steps to activate your account:</b>
      </p>
      <ol style="font-size:14px;line-height:1.7;color:#cdd9ec;margin:0 0 16px 22px;padding:0;">
        <li>Visit the registration portal link above.</li>
        <li>Enter your email and temporary password.</li>
        <li>Set your new permanent password.</li>
        <li>Access your new <b>${safe(toRoleLabel)}</b> dashboard.</li>
      </ol>
      <p style="font-size:14px;margin:24px 0 4px;">Warm regards,</p>
      <p style="font-size:14px;margin:0;"><b>HR Team</b><br/>The Entrepreneurship Network<br/>
        <a href="mailto:ten.hr.contact@gmail.com" style="color:#f5c542;">ten.hr.contact@gmail.com</a>
      </p>
    </td></tr>
    <tr><td style="background:#080d1a;padding:14px 22px;text-align:center;font-size:11px;color:#6a6255;letter-spacing:1px;">
      © The Entrepreneurship Network · Limitless Technologies LLP
    </td></tr>
  </table>
</td></tr></table></body></html>`;
}

async function sendPromotionEmail({ to, name, fromRoleLabel, toRoleLabel, employeeId, domain, tempPassword, host }){
    const dateStr = new Date().toLocaleDateString("en-IN", { day:"numeric", month:"long", year:"numeric" });
    const loginUrl = (host ? host.replace(/\/$/, "") : "") + "/promoted-register.html";
    const html = promotionEmailHtml({ name, fromRoleLabel, toRoleLabel, employeeId, domain, email: to, tempPassword, loginUrl, dateStr });
    const subject = "🎉 Congratulations! You've been promoted at The Entrepreneurship Network";
    try {
        await transporter.sendMail({
            from: "TEN HR <ten.internshipportal@gmail.com>",
            to, subject, html,
            text: `Hello ${name}, you have been promoted to ${toRoleLabel}. Temporary password: ${tempPassword}. Complete registration at ${loginUrl} within 48 hours.`
        });
        try {
            await MailHistory.create({
                recipientEmail: to,
                recipientName: name,
                studentId: null,
                subject,
                mailType: "promotion",
                sentAt: new Date(),
                status: "sent"
            });
        } catch (_) {}
        return { ok: true };
    } catch(e){
        console.log("Promotion email failed:", e.message);
        try {
            await MailHistory.create({
                recipientEmail: to,
                recipientName: name,
                studentId: null,
                subject,
                mailType: "promotion",
                sentAt: new Date(),
                status: "failed",
                errorMessage: e && e.message ? String(e.message) : ""
            });
        } catch (_) {}
        return { ok: false, error: e.message };
    }
}

function isHRAuth(req){
    const auth = req.headers.authorization;
    return auth && auth.indexOf("Bearer hr_") === 0;
}

// ---- HR: promote student -> coordinator ----
app.post("/hr/promote/to-coordinator", async(req,res)=>{
try{
    if(!isHRAuth(req)) return res.status(401).json({ success:false, message:"Unauthorized" });
    const { studentId, employeeId, promotedByHRId } = req.body || {};
    let student = null;
    if(studentId && mongoose.isValidObjectId(studentId)) student = await Student.findById(studentId);
    if(!student && employeeId) student = await Student.findOne({ employeeId });
    if(!student) return res.json({ success:false, message:"Student not found" });
    if(!student.email) return res.json({ success:false, message:"Student has no email on file — cannot promote" });

    // Block if a non-completed promotion already exists for this email
    const open = await Promotion.findOne({ email: student.email.toLowerCase(), registrationCompleted: false });
    if(open && open.tempPasswordExpiresAt > new Date()){
        return res.json({ success:false, message:"An active promotion is already pending for this user. Please wait for them to complete it or for it to expire." });
    }

    const tempPassword = generateSecureTempPassword();
    const hashed = await bcrypt.hash(tempPassword, 10);
    const expiresAt = new Date(Date.now() + 48 * 3600 * 1000);
    const fullName = (student.name || `${student.firstName||""} ${student.lastName||""}`).trim();

    const record = await Promotion.create({
        userId: student._id,
        employeeId: student.employeeId,
        name: fullName,
        email: student.email.toLowerCase(),
        fromRole: "student",
        toRole: "coordinator",
        hashedTempPassword: hashed,
        promotedAt: new Date(),
        promotedByHRId: promotedByHRId || "",
        registrationCompleted: false,
        domain: student.domain || "",
        tempPasswordExpiresAt: expiresAt
    });

    const host = (req.headers["x-forwarded-proto"] || req.protocol) + "://" + req.get("host");
    const mail = await sendPromotionEmail({
        to: student.email, name: fullName, fromRoleLabel: "Intern", toRoleLabel: "Coordinator",
        employeeId: student.employeeId, domain: student.domain, tempPassword, host
    });

    res.json({ success:true, message:`Promotion email sent to ${student.email}`, emailSent: !!mail.ok, promotion:{ _id: record._id } });
}catch(e){ console.log(e); res.status(500).json({ success:false, message:"Failed to promote" }); }
});

// ---- HR: promote coordinator -> HR ----
app.post("/hr/promote/to-hr", async(req,res)=>{
try{
    if(!isHRAuth(req)) return res.status(401).json({ success:false, message:"Unauthorized" });
    const { coordinatorUsername, coordinatorDbId, email, name, domain, employeeId, promotedByHRId } = req.body || {};
    // Resolve effective email (legacy hardcoded coordinators have no email; UI must provide one)
    let resolvedEmail = (email || "").trim().toLowerCase();
    let resolvedName = name || "";
    let resolvedDomain = domain || "";
    let resolvedEmpId = employeeId || "";

    // 1) If a DB-backed coordinator id was provided (from the new /hr/coordinators
    //    endpoint), prefer that — gives us the most reliable identity.
    if(coordinatorDbId && mongoose.isValidObjectId(coordinatorDbId)){
        const dbC = await Coordinator.findById(coordinatorDbId);
        if(dbC){
            resolvedEmail = resolvedEmail || (dbC.email || "");
            resolvedName  = resolvedName || dbC.name;
            resolvedDomain= resolvedDomain || dbC.domain;
            resolvedEmpId = resolvedEmpId || (dbC.employeeId || "");
        }
    }
    // 2) Fallback: legacy hardcoded username, or DB lookup by username/email
    if(coordinatorUsername){
        const legacy = COORDINATORS[coordinatorUsername];
        if(legacy){ resolvedDomain = resolvedDomain || legacy.domain; resolvedName = resolvedName || coordinatorUsername; }
        const dbC = await Coordinator.findOne({ $or:[{ username: coordinatorUsername }, { email: coordinatorUsername.toLowerCase() }] });
        if(dbC){
            resolvedEmail = resolvedEmail || (dbC.email || "");
            resolvedName  = resolvedName || dbC.name;
            resolvedDomain= resolvedDomain || dbC.domain;
            resolvedEmpId = resolvedEmpId || (dbC.employeeId || "");
        }
    }
    if(!resolvedEmail) return res.json({ success:false, message:"Coordinator email is required to send the promotion notification" });
    if(!resolvedName)  resolvedName = coordinatorUsername || resolvedEmail;

    const open = await Promotion.findOne({ email: resolvedEmail, registrationCompleted: false });
    if(open && open.tempPasswordExpiresAt > new Date()){
        return res.json({ success:false, message:"An active promotion is already pending for this user." });
    }

    const tempPassword = generateSecureTempPassword();
    const hashed = await bcrypt.hash(tempPassword, 10);
    const expiresAt = new Date(Date.now() + 48 * 3600 * 1000);

    const record = await Promotion.create({
        employeeId: resolvedEmpId || coordinatorUsername || resolvedEmail,
        name: resolvedName,
        email: resolvedEmail,
        fromRole: "coordinator",
        toRole: "hr",
        hashedTempPassword: hashed,
        promotedAt: new Date(),
        promotedByHRId: promotedByHRId || "",
        registrationCompleted: false,
        domain: resolvedDomain,
        tempPasswordExpiresAt: expiresAt
    });

    const host = (req.headers["x-forwarded-proto"] || req.protocol) + "://" + req.get("host");
    const mail = await sendPromotionEmail({
        to: resolvedEmail, name: resolvedName, fromRoleLabel: "Coordinator", toRoleLabel: "HR Member",
        employeeId: resolvedEmpId || coordinatorUsername || "—", domain: resolvedDomain, tempPassword, host
    });

    res.json({ success:true, message:`Promotion email sent to ${resolvedEmail}`, emailSent: !!mail.ok, promotion:{ _id: record._id } });
}catch(e){ console.log(e); res.status(500).json({ success:false, message:"Failed to promote" }); }
});

// ---- HR: list promotions ----
app.get("/hr/promotions", async(req,res)=>{
try{
    if(!isHRAuth(req)) return res.status(401).json({ success:false, message:"Unauthorized" });
    const list = await Promotion.find().sort({ promotedAt:-1 }).limit(200);
    // Hide hashed passwords
    res.json({ success:true, promotions: list.map(p => ({
        _id:p._id, employeeId:p.employeeId, name:p.name, email:p.email,
        fromRole:p.fromRole, toRole:p.toRole, promotedAt:p.promotedAt,
        registrationCompleted:p.registrationCompleted, completedAt:p.completedAt,
        domain:p.domain, tempPasswordExpiresAt:p.tempPasswordExpiresAt,
        promotedByHRId:p.promotedByHRId
    })) });
}catch(e){ console.log(e); res.status(500).json({ success:false }); }
});

// ---- Promoted user: verify temp credentials ----
app.post("/promoted/verify", async(req,res)=>{
try{
    const { email, tempPassword } = req.body || {};
    if(!email || !tempPassword) return res.json({ valid:false, message:"Email and temporary password required" });
    const rec = await Promotion.findOne({ email: email.toLowerCase(), registrationCompleted: false });
    if(!rec) return res.json({ valid:false, message:"No active promotion found for this email" });
    if(!rec.hashedTempPassword) return res.json({ valid:false, message:"This promotion link has been used already" });
    if(rec.tempPasswordExpiresAt < new Date()) return res.json({ valid:false, message:"This temporary password has expired" });
    const ok = await bcrypt.compare(tempPassword, rec.hashedTempPassword);
    if(!ok) return res.json({ valid:false, message:"Invalid temporary password" });
    res.json({ valid:true, name:rec.name, employeeId:rec.employeeId, newRole:rec.toRole, domain:rec.domain });
}catch(e){ console.log(e); res.status(500).json({ valid:false, message:"Server error" }); }
});

// ---- Promoted user: complete registration ----
app.post("/promoted/register", async(req,res)=>{
try{
    const { email, tempPassword, newPassword } = req.body || {};
    if(!email || !tempPassword || !newPassword) return res.json({ success:false, message:"All fields required" });
    if(String(newPassword).length < 8) return res.json({ success:false, message:"New password must be at least 8 characters" });

    const rec = await Promotion.findOne({ email: email.toLowerCase(), registrationCompleted: false });
    if(!rec) return res.json({ success:false, message:"No active promotion found" });
    if(!rec.hashedTempPassword) return res.json({ success:false, message:"This promotion link has been used already" });
    if(rec.tempPasswordExpiresAt < new Date()) return res.json({ success:false, message:"This temporary password has expired" });
    const ok = await bcrypt.compare(tempPassword, rec.hashedTempPassword);
    if(!ok) return res.json({ success:false, message:"Invalid temporary password" });

    const hashedNew = await bcrypt.hash(newPassword, 10);
    let redirect = "/index.html";

    if(rec.toRole === "coordinator"){
        // Upsert coordinator account
        const existing = await Coordinator.findOne({ email: rec.email });
        if(existing){
            existing.password = hashedNew; existing.name = rec.name; existing.domain = rec.domain || existing.domain;
            existing.employeeId = rec.employeeId; existing.promotedFrom = rec.fromRole;
            await existing.save();
        } else {
            await Coordinator.create({
                username: rec.email, email: rec.email, password: hashedNew,
                name: rec.name, domain: rec.domain || "", employeeId: rec.employeeId,
                promotedFrom: rec.fromRole
            });
        }
        redirect = "/coordinator-login.html";
    } else if(rec.toRole === "hr"){
        const existing = await HR.findOne({ email: rec.email });
        if(existing){
            existing.password = hashedNew; existing.name = rec.name;
            existing.employeeId = rec.employeeId; existing.promotedFrom = rec.fromRole;
            await existing.save();
        } else {
            await HR.create({
                username: rec.email, email: rec.email, password: hashedNew,
                name: rec.name, employeeId: rec.employeeId, promotedFrom: rec.fromRole
            });
        }
        redirect = "/hr-login";
    }

    rec.registrationCompleted = true;
    rec.completedAt = new Date();
    rec.hashedTempPassword = null;   // invalidate
    await rec.save();

    res.json({ success:true, message:"Registration complete! Welcome to your new role.", redirect, role:rec.toRole });
}catch(e){ console.log(e); res.status(500).json({ success:false, message:"Server error" }); }
});

// ==================================================================
// =========== STREAK + MILESTONES + BADGES + LEADERBOARD ===========
// ==================================================================

// Catalog of badges. Each entry is { id, name, icon, description, requirement }
// where `requirement` is rendered in the UI under the locked badge tile.
const BADGE_CATALOG = [
    { id:"first_step",         name:"First Step",            icon:"👣", description:"Mark your first ever attendance",        requirement:"Mark attendance once" },
    { id:"week_warrior",       name:"Week Warrior",          icon:"⚡", description:"7 consecutive days of attendance",        requirement:"7-day streak" },
    { id:"consistent",         name:"Consistent",            icon:"🎯", description:"30 days total attendance marked",         requirement:"30 days marked" },
    { id:"attendance_champion",name:"Attendance Champion",   icon:"🏆", description:"Above 90% combined attendance",           requirement:"≥ 90% attendance" },
    { id:"first_task",         name:"First Task",            icon:"✅", description:"Submit your first task",                  requirement:"1 submission" },
    { id:"quick_learner",      name:"Quick Learner",         icon:"📚", description:"5 tasks approved",                        requirement:"5 approvals" },
    { id:"task_master",        name:"Task Master",           icon:"💪", description:"10 tasks approved",                       requirement:"10 approvals" },
    { id:"perfectionist",      name:"Perfectionist",         icon:"⭐", description:"5 approved with no rejections",           requirement:"5 approved, 0 rejected" },
    { id:"rising_star",        name:"Rising Star",           icon:"🌟", description:"Performance score above 75",              requirement:"Score ≥ 75" },
    { id:"outstanding",        name:"Outstanding",           icon:"🏅", description:"Performance score above 90",              requirement:"Score ≥ 90" },
    { id:"top_performer",      name:"Top Performer",         icon:"👑", description:"Rank 1 in your domain leaderboard",       requirement:"Domain rank #1" },
    { id:"day_one",            name:"Day 1",                 icon:"🎉", description:"Complete your first day",                 requirement:"Mark attendance & submit task on day 1" },
    { id:"halfway_there",      name:"Halfway There",         icon:"🎯", description:"Complete 50% of your internship",         requirement:"50% of tenure elapsed" },
    { id:"graduate",           name:"Graduate",              icon:"🎓", description:"Complete your full internship tenure",    requirement:"100% of tenure elapsed" }
];
const BADGE_CATALOG_BY_ID = Object.fromEntries(BADGE_CATALOG.map(b => [b.id, b]));
// Major badges trigger a notification (and could be email-extended later).
const MAJOR_BADGE_IDS = new Set(["outstanding","top_performer","graduate","attendance_champion"]);

async function awardBadgeIfNew(student, badgeId){
    const def = BADGE_CATALOG_BY_ID[badgeId];
    if(!def || !student) return null;
    try{
        const award = await BadgeAward.create({
            studentId: student._id,
            employeeId: student.employeeId,
            badgeId: def.id,
            badgeName: def.name,
            badgeIcon: def.icon,
            awardedAt: new Date()
        });
        // In-app notification — uses the existing Notification system the student
        // dashboard already polls, so the popup surfaces without extra wiring.
        try{
            const notif = new Notification({
                title: `🎉 New Badge Earned: ${def.name} ${def.icon}`,
                message: def.description,
                type: MAJOR_BADGE_IDS.has(def.id) ? "success" : "info",
                from: "System",
                targetType: "student",
                targetEmployeeId: student.employeeId,
                targetDomain: student.domain || ""
            });
            await notif.save();
            broadcastNotification(student.domain, student.employeeId, notif);
        }catch(_){}
        return award;
    }catch(e){
        if(e.code === 11000) return null;        // already awarded — ignore
        console.log("awardBadgeIfNew error:", e.message);
        return null;
    }
}

// Recompute everything that could grant a badge for this student. Called from
// /attendance/self, /submit-task, and /update-status. Idempotent — already-
// owned badges are skipped by the unique index.
async function recomputeBadgesFor(employeeId){
    try{
        const student = await Student.findOne({ employeeId });
        if(!student) return;
        const submissions = await Submission.find({ employeeId });
        const totalSubmitted = submissions.length;
        const approved = submissions.filter(s => s.status === "Approved").length;
        const rejected = submissions.filter(s => s.status === "Rejected").length;
        const attendance = await Attendance.find({ employeeId });
        const totalMarked = new Set(attendance.map(a => a.dateKey)).size;
        const stats = await computeAttendanceStats(employeeId, student.joiningDate);
        const perf = await calculatePerformance(student);

        // Attendance
        if(totalMarked >= 1)                                          await awardBadgeIfNew(student, "first_step");
        if((student.bestStreak || 0) >= 7)                            await awardBadgeIfNew(student, "week_warrior");
        if(totalMarked >= 30)                                         await awardBadgeIfNew(student, "consistent");
        if((stats.combinedPct || 0) >= 90)                            await awardBadgeIfNew(student, "attendance_champion");

        // Tasks
        if(totalSubmitted >= 1)                                       await awardBadgeIfNew(student, "first_task");
        if(approved >= 5)                                             await awardBadgeIfNew(student, "quick_learner");
        if(approved >= 10)                                            await awardBadgeIfNew(student, "task_master");
        if(approved >= 5 && rejected === 0)                           await awardBadgeIfNew(student, "perfectionist");

        // Performance
        if(perf && perf.score >= 75)                                  await awardBadgeIfNew(student, "rising_star");
        if(perf && perf.score >= 90)                                  await awardBadgeIfNew(student, "outstanding");

        // Day 1: marked attendance AND submitted a task on the joining date
        if(student.joiningDate){
            const jKey = toDateKey(new Date(student.joiningDate));
            const attendedDay1 = attendance.some(a => a.dateKey === jKey);
            const submittedDay1 = submissions.some(s => toDateKey(new Date(s.submittedAt)) === jKey);
            if(attendedDay1 && submittedDay1)                         await awardBadgeIfNew(student, "day_one");
        }

        // Tenure-based milestones
        const tenureDays = (student.tenure || "").includes("6") ? 180
                         : (student.tenure || "").includes("3") ? 90
                         : 30;
        if(student.joiningDate){
            const j = new Date(student.joiningDate);
            const elapsed = (new Date() - j) / (1000*60*60*24);
            if(elapsed >= tenureDays * 0.5)                           await awardBadgeIfNew(student, "halfway_there");
            if(elapsed >= tenureDays)                                 await awardBadgeIfNew(student, "graduate");
        }

        // Top performer — only if the student is rank 1 in their domain
        if(student.domain){
            const lb = await buildDomainLeaderboard(student.domain, 1);
            if(lb.length && lb[0].employeeId === employeeId)          await awardBadgeIfNew(student, "top_performer");
        }
    }catch(e){ console.log("recomputeBadgesFor error:", e.message); }
}

// Update streak + milestones on a self-attendance mark. Called inline by
// /attendance/self after the record is saved.
async function bumpStreakAndMilestones(student){
    try{
        const today = new Date(); today.setHours(0,0,0,0);
        const last = student.lastAttendanceDate ? new Date(student.lastAttendanceDate) : null;
        if(last) last.setHours(0,0,0,0);

        if(!last){
            student.currentStreak = 1;
        } else {
            const diffDays = Math.round((today - last) / (24*3600*1000));
            if(diffDays === 0)         student.currentStreak = student.currentStreak || 1;
            else if(diffDays === 1)    student.currentStreak = (student.currentStreak || 0) + 1;
            else                       student.currentStreak = 1;
        }
        student.bestStreak = Math.max(student.bestStreak || 0, student.currentStreak || 0);
        student.lastAttendanceDate = today;
        student.milestones = student.milestones || {};
        if(!student.milestones.firstAttendance) student.milestones.firstAttendance = today;

        // Attendance-percentage milestones
        const stats = await computeAttendanceStats(student.employeeId, student.joiningDate);
        if((stats.combinedPct || 0) >= 50 && !student.milestones.reached50Attendance) student.milestones.reached50Attendance = today;
        if((stats.combinedPct || 0) >= 75 && !student.milestones.reached75Attendance) student.milestones.reached75Attendance = today;

        // Internship completed: today >= joining + tenureDays
        if(student.joiningDate && !student.milestones.internshipCompleted){
            const tenureDays = (student.tenure || "").includes("6") ? 180
                             : (student.tenure || "").includes("3") ? 90
                             : 30;
            const j = new Date(student.joiningDate);
            const end = new Date(j); end.setDate(end.getDate() + tenureDays);
            if(today >= end) student.milestones.internshipCompleted = today;
        }

        await student.save();
    }catch(e){ console.log("bumpStreakAndMilestones error:", e.message); }
}

// Async-safe milestone setter — mark a single milestone with a date if not set.
async function setMilestone(employeeId, key, when){
    try{
        const s = await Student.findOne({ employeeId });
        if(!s) return;
        s.milestones = s.milestones || {};
        if(!s.milestones[key]){
            s.milestones[key] = when || new Date();
            await s.save();
        }
    }catch(_){}
}

// Eligibility: combined attendance >= 75% AND ≥ 5 approved tasks.
async function checkCertificateEligibility(employeeId){
    try{
        const s = await Student.findOne({ employeeId });
        if(!s) return;
        const stats = await computeAttendanceStats(employeeId, s.joiningDate);
        const approved = await Submission.countDocuments({ employeeId, status:"Approved" });
        if((stats.combinedPct || 0) >= 75 && approved >= 5){
            await setMilestone(employeeId, "certificateEligible");
        }
    }catch(_){}
}

// ---- Build leaderboard entries for a domain or globally ----
async function _buildLeaderboard(filter, limit){
    const students = await Student.find(filter || {}).sort({ createdAt: 1 });
    const rows = [];
    for(const s of students){
        const stats = await computeAttendanceStats(s.employeeId, s.joiningDate);
        const perf = await calculatePerformance(s);
        const approved = await Submission.countDocuments({ employeeId: s.employeeId, status:"Approved" });
        rows.push({
            employeeId: s.employeeId,
            name: (s.name || ((s.firstName||"")+" "+(s.lastName||""))).trim() || s.employeeId,
            domain: s.domain || "",
            score: perf ? perf.score : 0,
            grade: perf ? perf.grade : "—",
            attendancePct: stats.combinedPct || 0,
            approved,
            currentStreak: s.currentStreak || 0
        });
    }
    rows.sort((a,b) => b.score - a.score
                    || b.attendancePct - a.attendancePct
                    || b.approved - a.approved);
    return rows.slice(0, limit).map((r, i) => Object.assign({ rank: i+1 }, r));
}
async function buildDomainLeaderboard(domain, limit=10){ return _buildLeaderboard({ domain }, limit); }
async function buildOverallLeaderboard(limit=20)        { return _buildLeaderboard({}, limit); }

// ---- API ----

// Feature 5 — leaderboards
app.get("/leaderboard/domain/:domain", async(req,res)=>{
    try{
        const domain = decodeURIComponent(req.params.domain);
        const rows = await buildDomainLeaderboard(domain, 10);
        res.json({ success:true, leaderboard: rows, domain });
    }catch(e){ console.log(e); res.status(500).json({ success:false, leaderboard:[] }); }
});
app.get("/leaderboard/overall", async(req,res)=>{
    try{
        const rows = await buildOverallLeaderboard(20);
        res.json({ success:true, leaderboard: rows });
    }catch(e){ console.log(e); res.status(500).json({ success:false, leaderboard:[] }); }
});

// Feature 6 — badges
app.get("/badges/catalog", (req,res) => {
    res.json({ success:true, catalog: BADGE_CATALOG });
});
app.get("/badges/student/:employeeId", async(req,res)=>{
    try{
        const employeeId = decodeURIComponent(req.params.employeeId);
        const earned = await BadgeAward.find({ employeeId }).sort({ awardedAt: 1 });
        const earnedIds = new Set(earned.map(b => b.badgeId));
        const out = BADGE_CATALOG.map(b => {
            const owned = earnedIds.has(b.id);
            const e = owned ? earned.find(x => x.badgeId === b.id) : null;
            return { ...b, earned: owned, awardedAt: e ? e.awardedAt : null };
        });
        res.json({ success:true, badges: out, earnedCount: earned.length, totalCount: BADGE_CATALOG.length });
    }catch(e){ console.log(e); res.status(500).json({ success:false, badges:[] }); }
});

// Feature 7 — streak
app.get("/students/:employeeId/streak", async(req,res)=>{
    try{
        const s = await Student.findOne({ employeeId: decodeURIComponent(req.params.employeeId) });
        if(!s) return res.status(404).json({ success:false });
        res.json({
            success:true,
            currentStreak: s.currentStreak || 0,
            bestStreak: s.bestStreak || 0,
            lastAttendanceDate: s.lastAttendanceDate
        });
    }catch(e){ console.log(e); res.status(500).json({ success:false }); }
});

// Feature 11 — timeline (returns the milestones object)
app.get("/students/:employeeId/timeline", async(req,res)=>{
    try{
        const s = await Student.findOne({ employeeId: decodeURIComponent(req.params.employeeId) });
        if(!s) return res.status(404).json({ success:false });
        const tenureDays = (s.tenure || "").includes("6") ? 180
                         : (s.tenure || "").includes("3") ? 90
                         : 30;
        let endDate = null;
        if(s.joiningDate){
            const j = new Date(s.joiningDate);
            const end = new Date(j); end.setDate(end.getDate() + tenureDays);
            endDate = end.toISOString().slice(0,10);
        }
        res.json({
            success:true,
            joiningDate: s.joiningDate || null,
            tenure: s.tenure || "",
            endDate,
            registrationDate: s.createdAt,
            milestones: s.milestones || {},
            certificateApprovedByCoordinator: !!s.certificateApprovedByCoordinator,
            certificateApprovedByHR: !!s.certificateApprovedByHR
        });
    }catch(e){ console.log(e); res.status(500).json({ success:false }); }
});

// ==================================================================
// =========== FORGOT PASSWORD (Feature 9) — all 3 roles ============
// ==================================================================
function passwordResetEmailHtml({ name, role, host, token }){
    const safe = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
    const base = (host ? host.replace(/\/$/, "") : "");
    const link = base + "/reset-password.html?token=" + encodeURIComponent(token) + "&role=" + encodeURIComponent(role);
    return `<!doctype html><html><body style="margin:0;background:#0c1220;font-family:Segoe UI,Arial,sans-serif;color:#f0eee8;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0c1220;padding:32px 0;"><tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="background:#0e1628;border:1px solid rgba(245,197,66,0.18);border-radius:18px;overflow:hidden;">
    <tr><td style="background:linear-gradient(135deg,#1a1208,#3a2a08);padding:26px 30px;text-align:center;">
      <div style="font-size:13px;letter-spacing:6px;color:#f5c542;font-weight:700;">THE ENTREPRENEURSHIP NETWORK</div>
      <div style="font-size:22px;color:#fff7d6;font-weight:800;margin-top:6px;">🔐 Password Reset Request</div>
    </td></tr>
    <tr><td style="padding:28px 32px;">
      <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">Dear <b>${safe(name || "user")}</b>,</p>
      <p style="font-size:14px;line-height:1.65;margin:0 0 18px;">We received a request to reset your <b>${safe(role)}</b> account password. Click the button below to set a new one:</p>
      <p style="text-align:center;margin:24px 0;">
        <a href="${safe(link)}" style="display:inline-block;background:linear-gradient(135deg,#f5c542,#c9a227);color:#0c1220;padding:14px 32px;border-radius:10px;font-weight:800;text-decoration:none;letter-spacing:.5px;">Reset My Password</a>
      </p>
      <p style="font-size:12px;color:#9aa4bf;line-height:1.5;margin:0 0 4px;">⏱ This link expires in 1 hour.</p>
      <p style="font-size:12px;color:#9aa4bf;line-height:1.5;margin:0 0 16px;">If you did not request this, you can safely ignore this email.</p>
      <p style="font-size:12px;color:#5a7299;word-break:break-all;">Direct URL: ${safe(link)}</p>
      <p style="font-size:14px;margin:22px 0 4px;">— HR Team, The Entrepreneurship Network</p>
    </td></tr>
    <tr><td style="background:#080d1a;padding:14px 22px;text-align:center;font-size:11px;color:#6a6255;letter-spacing:1px;">
      © The Entrepreneurship Network · Limitless Technologies LLP
    </td></tr>
  </table>
</td></tr></table></body></html>`;
}

async function _findUserByRoleEmail(role, email){
    const e = String(email || "").trim().toLowerCase();
    if(!e) return null;
    if(role === "student"){
        // Use the most-recently-created Student doc with this email.
        const list = await Student.find({ email: e }).sort({ createdAt:-1 });
        return list[0] || null;
    }
    if(role === "coordinator"){
        return await Coordinator.findOne({ email: e });
    }
    if(role === "hr"){
        return await HR.findOne({ email: e });
    }
    return null;
}

app.post("/auth/forgot-password", async(req,res)=>{
    try{
        const { email, role } = req.body || {};
        const validRoles = ["student","coordinator","hr"];
        if(!validRoles.includes(role)) return res.json({ success:false, message:"Invalid role" });

        const user = await _findUserByRoleEmail(role, email);
        // To avoid user enumeration, we always respond success — but only
        // actually generate + send the email if we found a matching account.
        if(user){
            const token = crypto.randomBytes(32).toString("hex");
            const expiry = new Date(Date.now() + 60*60*1000);
            user.passwordResetToken = token;
            user.passwordResetExpiry = expiry;
            await user.save();
            try{
                const host = (req.headers["x-forwarded-proto"] || req.protocol) + "://" + req.get("host");
                const html = passwordResetEmailHtml({
                    name: user.name || user.firstName || user.email || "user",
                    role, host, token
                });
                let mailStatus = "sent";
                let mailError = "";
                try {
                    await transporter.sendMail({
                        from:"TEN HR <ten.internshipportal@gmail.com>",
                        to: user.email,
                        subject:"🔐 Password Reset Request — TEN",
                        html,
                        text: `A password reset was requested. Open this link to reset (expires in 1 hour):\n\n${host}/reset-password.html?token=${token}&role=${role}`
                    });
                } catch (err) {
                    mailStatus = "failed";
                    mailError = err && err.message ? String(err.message) : "";
                } finally {
                    try {
                        await MailHistory.create({
                            recipientEmail: user.email,
                            recipientName: user.name || user.firstName || user.email || "user",
                            studentId: role === "student" ? user._id : null,
                            subject: "🔐 Password Reset Request — TEN",
                            mailType: "password_reset",
                            sentAt: new Date(),
                            status: mailStatus,
                            errorMessage: mailError
                        });
                    } catch (_) {}
                }
            }catch(e){ console.log("forgot-password mail error:", e && e.message); }
        }
        res.json({ success:true, message:"If that account exists, a reset link has been sent to its email." });
    }catch(e){ console.log(e); res.status(500).json({ success:false, message:"Server error" }); }
});

app.post("/auth/reset-password", async(req,res)=>{
    try{
        const { token, role, newPassword } = req.body || {};
        if(!token || !role || !newPassword) return res.json({ success:false, message:"Token, role and new password are required" });
        if(String(newPassword).length < 8) return res.json({ success:false, message:"Password must be at least 8 characters" });
        const validRoles = ["student","coordinator","hr"];
        if(!validRoles.includes(role)) return res.json({ success:false, message:"Invalid role" });

        const Models = { student: Student, coordinator: Coordinator, hr: HR };
        const Model = Models[role];
        const user = await Model.findOne({ passwordResetToken: token });
        if(!user) return res.json({ success:false, message:"Invalid or already-used reset link" });
        if(!user.passwordResetExpiry || user.passwordResetExpiry < new Date()){
            return res.json({ success:false, message:"This reset link has expired. Please request a new one." });
        }

        // For students the password is currently stored in plaintext (existing
        // behaviour). For coord/HR the DB-backed accounts use bcrypt.
        if(role === "student"){
            user.password = newPassword;
        } else {
            user.password = await bcrypt.hash(newPassword, 10);
        }
        user.passwordResetToken = null;
        user.passwordResetExpiry = null;
        await user.save();
        res.json({ success:true, message:"Password updated! Please log in with your new password." });
    }catch(e){ console.log(e); res.status(500).json({ success:false, message:"Server error" }); }
});

// ==================================================================
// ============== STUDENT: coordinator details (Feature 7) ==========
// ==================================================================
// Returns the coordinator assigned to a domain, looking first at any
// promoted (DB-backed) coordinator, then falling back to the legacy
// hardcoded COORDINATORS map.
app.get("/student/coordinator-details", async(req,res)=>{
try{
    const domain = (req.query && req.query.domain) || "";
    if(!domain) return res.json({ success:false, message:"Domain required" });

    const dbC = await Coordinator.findOne({ domain });
    if(dbC){
        return res.json({ success:true, assigned:true, coordinator:{
            name: dbC.name || dbC.username || dbC.email || "Coordinator",
            email: dbC.email || "",
            whatsapp: dbC.phone || "",
            domain: dbC.domain,
            source: "db"
        }});
    }
    // Legacy hardcoded
    const entry = Object.entries(COORDINATORS).find(([_, v]) => (v.domain || "") === domain);
    if(entry){
        const [username, info] = entry;
        return res.json({ success:true, assigned:true, coordinator:{
            name: username, email: "", whatsapp: "", domain: info.domain, source: "legacy"
        }});
    }
    res.json({ success:true, assigned:false });
}catch(e){ console.log(e); res.status(500).json({ success:false }); }
});

// ==================================================================
// ============ Multi-domain (Feature 1): switch domain =============
// ==================================================================
// Returns the linked Student doc for `targetDomain` for the current student
// (verified by the `email` body param to make sure they own it). The frontend
// updates sessionStorage and reloads — no new password required.
app.post("/student/switch-domain", async(req,res)=>{
try{
    const { email, targetDomain } = req.body || {};
    if(!email || !targetDomain) return res.json({ success:false, message:"email + targetDomain required" });
    const target = await Student.findOne({ email: String(email).toLowerCase(), domain: targetDomain });
    if(!target) return res.json({ success:false, message:"You are not registered in that domain" });
    res.json({ success:true, student:{
        name: (target.firstName||"") + " " + (target.lastName||""),
        firstName: target.firstName, lastName: target.lastName,
        employeeId: target.employeeId, email: target.email,
        domain: target.domain, tenure: target.tenure, joiningDate: target.joiningDate,
        college: getStudentCollege(target),
        collegeName: getStudentCollege(target)
    }});
}catch(e){ console.log(e); res.status(500).json({ success:false }); }
});

// ==================================================================
// ============= COORDINATOR: bulk attendance (Feature 2) ===========
// ==================================================================
app.post("/attendance/coordinator/bulk", async(req,res)=>{
try{
    const { domain, employeeIds, date, status, coordinatorId, source } = req.body || {};
    if(!domain || !Array.isArray(employeeIds) || employeeIds.length === 0 || !date)
        return res.json({ success:false, message:"domain, employeeIds[] and date are required" });
    const st = (status === "Absent") ? "Absent" : "Present";
    const d = new Date(date);
    if(isNaN(d.getTime())) return res.json({ success:false, message:"Invalid date" });
    const dateKey = toDateKey(d);

    const students = await Student.find({ domain, employeeId: { $in: employeeIds } });
    let updated = 0, created = 0, failed = 0;
    for(const s of students){
        try{
            let att = await Attendance.findOne({ employeeId: s.employeeId, dateKey, markedBy:"coordinator" });
            if(att){
                att.status = st;
                att.coordinatorId = coordinatorId || att.coordinatorId;
                att.date = d;
                if(source) att.source = source;
                await att.save();
                updated++;
            } else {
                att = new Attendance({
                    studentId: s._id, employeeId: s.employeeId, domain: s.domain,
                    date: d, dateKey, status: st, markedBy:"coordinator",
                    coordinatorId: coordinatorId || "",
                    source: source || "bulk"
                });
                await att.save();
                created++;
            }
            // Notify the student (re-uses the existing pattern)
            try{
                const notif = new Notification({
                    title: "Class attendance marked",
                    message: `Coordinator marked your class attendance for ${dateKey}: ${st}.`,
                    type: st === "Present" ? "success" : "warning",
                    from: "Coordinator",
                    targetType: "student", targetEmployeeId: s.employeeId, targetDomain: s.domain
                });
                await notif.save();
                broadcastNotification(s.domain, s.employeeId, notif);
            }catch(_){}
        }catch(e){ failed++; }
    }
    res.json({ success:true, created, updated, failed, total: students.length });
}catch(e){ console.log(e); res.status(500).json({ success:false }); }
});

// ==================================================================
// =========== STUDENT: bulk delete reviewed submissions ============
// ==================================================================
app.post("/submissions/bulk-delete", async(req,res)=>{
try{
    const { ids, employeeId } = req.body || {};
    if(!Array.isArray(ids) || !ids.length || !employeeId)
        return res.json({ success:false, message:"ids[] and employeeId required" });

    const subs = await Submission.find({ _id: { $in: ids }, employeeId });
    let deleted = 0, skipped = 0;
    for(const s of subs){
        if(s.status !== "Approved" && s.status !== "Rejected"){ skipped++; continue; }
        // Best-effort file cleanup (matches the single-delete route)
        [s.image, s.pdf].forEach(p => {
            if(!p) return;
            try{
                const local = String(p).replace(/^\//, "");
                if(local && fs.existsSync(local)) fs.unlinkSync(local);
            }catch(_){}
        });
        await Submission.findByIdAndDelete(s._id);
        deleted++;
    }
    res.json({ success:true, deleted, skipped });
}catch(e){ console.log(e); res.status(500).json({ success:false }); }
});

// ==================================================================
// =========== COORDINATOR: bulk approve / reject submissions =======
// ==================================================================
app.post("/submissions/bulk-status", async(req,res)=>{
try{
    const { ids, status, feedback } = req.body || {};
    if(!Array.isArray(ids) || !ids.length || !status)
        return res.json({ success:false, message:"ids[] and status required" });
    if(status !== "Approved" && status !== "Rejected")
        return res.json({ success:false, message:"status must be Approved or Rejected" });

    const subs = await Submission.find({ _id: { $in: ids } });
    let updated = 0, skipped = 0;
    for(const sub of subs){
        if(sub.reviewedOnce){ skipped++; continue; }      // honor single-review lock
        const performance = status === "Approved" ? "A+" : "B";
        await Submission.findByIdAndUpdate(sub._id, {
            status, feedback: feedback || (status === "Approved" ? "Approved" : "Rejected"),
            reviewedOnce: true,
            attendanceAllowed: status === "Approved",
            performance,
            tasksCompleted: status === "Approved" ? 1 : 0
        });
        try{
            const notif = new Notification({
                title: `Task ${status}`,
                message: `Your task submission has been ${status.toLowerCase()}.`,
                type: status === "Approved" ? "success" : "warning",
                from: "Coordinator",
                targetType: "student", targetEmployeeId: sub.employeeId, targetDomain: sub.domain
            });
            await notif.save();
            broadcastNotification(sub.domain, sub.employeeId, notif);
        }catch(_){}
        if(status === "Approved") await setMilestone(sub.employeeId, "firstTaskApproved");
        await checkCertificateEligibility(sub.employeeId);
        await recomputeBadgesFor(sub.employeeId);
        updated++;
    }
    res.json({ success:true, updated, skipped });
}catch(e){ console.log(e); res.status(500).json({ success:false }); }
});

// ==================================================================
// =================== QR CODE ATTENDANCE (Feature 3) ===============
// ==================================================================
// One QR per (domain, coordinatorId). The QR encodes a URL pointing at
// /qr-attendance.html, which collects a student's credentials and POSTs
// them to /qr-attendance/mark below.
app.get("/coordinator/qr/:coordinatorId", async(req,res)=>{
try{
    const coordinatorId = decodeURIComponent(req.params.coordinatorId);
    const domain = (req.query && req.query.domain) || "";
    if(!domain) return res.status(400).json({ success:false, message:"domain required" });
    const host = (req.headers["x-forwarded-proto"] || req.protocol) + "://" + req.get("host");
    const url  = host + "/qr-attendance.html?domain=" + encodeURIComponent(domain) + "&coordinatorId=" + encodeURIComponent(coordinatorId);
    const dataUrl = await QRCode.toDataURL(url, { errorCorrectionLevel: "M", margin: 2, width: 360, color: { dark:"#0c1220", light:"#ffffff" } });
    res.json({ success:true, url, dataUrl });
}catch(e){ console.log(e); res.status(500).json({ success:false, message:"Failed to generate QR" }); }
});

// Verify-and-mark from the QR scan landing page.
app.post("/qr-attendance/mark", async(req,res)=>{
try{
    const { employeeId, password, domain, coordinatorId } = req.body || {};
    if(!employeeId || !password || !domain)
        return res.json({ success:false, message:"Employee ID, password and domain are required" });

    const student = await Student.findOne({ employeeId, password });
    if(!student) return res.json({ success:false, message:"Invalid Employee ID or Password" });
    if((student.domain || "") !== domain)
        return res.json({ success:false, message:"This QR is for a different domain" });

    const today = new Date();
    const dateKey = toDateKey(today);
    const existing = await Attendance.findOne({ employeeId, dateKey, markedBy:"coordinator" });
    if(existing){
        return res.json({ success:false, alreadyMarked:true,
            message:"Attendance already marked for today ✅" });
    }

    const att = new Attendance({
        studentId: student._id, employeeId, domain: student.domain,
        date: today, dateKey, status:"Present", markedBy:"coordinator",
        coordinatorId: coordinatorId || "qr",
        source: "qr"
    });
    await att.save();

    // Notify the student
    try{
        const notif = new Notification({
            title: "Class attendance marked via QR",
            message: `Your class attendance for ${dateKey} has been marked via QR scan.`,
            type: "success", from: "Coordinator",
            targetType: "student", targetEmployeeId: student.employeeId, targetDomain: student.domain
        });
        await notif.save();
        broadcastNotification(student.domain, student.employeeId, notif);
    }catch(_){}

    res.json({ success:true, message:`Attendance marked successfully for ${dateKey}. Have a great day!` });
}catch(e){ console.log(e); res.status(500).json({ success:false, message:"Server error" }); }
});

// ==================================================================
// ===================== CHAT BLOCK (Feature 8) =====================
// ==================================================================
// Coordinator: can block students in their own domain chat.
// HR: can block students in the general chat, and coordinators in
// general / hr_coordinators chats.
function _blockerCanActIn(actor, targetRole, room){
    if(actor.role === "coordinator"){
        if(targetRole !== "student") return false;
        return room === ("domain_" + (actor.domain || ""));
    }
    if(actor.role === "hr"){
        if(targetRole === "hr") return false;     // HR can't block another HR
        if(targetRole === "student")     return room === "general";
        if(targetRole === "coordinator") return room === "general" || room === "hr_coordinators";
        return false;
    }
    return false;
}
async function _identityFromAuth(body){
    return await verifyChatIdentity({
        role: body && body.role,
        employeeId: body && body.employeeId,
        username: body && body.username
    });
}

app.post("/chat/block", async(req,res)=>{
    try{
        const actor = await _identityFromAuth(req.body);
        if(!actor) return res.status(401).json({ success:false, message:"Unauthorized" });
        const { chatRoom, blockedUser, blockedUserRole } = req.body || {};
        if(!chatRoom || !blockedUser || !blockedUserRole)
            return res.json({ success:false, message:"chatRoom, blockedUser and blockedUserRole are required" });
        if(!_blockerCanActIn(actor, blockedUserRole, chatRoom))
            return res.status(403).json({ success:false, message:"You can't block this user in this room" });
        await BlockList.findOneAndUpdate(
            { chatRoom, blockedUser },
            { chatRoom, blockedUser, blockedUserRole, blockedBy: actor.id, blockedByRole: actor.role, blockedAt: new Date() },
            { upsert: true, new: true }
        );
        res.json({ success:true, message:"User blocked in this chat" });
    }catch(e){ console.log(e); res.status(500).json({ success:false }); }
});

app.post("/chat/unblock", async(req,res)=>{
    try{
        const actor = await _identityFromAuth(req.body);
        if(!actor) return res.status(401).json({ success:false, message:"Unauthorized" });
        const { chatRoom, blockedUser } = req.body || {};
        const existing = await BlockList.findOne({ chatRoom, blockedUser });
        if(!existing) return res.json({ success:true, message:"User was not blocked" });
        if(existing.blockedBy !== actor.id && actor.role !== "hr")
            return res.status(403).json({ success:false, message:"Only the blocker (or HR) can unblock" });
        await BlockList.findOneAndDelete({ chatRoom, blockedUser });
        res.json({ success:true, message:"User unblocked" });
    }catch(e){ console.log(e); res.status(500).json({ success:false }); }
});

app.get("/chat/blocked-list", async(req,res)=>{
    try{
        const actor = await _identityFromAuth(req.query);
        if(!actor) return res.status(401).json({ success:false, message:"Unauthorized" });
        const filter = actor.role === "hr" ? {} : { blockedBy: actor.id };
        const list = await BlockList.find(filter).sort({ blockedAt: -1 });
        res.json({ success:true, blocked: list });
    }catch(e){ console.log(e); res.status(500).json({ success:false }); }
});

// ==================================================================
// ============ F4 — PDF UPLOAD FOR TEST QUESTIONS ==================
// ==================================================================
// Coordinator uploads a PDF in this format:
//   Q1. What is X?
//   A) option1
//   B) option2
//   C) option3
//   D) option4
//   Answer: B
// We parse it server-side and return a JSON array the dashboard can preview
// and import. We do NOT save anything here — coordinator reviews + imports
// via the existing /save-test-questions flow so existing logic is untouched.

// Lazy-load pdf-parse so the server boots even if the package is missing.
let _pdfParse;
function getPdfParse(){
    if(!_pdfParse){ _pdfParse = require("pdf-parse"); }
    return _pdfParse;
}

function parsePdfQuestionText(rawText){
    if(!rawText) return [];
    // Normalize line endings; collapse "Q12.\nWhat is X?" into a single line.
    const text = String(rawText).replace(/\r\n?/g, "\n");
    // Split on "Q1.", "Q2." etc. — keep numbering by capturing at the boundary.
    // We split AFTER each Q-marker so each block's first non-empty line is the
    // question, then 4 option lines and one answer line.
    const blocks = text.split(/Q\s*\d+\s*[.):]/i).slice(1);
    const out = [];
    for(const block of blocks){
        const lines = block
            .split("\n")
            .map(l => l.trim())
            .filter(l => l.length > 0);
        if(lines.length < 5) continue;          // need question + 4 options + answer
        // First line(s) before the first option are the question text.
        let qParts = [];
        let i = 0;
        for(; i < lines.length; i++){
            if(/^[A-D]\s*[).:]/.test(lines[i])) break;
            qParts.push(lines[i]);
        }
        const question = qParts.join(" ").trim();
        if(!question) continue;

        function findOpt(letter){
            const r = new RegExp("^" + letter + "\\s*[).:]\\s*(.*)$", "i");
            const ln = lines.find(l => r.test(l));
            if(!ln) return null;
            return ln.replace(r, "$1").trim();
        }
        const options = ["A","B","C","D"].map(findOpt);
        if(options.some(o => o === null || o === "")) continue;

        const ansLine = lines.find(l => /^answer\s*[:.\-]/i.test(l));
        if(!ansLine) continue;
        const ansChar = (ansLine.split(/[:.\-]/)[1] || "").trim().toUpperCase().charAt(0);
        const correctAnswer = "ABCD".indexOf(ansChar);
        if(correctAnswer < 0) continue;

        out.push({ question, options, correctAnswer });
    }
    return out;
}

// Re-uses the existing `upload` multer instance (disk storage). We read the
// uploaded file, parse it, and unlink the temp file afterwards.
// Shared handler for both field names ("pdfFile" and "pdf").
async function handlePdfUpload(req, res) {
    let tmpPath = null;
    try {
        if(!req.file) return res.json({ success:false, message:"No PDF uploaded" });
        tmpPath = req.file.path;
        console.log("[PDF] File size:", req.file.size, "bytes");
        const buf = fs.readFileSync(tmpPath);

        let text = null;
        let primaryError = null;
        let fallbackError = null;

        // Primary strategy: pdf-parse with version option
        try {
            const data = await getPdfParse()(buf, { version: 'v1.10.100' });
            if(data && data.text && data.text.trim().length > 0){
                text = data.text;
            } else {
                primaryError = "pdf-parse returned empty text";
            }
        } catch(e){
            primaryError = (e && e.message) || "unknown error";
        }

        // Fallback A: pdftotext CLI
        if(!text){
            try {
                const result = require("child_process").spawnSync("pdftotext", ["-layout", tmpPath, "-"], { encoding:"utf8", timeout:10000 });
                if(result.stdout && result.stdout.trim().length > 0){
                    text = result.stdout;
                } else {
                    fallbackError = result.stderr || "pdftotext returned empty output";
                }
            } catch(e){
                fallbackError = (e && e.message) || "not available";
            }
        }

        // Fallback B: both strategies failed
        if(!text){
            return res.json({ success:false, message:"PDF text extraction failed. Primary (pdf-parse): " + (primaryError || "empty text") + ". Fallback (pdftotext): " + (fallbackError || "not available") + "." });
        }

        console.log("[PDF] Raw text length:", text.length);
        const questions = parsePdfQuestionText(text);
        if(!questions.length){
            return res.json({ success:false, message:"Could not parse questions from PDF" });
        }
        res.json({ success:true, count: questions.length, questions });
    } catch(e){
        console.log("PDF parse error:", e && e.message);
        res.json({ success:false, message:"Could not parse questions from PDF" });
    } finally {
        if(tmpPath){ try{ fs.unlinkSync(tmpPath); }catch(_){} }
    }
}

app.post("/coordinator/test/upload-pdf", upload.single("pdfFile"), handlePdfUpload);
app.post("/coordinator/test/upload-pdf-alt", upload.single("pdf"), handlePdfUpload);

// ==================================================================
// ============ GITHUB PUSH HELPER (fire-and-forget) ===============
// ==================================================================
async function pushToGitHub(submission, question, code) {
    try {
        const token = process.env.GITHUB_TOKEN;
        const owner = process.env.GITHUB_REPO_OWNER;
        const repo = process.env.GITHUB_REPO_NAME;

        if (!token || !owner || !repo) {
            console.log("[GitHub Push] Skipping - env vars not configured");
            return;
        }

        // Slugify question title
        const slug = question.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

        // Determine filename based on language
        const filenameMap = {
            javascript: 'solution.js',
            python: 'solution.py',
            java: 'Solution.java',
            cpp: 'solution.cpp'
        };
        const filename = filenameMap[submission.language] || 'solution.txt';

        const filePath = `solutions/${submission.employeeId}/${slug}/${submission.language}/${filename}`;
        const base64Content = Buffer.from(code).toString('base64');
        const commitMessage = `Accepted: ${question.title} (${submission.language}) by ${submission.employeeId}`;
        const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
        const headers = {
            'Authorization': 'token ' + token,
            'Content-Type': 'application/json',
            'User-Agent': 'InternshipPortal'
        };
        const body = {
            message: commitMessage,
            content: base64Content,
            committer: {
                name: submission.employeeId,
                email: submission.employeeId + '@intern.local'
            }
        };

        const response = await fetch(apiUrl, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify(body)
        });

        if (response.status === 422) {
            // File exists - get SHA and update
            const getResp = await fetch(apiUrl, { method: 'GET', headers: headers });
            if (getResp.ok) {
                const fileData = await getResp.json();
                body.sha = fileData.sha;
                await fetch(apiUrl, {
                    method: 'PUT',
                    headers: headers,
                    body: JSON.stringify(body)
                });
            }
        }

        console.log("[GitHub Push] Pushed:", filePath);
    } catch (e) {
        console.log("[GitHub Push] Error:", e.message);
        return;
    }
}

// ==================================================================
// ============ F5 — CODING QUESTIONS + LOCAL CODE RUNNER ===========
// ==================================================================
// CodingQuestion + CodingSubmission models live inline (per spec).
const codingQuestionSchema = new mongoose.Schema({
    domain:        { type: String, required: true, index: true },
    title:         { type: String, required: true },
    description:   { type: String, required: true },
    inputFormat:   { type: String, default: "" },
    outputFormat:  { type: String, default: "" },
    sampleInput:   { type: String, default: "" },
    sampleOutput:  { type: String, default: "" },
    difficulty:    { type: String, enum: ["Easy","Medium","Hard"], default: "Easy" },
    testCases:     [{ input: String, expectedOutput: String, isHidden: Boolean }],
    createdAt:     { type: Date, default: Date.now }
});
const CodingQuestion = mongoose.model("CodingQuestion", codingQuestionSchema);

const codingSubmissionSchema = new mongoose.Schema({
    employeeId:    { type: String, required: true, index: true },
    domain:        { type: String, required: true },
    questionId:    { type: mongoose.Schema.Types.ObjectId, ref: "CodingQuestion" },
    language:      { type: String, default: "javascript" },
    code:          { type: String, default: "" },
    status:        { type: String, enum: ["Accepted","Wrong Answer","Runtime Error","Pending"], default: "Pending" },
    passedCases:   { type: Number, default: 0 },
    totalCases:    { type: Number, default: 0 },
    submittedAt:   { type: Date, default: Date.now }
});
const CodingSubmission = mongoose.model("CodingSubmission", codingSubmissionSchema);

// ----- Coordinator CRUD -----
app.get("/coordinator/coding-questions/:domain", async(req,res)=>{
    try {
        const domain = decodeURIComponent(req.params.domain);
        const list = await CodingQuestion.find({ domain }).sort({ createdAt:-1 });
        res.json({ success:true, questions:list });
    } catch(e){ console.log(e); res.status(500).json({ success:false }); }
});
app.post("/coordinator/coding-questions", async(req,res)=>{
    try {
        const b = req.body || {};
        if(!b.domain || !b.title || !b.description){
            return res.json({ success:false, message:"domain, title and description are required" });
        }
        const cleanCases = Array.isArray(b.testCases)
            ? b.testCases
                .map(t => ({
                    input: String(t && t.input || ""),
                    expectedOutput: String(t && t.expectedOutput || ""),
                    isHidden: !!(t && t.isHidden)
                }))
                .filter(t => t.expectedOutput.length > 0)
            : [];
        const q = await CodingQuestion.create({
            domain: b.domain,
            title: b.title,
            description: b.description,
            inputFormat: b.inputFormat || "",
            outputFormat: b.outputFormat || "",
            sampleInput: b.sampleInput || "",
            sampleOutput: b.sampleOutput || "",
            difficulty: ["Easy","Medium","Hard"].includes(b.difficulty) ? b.difficulty : "Easy",
            testCases: cleanCases
        });
        res.json({ success:true, question:q });
    } catch(e){ console.log(e); res.status(500).json({ success:false }); }
});
app.delete("/coordinator/coding-questions/:id", async(req,res)=>{
    try {
        const coordId = req.headers["x-coordinator-id"] || (req.body && req.body.coordinatorId);
        if(!coordId){
            return res.status(401).json({ success:false, message:"Coordinator authentication required" });
        }
        await CodingQuestion.findByIdAndDelete(req.params.id);
        res.json({ success:true });
    } catch(e){ console.log(e); res.status(500).json({ success:false }); }
});

// ----- Student-facing -----
app.get("/student/coding-questions/:domain", async(req,res)=>{
    try {
        const domain = decodeURIComponent(req.params.domain);
        const list = await CodingQuestion.find({ domain }).sort({ createdAt:-1 });
        // Strip hidden test cases for the listing
        const safe = list.map(q => {
            const obj = q.toObject();
            obj.testCases = (obj.testCases || []).filter(t => !t.isHidden);
            return obj;
        });
        res.json({ success:true, questions:safe });
    } catch(e){ console.log(e); res.status(500).json({ success:false }); }
});
app.get("/student/coding-questions/question/:id", async(req,res)=>{
    try {
        const q = await CodingQuestion.findById(req.params.id);
        if(!q) return res.status(404).json({ success:false, message:"Not found" });
        const obj = q.toObject();
        obj.testCases = (obj.testCases || []).filter(t => !t.isHidden);
        res.json({ success:true, question:obj });
    } catch(e){ console.log(e); res.status(500).json({ success:false }); }
});
app.get("/student/coding-submissions/:employeeId", async(req,res)=>{
    try {
        const employeeId = decodeURIComponent(req.params.employeeId);
        const list = await CodingSubmission.find({ employeeId }).sort({ submittedAt:-1 });
        res.json({ success:true, submissions:list });
    } catch(e){ console.log(e); res.status(500).json({ success:false }); }
});

// ----- Local code runner (child_process) -----
// Runs source code in a temp file with a 5-second timeout. Returns
// {success, output, error, executionTime}. NEVER throws on user-code errors;
// any stderr / nonzero exit is reported back as `error`. Temp files are
// cleaned up in `finally`. The runner refuses to start if the required
// language toolchain is missing, returning a friendly error.
const { spawn } = require("child_process");
const os = require("os");

function _hasCmd(cmd){
    // synchronous check — used once per /code/run call
    try {
        const r = require("child_process").spawnSync(
            process.platform === "win32" ? "where" : "which",
            [cmd],
            { stdio: "ignore" }
        );
        return r.status === 0;
    } catch(_) { return false; }
}

function _runWithTimeout(cmd, args, opts){
    return new Promise((resolve) => {
        const startedAt = Date.now();
        let stdout = "";
        let stderr = "";
        let killed = false;
        let child;
        try {
            child = spawn(cmd, args, { ...opts, shell: false });
        } catch(e){
            return resolve({ ok:false, error: String(e.message || e), code: -1, executionTime: 0 });
        }
        const timer = setTimeout(() => {
            killed = true;
            try { child.kill("SIGKILL"); } catch(_){}
        }, (opts && opts.timeoutMs) || 5000);

        child.stdout.on("data", d => { stdout += d.toString(); if(stdout.length > 200000) stdout = stdout.slice(0, 200000) + "\n…[truncated]"; });
        child.stderr.on("data", d => { stderr += d.toString(); if(stderr.length > 200000) stderr = stderr.slice(0, 200000) + "\n…[truncated]"; });
        child.on("error", err => {
            clearTimeout(timer);
            resolve({ ok:false, error: String(err.message || err), code: -1, executionTime: Date.now() - startedAt });
        });
        child.on("close", code => {
            clearTimeout(timer);
            const elapsed = Date.now() - startedAt;
            if(killed) return resolve({ ok:false, error:"⏱ Time limit exceeded (5s).", code, executionTime: elapsed, stdout, stderr });
            resolve({ ok: code === 0, error: code === 0 ? "" : (stderr || `Process exited with code ${code}`), code, executionTime: elapsed, stdout, stderr });
        });

        if(opts && typeof opts.stdin === "string"){
            try { child.stdin.write(opts.stdin); child.stdin.end(); }
            catch(_){ try { child.stdin.end(); } catch(__){} }
        } else {
            try { child.stdin.end(); } catch(_){}
        }
    });
}

// Run a single piece of source code in `language`, with optional `stdin`.
// Returns: { success, output, error, executionTime }
async function runSourceCode({ code, language, stdin }){
    const lang = String(language || "javascript").toLowerCase();
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ten-run-"));
    const cleanup = () => { try { fs.rmSync(tmpRoot, { recursive:true, force:true }); } catch(_){} };
    try {
        let result;
        if(lang === "javascript" || lang === "js"){
            const file = path.join(tmpRoot, "program.js");
            fs.writeFileSync(file, code, "utf8");
            result = await _runWithTimeout(process.execPath, [file], { stdin: stdin || "", cwd: tmpRoot, timeoutMs: 5000 });
        } else if(lang === "python" || lang === "py"){
            const file = path.join(tmpRoot, "program.py");
            fs.writeFileSync(file, code, "utf8");
            const py = _hasCmd("python3") ? "python3" : (_hasCmd("python") ? "python" : null);
            if(!py) return { success:false, output:"", error:"Python runtime not available on this server.", executionTime: 0 };
            result = await _runWithTimeout(py, ["-I", file], { stdin: stdin || "", cwd: tmpRoot, timeoutMs: 5000 });
        } else if(lang === "java"){
            if(!_hasCmd("javac") || !_hasCmd("java")) return { success:false, output:"", error:"Java toolchain (javac/java) not available on this server.", executionTime: 0 };
            // Force public class name to "Solution"
            const file = path.join(tmpRoot, "Solution.java");
            fs.writeFileSync(file, code, "utf8");
            const compile = await _runWithTimeout("javac", ["Solution.java"], { cwd: tmpRoot, timeoutMs: 10000 });
            if(!compile.ok) return { success:false, output:"", error: compile.error || compile.stderr || "Compilation failed", executionTime: compile.executionTime };
            result = await _runWithTimeout("java", ["-cp", ".", "Solution"], { stdin: stdin || "", cwd: tmpRoot, timeoutMs: 5000 });
        } else if(lang === "cpp" || lang === "c++"){
            if(!_hasCmd("g++")) return { success:false, output:"", error:"C++ compiler (g++) not available on this server.", executionTime: 0 };
            const src = path.join(tmpRoot, "program.cpp");
            const exe = path.join(tmpRoot, "a.out");
            fs.writeFileSync(src, code, "utf8");
            const compile = await _runWithTimeout("g++", ["-O2", "-std=c++17", "program.cpp", "-o", "a.out"], { cwd: tmpRoot, timeoutMs: 15000 });
            if(!compile.ok) return { success:false, output:"", error: compile.error || compile.stderr || "Compilation failed", executionTime: compile.executionTime };
            result = await _runWithTimeout(exe, [], { stdin: stdin || "", cwd: tmpRoot, timeoutMs: 5000 });
        } else {
            return { success:false, output:"", error:"Unsupported language: " + lang, executionTime: 0 };
        }

        return {
            success: !!result.ok,
            output: result.stdout || "",
            error:  result.ok ? "" : (result.error || result.stderr || ""),
            executionTime: result.executionTime || 0
        };
    } finally { cleanup(); }
}

// SECURITY: Rate-limit code execution to prevent abuse
const codeRunLimiter = rateLimit({
    windowMs: 60 * 1000,              // 1 minute
    max: 10,                          // 10 executions per minute per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { success:false, output:"", error:"Too many code executions. Please wait.", executionTime: 0 }
});
app.post("/code/run", codeRunLimiter, async(req,res)=>{
    try {
        const { code, language, input } = req.body || {};
        if(!code) return res.json({ success:false, output:"", error:"No code provided", executionTime: 0 });
        const r = await runSourceCode({ code, language, stdin: input || "" });
        res.json(r);
    } catch(e){
        console.log("/code/run error:", e && e.message);
        res.status(500).json({ success:false, output:"", error:"Internal server error", executionTime: 0 });
    }
});

// ==================================================================
// ============ SHARED CODE EVALUATION FUNCTION ====================
// ==================================================================
async function evaluateCodeSubmission({ employeeId, questionId, language, code }) {
    const q = await CodingQuestion.findById(questionId);
    if(!q) return { success:false, message:"Question not found", notFound:true };
    const cases = q.testCases || [];
    if(!cases.length){
        return { success:false, message:"This question has no test cases configured" };
    }

    const results = [];
    let passed = 0;
    let runtimeError = false;
    for(const tc of cases){
        const r = await runSourceCode({ code, language, stdin: tc.input || "" });
        const expected = String(tc.expectedOutput || "").trim();
        const actual   = String(r.output || "").trim();
        const ok = r.success && actual === expected;
        if(!r.success && r.error) runtimeError = true;
        if(ok) passed++;
        results.push({
            input: tc.isHidden ? "(hidden)" : (tc.input || ""),
            expected: tc.isHidden ? "(hidden)" : expected,
            actual: r.success ? actual : "",
            error: r.success ? "" : (r.error || ""),
            isHidden: !!tc.isHidden,
            passed: ok,
            executionTime: r.executionTime || 0
        });
    }

    const status = passed === cases.length
        ? "Accepted"
        : (runtimeError ? "Runtime Error" : "Wrong Answer");

    const sub = await CodingSubmission.create({
        employeeId,
        domain: q.domain,
        questionId: q._id,
        language: language || "javascript",
        code,
        status,
        passedCases: passed,
        totalCases: cases.length
    });

    // Fire-and-forget GitHub push on Accepted
    if(status === "Accepted"){
        pushToGitHub(sub, q, code).catch(e => console.log("[GitHub Push] fire-and-forget error:", e.message));
    }

    return {
        success: status === "Accepted",
        status,
        passedCases: passed,
        totalCases: cases.length,
        results,
        submissionId: sub._id
    };
}

app.post("/code/submit", async(req,res)=>{
    try {
        const { employeeId, questionId, language, code } = req.body || {};
        if(!employeeId || !questionId || !code){
            return res.json({ success:false, message:"employeeId, questionId and code are required" });
        }
        const result = await evaluateCodeSubmission({ employeeId, questionId, language, code });
        if(result.notFound) return res.status(404).json({ success:false, message:result.message });
        res.json(result);
    } catch(e){
        console.log("/code/submit error:", e && e.message);
        res.status(500).json({ success:false, message:"Server error: " + (e && e.message) });
    }
});

// ----- Open in Terminal: create temp workspace -----
// NOTE: Directories are created under /tmp and will be cleaned by the OS tmpfile cleaner (e.g., systemd-tmpfiles or tmpreaper). This is acceptable for ephemeral coding workspaces.
app.post("/student/coding/open-terminal", async(req,res)=>{
    try {
        const { employeeId, questionId, language } = req.body || {};
        if(!employeeId || !questionId || !language){
            return res.json({ success:false, message:"employeeId, questionId, and language are required" });
        }
        // Sanitize employeeId and questionId to prevent path traversal and shell injection
        const safeId = String(employeeId).replace(/[^a-zA-Z0-9_-]/g, '');
        const safeQid = String(questionId).replace(/[^a-zA-Z0-9_-]/g, '');
        if(!safeId || !safeQid){
            return res.json({ success:false, message:"Invalid employeeId or questionId" });
        }
        const q = await CodingQuestion.findById(safeQid);
        if(!q) return res.status(404).json({ success:false, message:"Question not found" });

        const dirPath = `/tmp/coding_${safeId}_${safeQid}/`;
        fs.mkdirSync(dirPath, { recursive: true });

        // Write starter code file
        const lang = String(language).toLowerCase();
        let filename, starterCode;
        if(lang === "javascript" || lang === "js"){
            filename = "solution.js";
            starterCode = "// Problem: " + q.title + "\n// Read input from stdin\nconst readline = require('readline');\nconst rl = readline.createInterface({ input: process.stdin });\nlet lines = [];\nrl.on('line', l => lines.push(l));\nrl.on('close', () => {\n  // Your solution here\n});\n";
        } else if(lang === "python" || lang === "py"){
            filename = "solution.py";
            starterCode = "# Problem: " + q.title + "\nimport sys\n\ndef solve():\n    # Your solution here\n    pass\n\nif __name__ == \"__main__\":\n    solve()\n";
        } else if(lang === "java"){
            filename = "Solution.java";
            starterCode = "// Problem: " + q.title + "\nimport java.util.Scanner;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Your solution here\n    }\n}\n";
        } else if(lang === "cpp" || lang === "c++"){
            filename = "solution.cpp";
            starterCode = "#include <iostream>\nusing namespace std;\n// Problem: " + q.title + "\nint main() {\n    // Your solution here\n    return 0;\n}\n";
        } else {
            filename = "solution.txt";
            starterCode = "// Problem: " + q.title + "\n// Unsupported language: " + lang + "\n";
        }
        fs.writeFileSync(path.join(dirPath, filename), starterCode, "utf8");

        // Write README.txt
        let readme = "=== " + q.title + " ===\n\n";
        readme += "Description:\n" + (q.description || "N/A") + "\n\n";
        readme += "Input Format:\n" + (q.inputFormat || "N/A") + "\n\n";
        readme += "Output Format:\n" + (q.outputFormat || "N/A") + "\n\n";
        readme += "Sample Input:\n" + (q.sampleInput || "N/A") + "\n\n";
        readme += "Sample Output:\n" + (q.sampleOutput || "N/A") + "\n";
        fs.writeFileSync(path.join(dirPath, "README.txt"), readme, "utf8");

        // Write submit.sh
        const port = process.env.PORT || 5000;
        const submitScript = '#!/bin/bash\n# Submit your solution\n# Usage: ./submit.sh\nFILE="' + filename + '"\nCODE=$(cat "$FILE")\ncurl -s -X POST http://localhost:' + port + '/student/coding/submit-from-terminal \\\n  -H "Content-Type: application/json" \\\n  -d "{\\"employeeId\\":\\"' + safeId + '\\",\\"questionId\\":\\"' + safeQid + '\\",\\"language\\":\\"' + lang + '\\",\\"code\\":$(echo \\"$CODE\\" | jq -Rs .)}"\n';
        fs.writeFileSync(path.join(dirPath, "submit.sh"), submitScript, { mode: 0o755 });

        res.json({ success:true, workDir:dirPath, launchCmd:"cd " + dirPath + " && cat README.txt" });
    } catch(e){
        console.log("/student/coding/open-terminal error:", e && e.message);
        res.status(500).json({ success:false, message:"Server error: " + (e && e.message) });
    }
});

// ----- Submit from terminal -----
app.post("/student/coding/submit-from-terminal", async(req,res)=>{
    try {
        const { employeeId, questionId, language, code } = req.body || {};
        if(!employeeId || !questionId || !code){
            return res.json({ success:false, message:"employeeId, questionId and code are required" });
        }
        const result = await evaluateCodeSubmission({ employeeId, questionId, language, code });
        if(result.notFound) return res.status(404).json({ success:false, message:result.message });
        res.json(result);
    } catch(e){
        console.log("/student/coding/submit-from-terminal error:", e && e.message);
        res.status(500).json({ success:false, message:"Server error: " + (e && e.message) });
    }
});

// Coordinator's read-only view of student coding submissions in their domain
app.get("/coordinator/coding-submissions/:domain", async(req,res)=>{
    try {
        const domain = decodeURIComponent(req.params.domain);
        const list = await CodingSubmission.find({ domain }).sort({ submittedAt:-1 }).limit(200);
        res.json({ success:true, submissions:list });
    } catch(e){ console.log(e); res.status(500).json({ success:false }); }
});

// ================= PUBLIC DOCUMENT VERIFICATION =================

app.get('/verify-document', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'verify.html'));
});

app.get('/verify', (req, res) => {
    res.redirect('/verify-document' + (req.query.id ? '?id=' + req.query.id : ''));
});

app.get('/api/verify-document/:id', async (req, res) => {
    try {
        const docId = normalizeDocumentNumber(decodeURIComponent(req.params.id));
        if (!docId) return res.status(400).json({ error: 'Document ID is required' });

        let record = await DocumentHistory.findOne({ documentNumber: docId }).lean();
        if (!record) {
            record = await DocumentHistory.findOne({ documentNumber: { $regex: "^" + docId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$", $options: "i" } }).lean();
        }
        if (record) {
            const student = record.studentId
                ? await Student.findById(record.studentId).select("firstName lastName name employeeId domain collegeName college").lean()
                : null;
            const studentName =
                (record.studentName || student?.name || `${student?.firstName || ""} ${student?.lastName || ""}`.trim() || "").trim();
            const employeeId = record.employeeId || student?.employeeId || "";
            const domain = record.domain || student?.domain || "";
            const college = record.college || student?.collegeName || student?.college || "";
            const issuedDate = record.sentAt || record.createdAt || null;

            return res.json({
                verified: true,
                document_number: record.documentNumber,
                student_name: studentName,
                employee_id: employeeId,
                document_type: record.documentType || record.documentKey || "",
                domain: domain || "N/A",
                college: college || "N/A",
                issued_date: issuedDate,
                issued_by: "The Entrepreneurship Network (TEN)",
                document: {
                    documentId: record.documentNumber,
                    docType: record.documentKey || "document",
                    employeeId,
                    domain,
                    generatedAt: issuedDate,
                    generatedBy: record.sentBy || "TEN"
                },
                student: {
                    firstName: student?.firstName || "",
                    lastName: student?.lastName || "",
                    employeeId,
                    domain,
                    college
                }
            });
        }

        const StudentModel = require('./models/Student');

        let student = await StudentModel.findOne({ autoDocUniqueId: docId }).select('firstName lastName employeeId domain collegeName college email documentsAutoSentAt autoDocUniqueId').lean();
        if (!student) {
            return res.status(404).json({ error: 'Document not found', docId });
        }

        return res.json({
            verified: true,
            exactMatch: student.autoDocUniqueId === docId,
            document_number: docId,
            student_name: (student.firstName || '') + ' ' + (student.lastName || ''),
            employee_id: student.employeeId || '',
            document_type: 'Internship Documents',
            domain: student.domain || 'N/A',
            college: student.collegeName || student.college || 'N/A',
            issued_date: student.documentsAutoSentAt || null,
            issued_by: "The Entrepreneurship Network (TEN)",
            document: {
                documentId: docId,
                docType: 'internship_documents',
                employeeId: student.employeeId || '',
                domain: student.domain || '',
                generatedAt: student.documentsAutoSentAt || null,
                generatedBy: 'System (Auto-generated)'
            },
            student: {
                firstName: student.firstName || '',
                lastName: student.lastName || '',
                employeeId: student.employeeId || '',
                domain: student.domain || '',
                college: student.collegeName || student.college || ''
            }
        });
    } catch (err) {
        console.error('[VERIFY] Error:', err.message);
        return res.status(500).json({ error: 'Server error during verification' });
    }
});

app.get('/api/v2/verify/:documentNumber', async (req, res) => {
    res.redirect(302, "/api/verify-document/" + encodeURIComponent(req.params.documentNumber || ""));
});

// ================= V2 STUDENT PORTAL ROUTES =================
// NEW FEATURE: Mount all /api/v2/ routes — must stay above server.listen
try {
    const v2StudentPortal = require("./routes/v2/studentPortal");
    app.use("/api/v2", v2StudentPortal);
    console.log("[V2] Student portal routes mounted at /api/v2");
} catch(e) {
    console.error("[V2] Failed to mount student portal routes:", e.message);
}

// NEW FEATURE: Quiz System
// NEW FEATURE: Mount /api/v2/quiz routes (Task Journey only)
try {
    const v2QuizRouter = require("./routes/v2/quiz");
    app.use("/api/v2/quiz", v2QuizRouter);
    console.log("[V2] Quiz routes mounted at /api/v2/quiz");
} catch(e) {
    console.error("[V2] Failed to mount quiz routes:", e.message);
}

// NEW FEATURE: Document Upload + Offer Letter routes
try {
    const v2Documents = require("./routes/v2/documents");
    app.use("/api/v2", v2Documents);
    console.log("[V2] Document routes mounted at /api/v2");
} catch(e) {
    console.error("[V2] Failed to mount document routes:", e.message);
}

// NEW FEATURE: Certificate + Psychology Trigger routes
try {
    const v2Certificates = require("./routes/v2/certificates");
    app.use("/api/v2", v2Certificates);
    console.log("[V2] Certificate routes mounted at /api/v2");
} catch(e) {
    console.error("[V2] Failed to mount certificate routes:", e.message);
}

try {
    const v2HR = require("./routes/v2/hr");
    app.use("/api/v2/hr", v2HR);
    console.log("[V2] HR routes mounted at /api/v2/hr");
} catch(e) {
    console.error("[V2] Failed to mount HR routes:", e.message);
}

// NEW FEATURE: Serve uploaded certificates, documents, and offer letters
const expressModule = require("express");
app.use("/uploads/certificates", expressModule.static("uploads/certificates"));
app.use("/uploads/documents",    expressModule.static("uploads/documents"));
app.use("/uploads/offer-letters", expressModule.static("uploads/offer-letters"));

// ================= SERVER =================

// (PORT already declared earlier)
const server = http.createServer(app);

const io = new SocketIOServer(server, {
    cors: { origin: "*", methods: ["GET","POST"] }
});

io.use(async (socket, next) => {
    try{
        const identity = await verifyChatIdentity(socket.handshake.auth || {});
        if(!identity) return next(new Error("unauthorized"));
        socket.data.identity = identity;
        // Auto-join all rooms this user is allowed in
        roomsAllowedFor(identity).forEach(r => socket.join(r));
        next();
    } catch(e){ next(new Error("auth_error")); }
});

io.on("connection", (socket) => {
    const identity = socket.data.identity;

    // Optional explicit join (idempotent — server still re-checks permission)
    socket.on("join_room", (payload) => {
        const room = payload && payload.room;
        if(canAccessRoom(identity, room)) socket.join(room);
    });

    socket.on("send_message", async (payload, ack) => {
        try{
            const room = payload && payload.room;
            const text = (payload && payload.text || "").toString().trim().slice(0, 4000);
            if(!room || !text) { if(ack) ack({ success:false, message:"empty" }); return; }
            if(!canAccessRoom(identity, room)) { if(ack) ack({ success:false, message:"forbidden" }); return; }

            // Feature 8: block check — sender silenced in this room?
            try{
                const blocked = await BlockList.findOne({ chatRoom: room, blockedUser: identity.id });
                if(blocked){
                    if(ack) ack({ success:false, blocked:true, message:"You have been restricted from sending messages in this chat" });
                    return;
                }
            }catch(_){}

            const doc = await Message.create({
                chatRoom:     room,
                senderId:     identity.id,
                senderName:   identity.name,
                senderRole:   identity.role,
                senderDomain: identity.domain || "",
                message:      text,
                timestamp:    new Date()
            });
            io.to(room).emit("receive_message", doc);
            if(ack) ack({ success:true, messageId: String(doc._id) });
        } catch(e){
            console.log("send_message error:", e.message);
            if(ack) ack({ success:false, message:"server_error" });
        }
    });

    socket.on("delete_message", async (payload, ack) => {
        try{
            const messageId = payload && payload.messageId;
            const msg = messageId ? await Message.findById(messageId) : null;
            if(!msg) { if(ack) ack({ success:false, message:"not_found" }); return; }
            if(!canDeleteIn(identity, msg.chatRoom)) { if(ack) ack({ success:false, message:"forbidden" }); return; }
            await Message.findByIdAndDelete(msg._id);
            io.to(msg.chatRoom).emit("message_deleted", { messageId: String(msg._id), room: msg.chatRoom });
            if(ack) ack({ success:true });
        } catch(e){
            if(ack) ack({ success:false, message:"server_error" });
        }
    });
});


server.listen(PORT, ()=>{ console.log(`Server running on port ${PORT}`); });
