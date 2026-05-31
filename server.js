
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
const Notice = require("./models/Notice");
const Notification = require("./models/Notification");
const Attendance = require("./models/Attendance");
const Message = require("./models/Message");
const HR = require("./models/HR");
const Coordinator = require("./models/Coordinator");
const Promotion = require("./models/Promotion");

const bcrypt = require("bcrypt");
const http = require("http");
const { Server: SocketIOServer } = require("socket.io");

// All domains supported by the system (Requirement 5: HR Management included).
// Anywhere the backend filters or iterates domains, it should reference this list.
const ALL_DOMAINS = [
    "DevOps with AWS","Python Development","Java Development","Web Development",
    "MERN Stack Development","Artificial Intelligence","Data Science",
    "Cyber Security","Software Engineering","Flutter Development",
    "HR Management"
];

// Shared credential maps (legacy hardcoded accounts).
// Used by /hr-login, /coordinator-login, and chat handshake auth.
// New DB-backed accounts (created via the promotion flow) are stored in the
// `HR` and `Coordinator` collections and looked up alongside these maps.
const HR_ACCOUNTS = {
    "hr_admin":   { password: "HR@TEN2026",  name: "HR Administrator", email: "hr.admin@ten.local" },
    "hr_manager": { password: "HRMgr@2026",  name: "HR Manager",       email: "hr.manager@ten.local" }
};
const COORDINATORS = {
    "devops_aws_admin":   { password:"DevOpsAWS@2026",  domain:"DevOps with AWS" },
    "python_admin":       { password:"Python@2026",     domain:"Python Development" },
    "java_admin":         { password:"Java@2026",       domain:"Java Development" },
    "web_admin":          { password:"Web@2026",        domain:"Web Development" },
    "mern_admin":         { password:"Mern@2026",       domain:"MERN Stack Development" },
    "ai_admin":           { password:"AI@2026",         domain:"Artificial Intelligence" },
    "datascience_admin":  { password:"DS@2026",         domain:"Data Science" },
    "cyber_admin":        { password:"Cyber@2026",      domain:"Cyber Security" },
    "software_admin":     { password:"Software@2026",   domain:"Software Engineering" },
    "flutter_admin":      { password:"Flutter@2026",    domain:"Flutter Development" },
    // Requirement 5 — HR Management treated like any other domain
    "hrmgmt_admin":       { password:"HRMgmt@2026",     domain:"HR Management" }
};

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));
app.use('/uploads', express.static('uploads'));

const upload = multer({ dest: "uploads/" });

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

// ================= MONGODB =================

mongoose.connect("mongodb://nagbishal07_db_user:_DXMzR6bkF!7Bc9@ac-kbv0ma9-shard-00-00.dtg7de6.mongodb.net:27017,ac-kbv0ma9-shard-00-01.dtg7de6.mongodb.net:27017,ac-kbv0ma9-shard-00-02.dtg7de6.mongodb.net:27017/?ssl=true&replicaSet=atlas-ekamxn-shard-0&authSource=admin&appName=Cluster0")
.then(()=>console.log("MongoDB Connected"))
.catch((err)=>console.log(err));

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
    submittedAt: { type: Date, default: Date.now }
});

const Submission = mongoose.model("Submission", submissionSchema);

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
        "HR Management":            "HRMGMT"
    };
    const shortCode = domainShortCodes[domain] || domain.toUpperCase();
    const totalStudents = await Student.countDocuments();
    const sequenceNumber = 1001 + totalStudents;
    return `TEN/${shortCode}/${sequenceNumber}`;
}

// ================= REGISTER =================

app.post("/register", async(req,res)=>{
try{
const { firstName, lastName, domain, whatsapp, email, tenure, joiningDate } = req.body;

const existingStudent = await Student.findOne({ email });

if(existingStudent){
    return res.json({ success:false, already:true, employeeId:existingStudent.employeeId });
}

const employeeId = await generateEmployeeId(domain);
const password = crypto.randomBytes(4).toString("hex");

const newStudent = new Student({
    firstName, lastName,
    name: firstName + " " + lastName,
    domain, whatsapp, email,
    tenure, joiningDate,
    employeeId, password
});

await newStudent.save();

try{
    await transporter.sendMail({
        from:"TEN Internship Portal <ten.internshipportal@gmail.com>",
        to:email,
        subject:"Internship Registration Successful",
        text:`Hello ${firstName},\n\nYour Internship Registration is Successful 🚀\n\nEmployee ID: ${employeeId}\nPassword: ${password}\n\nLogin:\nhttp://13.235.150.76:5000/login.html\n\nThank You`
    });
}catch(mailError){ console.log("MAIL ERROR:", mailError); }

res.json({ success:true, employeeId });

}catch(error){ console.log(error); res.status(500).json({ success:false, message:"Server Error" }); }
});

// ================= LOGIN =================

app.post("/login", async(req,res)=>{
try{
    const { employeeId, password } = req.body;
    const student = await Student.findOne({ employeeId, password });
    if(!student){ return res.json({ success:false, message:"Invalid Employee ID or Password" }); }
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
    const { id, status, feedback } = req.body;

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

app.post("/hr-login", async(req,res)=>{
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
    res.json({ success:true, submissions });
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
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ success:true });
}catch(error){ res.json({ success:false }); }
});

// ================= ALL STUDENTS (legacy admin) =================

app.get("/students", async(req,res)=>{
    const adminPassword = req.headers.authorization;
    if(adminPassword !== "Bearer mysecret123"){
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
    await Student.findByIdAndUpdate(req.params.id, req.body, { new:true });
    res.json({ message:"Student Updated" });
}catch(error){ res.status(500).json({ message:"Update Failed" }); }
});

// ================= DELETE STUDENT =================

app.delete("/students/:id", async(req,res)=>{
try{
    await Student.findByIdAndDelete(req.params.id);
    res.json({ message:"Student deleted" });
}catch(error){ res.status(500).json({ message:"Error deleting student" }); }
});

// ================= STUDENT LOGIN =================

app.post("/student-login", async(req,res)=>{
try{
    const { employeeId, password } = req.body;
    const student = await Student.findOne({ employeeId, password });
    if(!student){ return res.json({ success:false, message:"Invalid Employee ID or Password" }); }
    res.json({
        success:true,
        student:{
            name: student.firstName + " " + student.lastName,
            employeeId: student.employeeId,
            domain: student.domain
        }
    });
}catch(error){
    console.log(error);
    res.json({ success:false, message:"Server Error" });
}
});

// ================= COORDINATOR LOGIN =================

app.post("/coordinator-login", async(req,res)=>{
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
    const { domain, questions } = req.body;
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
    const { domain, tasks } = req.body;
    await CoordinatorTask.findOneAndUpdate(
        { domain },
        { domain, tasks, updatedAt: new Date() },
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
            domain:s.domain, joiningDate:s.joiningDate, stats
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
            college:s.college || "",
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
        return { ok: true };
    } catch(e){
        console.log("Promotion email failed:", e.message);
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

// ================= SERVER =================

const PORT = process.env.PORT || 5000;
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