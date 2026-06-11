// NEW FEATURE: Certificate + Psychology Trigger Routes
// All routes under /api/v2/certificates/ and /api/v2/psychology/
"use strict";

const express             = require("express");
const router              = express.Router();
const path                = require("path");
const fs                  = require("fs");
const cron                = require("node-cron");
const nodemailer          = require("nodemailer");
const PDFDocument         = require("pdfkit");
const Student             = require("../../models/Student");
const StudentCertificate  = require("../../models/new/StudentCertificate");
const DocumentHistory     = require("../../models/DocumentHistory");
const PsychologyTrigger   = require("../../models/new/PsychologyTrigger");
const StudentTaskProgress = require("../../models/new/StudentTaskProgress");
const paymentConfig       = require("../../config/payment");
const { generateCertificateId, generateExpertCertificate, generateNanoCertificate, generateFellowshipCertificate } = require("../../services/v2/certificateService");

// ── HR Auth middleware (for future admin cert routes if needed) ──
async function requireHR(req, res, next) {
    try {
        const auth = req.headers["authorization"] || req.headers["Authorization"] || "";
        if (auth && auth.startsWith("Bearer hr_")) {
            req.hrUser = { token: auth };
            return next();
        }
        return res.status(401).json({ success: false, message: "HR authentication required" });
    } catch (err) {
        res.status(500).json({ success: false, message: "HR auth error" });
    }
}

// ── Auth middleware ──
async function requireStudent(req, res, next) {
    try {
        const employeeId = req.headers["x-employee-id"] || req.body.employeeId || req.query.employeeId;
        if (!employeeId) return res.status(401).json({ success: false, message: "Authentication required" });
        const student = await Student.findOne({ employeeId: String(employeeId) });
        if (!student) return res.status(401).json({ success: false, message: "Student not found" });
        req.student = student;
        next();
    } catch (err) {
        res.status(500).json({ success: false, message: "Auth error" });
    }
}

// ── Compute completion percentage from task progress ──
async function getCompletionPercent(studentId) {
    try {
        const [totalCount, approvedCount] = await Promise.all([
            StudentTaskProgress.countDocuments({ studentId }),
            StudentTaskProgress.countDocuments({ studentId, status: "approved" })
        ]);
        if (!totalCount) return 0;
        return Math.round((approvedCount / totalCount) * 100);
    } catch (_) { return 0; }
}

// ── Compute leaderboard rank (top X% in cohort) ──
async function getCohortRankPercent(student) {
    try {
        // All students in same domain, count those with more approvals
        const allStudents = await Student.find({ domain: student.domain }).select("_id");
        if (!allStudents.length) return 50;
        const scores = await Promise.all(allStudents.map(async (s) => {
            const cnt = await StudentTaskProgress.countDocuments({ studentId: s._id, status: "approved" });
            return { id: s._id.toString(), cnt };
        }));
        scores.sort((a, b) => b.cnt - a.cnt);
        const myIdx = scores.findIndex(s => s.id === student._id.toString());
        if (myIdx === -1) return 50;
        return Math.round(((myIdx) / scores.length) * 100); // 0 = top
    } catch (_) { return 50; }
}

// ── Determine unlock state for each cert type ──
async function getCertStatus(student) {
    const completionPct = await getCompletionPercent(student._id);
    const cohortRankPct = await getCohortRankPercent(student);

    // Days since joining
    let daysSinceJoin = 0;
    if (student.joiningDate) {
        const j = new Date(student.joiningDate);
        daysSinceJoin = Math.floor((Date.now() - j.getTime()) / (1000 * 60 * 60 * 24));
    }

    const expertUnlocked     = completionPct >= 30;
    const nanoDegreeUnlocked = completionPct >= 70;
    // Fellowship requires BOTH conditions: top 10% cohort rank AND 70%+ completion
    const fellowshipUnlocked = cohortRankPct <= 10 && completionPct >= 70;

    return { completionPct, cohortRankPct, daysSinceJoin, expertUnlocked, nanoDegreeUnlocked, fellowshipUnlocked };
}

// ════════════════════════════════
// CERTIFICATE ROUTES
// ════════════════════════════════

// GET /api/v2/certificates/my-certs
// Returns all 3 cert statuses + progress % for logged-in student
router.get("/certificates/my-certs", requireStudent, async (req, res) => {
    try {
        const student = req.student;
        const status  = await getCertStatus(student);

        // Fetch existing certificate records
        const certs = await StudentCertificate.find({ studentId: student._id });
        const certMap = {};
        certs.forEach(c => { certMap[c.certificateType] = c; });

        const result = {
            expert: {
                unlocked:      status.expertUnlocked,
                completionPct: status.completionPct,
                threshold:     30,
                record:        certMap["expert"]     ? { certificateId: certMap["expert"].certificateId, pdfUrl: certMap["expert"].pdfUrl, issuedAt: certMap["expert"].issuedAt } : null
            },
            nano_degree: {
                unlocked:      status.nanoDegreeUnlocked,
                completionPct: status.completionPct,
                threshold:     70,
                record:        certMap["nano_degree"] ? { certificateId: certMap["nano_degree"].certificateId, pdfUrl: certMap["nano_degree"].pdfUrl, issuedAt: certMap["nano_degree"].issuedAt } : null
            },
            fellowship: {
                visible:       status.fellowshipUnlocked,
                unlocked:      status.fellowshipUnlocked,
                cohortRankPct: status.cohortRankPct,
                completionPct: status.completionPct,
                threshold:     10,
                record:        certMap["fellowship"]  ? { certificateId: certMap["fellowship"].certificateId, pdfUrl: certMap["fellowship"].pdfUrl, issuedAt: certMap["fellowship"].issuedAt } : null
            }
        };

        res.json({ success: true, ...result, paymentEnabled: paymentConfig.PAYMENT_ENABLED, prices: paymentConfig.CERT_PRICES });
    } catch (err) {
        console.error("[CERT] my-certs error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// GET /api/v2/certificates/preview/:type
// Returns cert preview info (blurred until unlocked)
router.get("/certificates/preview/:type", requireStudent, async (req, res) => {
    try {
        const type     = req.params.type;
        const student  = req.student;
        const status   = await getCertStatus(student);

        const unlocked =
            type === "expert"     ? status.expertUnlocked     :
            type === "nano_degree"? status.nanoDegreeUnlocked :
            type === "fellowship" ? status.fellowshipUnlocked : false;

        // Don't reveal fellowship existence to non-top-10%
        if (type === "fellowship" && !status.fellowshipUnlocked) {
            return res.status(404).json({ success: false, message: "Not found" });
        }

        res.json({
            success: true,
            type,
            unlocked,
            completionPct: status.completionPct,
            cohortRankPct: status.cohortRankPct,
            studentName:   unlocked ? student.name : null,
            domain:        unlocked ? student.domain : null,
            price:         paymentConfig.CERT_PRICES[type] || 0,
            paymentEnabled: paymentConfig.PAYMENT_ENABLED
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// POST /api/v2/certificates/claim/:type
// Triggers claim flow — generates PDF, handles payment gate
router.post("/certificates/claim/:type", requireStudent, async (req, res) => {
    try {
        const type    = req.params.type;
        const student = req.student;
        const valid   = ["expert", "nano_degree", "fellowship"];
        if (!valid.includes(type)) return res.status(400).json({ success: false, message: "Invalid certificate type" });

        const status = await getCertStatus(student);
        const unlocked =
            type === "expert"     ? status.expertUnlocked     :
            type === "nano_degree"? status.nanoDegreeUnlocked :
            type === "fellowship" ? status.fellowshipUnlocked : false;

        if (!unlocked) {
            return res.status(403).json({ success: false, message: "You have not yet unlocked this certificate" });
        }

        // Check for existing cert record
        let certRecord = await StudentCertificate.findOne({ studentId: student._id, certificateType: type });

        // Payment gate
        if (!paymentConfig.PAYMENT_ENABLED) {
            if (!certRecord) {
                certRecord = await StudentCertificate.create({
                    studentId:       student._id,
                    certificateType: type,
                    domain:          student.domain,
                    paymentStatus:   "pending"
                });
            }
            return res.json({
                success: true,
                status:  "payment_coming_soon",
                message: "Payment coming soon — we will notify you by email when this is ready.",
                paymentEnabled: false
            });
        }

        // ── PAYMENT_ENABLED=true path ──
        // (Razorpay integration runs only when flag is true)
        const Razorpay = require("razorpay");
        const rzp = new Razorpay({ key_id: paymentConfig.RAZORPAY_KEY_ID, key_secret: paymentConfig.RAZORPAY_KEY_SECRET });
        const order = await rzp.orders.create({
            amount:   paymentConfig.CERT_PRICES[type] * 100, // in paise
            currency: "INR",
            receipt:  `cert_${student._id}_${type}_${Date.now()}`
        });

        res.json({
            success:    true,
            status:     "payment_initiated",
            orderId:    order.id,
            amount:     order.amount,
            currency:   order.currency,
            keyId:      paymentConfig.RAZORPAY_KEY_ID,
            paymentEnabled: true
        });
    } catch (err) {
        console.error("[CERT] claim error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// POST /api/v2/certificates/generate-pdf/:type
// Generate the actual PDF certificate after payment verification
router.post("/certificates/generate-pdf/:type", requireStudent, async (req, res) => {
    try {
        const type    = req.params.type;
        const student = req.student;

        // If payment is enabled, verify payment signature here
        // (Skipped when PAYMENT_ENABLED=false for internal use)

        let certRecord = await StudentCertificate.findOne({ studentId: student._id, certificateType: type });
        if (!certRecord) {
            certRecord = new StudentCertificate({ studentId: student._id, certificateType: type, domain: student.domain });
        }

        if (!certRecord.certificateId) {
            certRecord.certificateId = generateCertificateId(type);
        }

        const certDir = path.join(__dirname, "../../uploads/certificates");
        try { fs.mkdirSync(certDir, { recursive: true }); } catch (_) {}
        const outPath = path.join(certDir, `${student._id}_${type}.pdf`);

        const joining  = student.joiningDate ? new Date(student.joiningDate) : new Date();
        const tenureDays = student.tenure === "45 Days" ? 45 : student.tenure === "1 Month" ? 30 : student.tenure === "3 Months" ? 90 : 180;
        const endDate  = new Date(joining.getTime() + tenureDays * 24 * 3600 * 1000);
        const fmt = d => d.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });

        const data = {
            studentName:   student.name,
            domain:        student.domain,
            tenure:        student.tenure,
            durationText:  student.tenure,
            startDate:     fmt(joining),
            endDate:       fmt(endDate),
            certificateId: certRecord.certificateId
        };

        let result;
        if (type === "expert")      result = await generateExpertCertificate(data, outPath);
        else if (type === "nano_degree") result = await generateNanoCertificate(data, outPath);
        else if (type === "fellowship")  result = await generateFellowshipCertificate(data, outPath);

        const pdfUrl = `/uploads/certificates/${path.basename(outPath)}`;
        certRecord.pdfUrl         = pdfUrl;
        certRecord.issuedAt       = new Date();
        certRecord.claimedAt      = new Date();
        certRecord.paymentStatus  = paymentConfig.PAYMENT_ENABLED ? "paid" : "pending";
        certRecord.verificationUrl = `${process.env.BASE_URL || ""}/cert-verify.html?id=${certRecord.certificateId}`;
        await certRecord.save();

        try {
            const studentName =
                (student.name || `${student.firstName || ""} ${student.lastName || ""}`.trim() || student.email || "").trim();
            const college = (student.collegeName || student.college || "Not provided").trim();
            const docTypeMap = { expert: "Expert Certificate", nano_degree: "Nano Degree", fellowship: "Fellowship" };
            const docKeyMap = { expert: "expert_certificate", nano_degree: "nano_degree", fellowship: "fellowship" };
            await DocumentHistory.create({
                studentId: student._id,
                studentName,
                studentEmail: student.email || "",
                employeeId: student.employeeId || "",
                college,
                domain: student.domain || certRecord.domain || "",
                documentType: docTypeMap[type] || "Certificate",
                documentKey: docKeyMap[type] || "certificate",
                documentNumber: certRecord.certificateId,
                sentAt: certRecord.issuedAt || new Date(),
                sentBy: "System",
                sentToEmail: student.email || ""
            });
        } catch (_) {}

        res.json({ success: true, pdfUrl, certificateId: certRecord.certificateId, verificationUrl: certRecord.verificationUrl });
    } catch (err) {
        console.error("[CERT] generate-pdf error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// GET /api/v2/certificates/verify/:certId
// PUBLIC route — returns certificate verification info
router.get("/certificates/verify/:certId", async (req, res) => {
    try {
        const certId = req.params.certId;
        const cert   = await StudentCertificate.findOne({ certificateId: certId });
        if (!cert) return res.status(404).json({ success: false, valid: false, message: "Certificate not found" });

        const student = await Student.findById(cert.studentId).select("name domain tenure").lean();
        if (!student) return res.status(404).json({ success: false, valid: false, message: "Student not found" });

        res.json({
            success: true,
            valid: true,
            certificateId:   cert.certificateId,
            studentName:     student.name,
            domain:          student.domain || cert.domain,
            certificateType: cert.certificateType,
            issuedAt:        cert.issuedAt,
            verificationUrl: cert.verificationUrl
        });
    } catch (err) {
        console.error("[CERT] verify error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ════════════════════════════════
// PSYCHOLOGY TRIGGER ROUTES
// ════════════════════════════════

// POST /api/v2/psychology/log-trigger
// Logs that a trigger was shown to student
router.post("/psychology/log-trigger", requireStudent, async (req, res) => {
    try {
        const { triggerName } = req.body;
        if (!triggerName) return res.status(400).json({ success: false, message: "triggerName required" });
        await PsychologyTrigger.create({
            studentId:   req.student._id,
            triggerName: triggerName,
            shownAt:     new Date()
        });
        res.json({ success: true });
    } catch (err) {
        // Ignore duplicate trigger logs gracefully
        res.json({ success: true });
    }
});

// GET /api/v2/psychology/check-triggers
// Returns which triggers should fire for student today
router.get("/psychology/check-triggers", requireStudent, async (req, res) => {
    try {
        const student = req.student;
        const status  = await getCertStatus(student);

        // Get triggers already shown to this student
        const shown = await PsychologyTrigger.find({ studentId: student._id }).select("triggerName shownAt");
        const shownSet = new Set(shown.map(t => t.triggerName));

        // Social proof — max once per day
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const socialToday = shown.find(t => t.triggerName === "SOCIAL_PROOF_NOTIFICATION" && new Date(t.shownAt) >= today);

        const triggers = [];

        // DAY1_BLUR — fires on first dashboard load (always for new students)
        if (!shownSet.has("DAY1_BLUR_SHOWN")) {
            triggers.push({ name: "DAY1_BLUR_SHOWN", data: { completionPct: status.completionPct } });
        }

        // EXPERT_CERT_UNLOCKED — fires based on TIME (tenure threshold) AND completion >= 30%
        if (status.expertUnlocked && !shownSet.has("EXPERT_CERT_UNLOCKED")) {
            const expertThresholds = { "45 Days": 10, "1 Month": 7, "3 Months": 42, "6 Months": 60 };
            const expertDayThreshold = expertThresholds[student.tenure] || 7;
            if (status.daysSinceJoin >= expertDayThreshold) {
                triggers.push({ name: "EXPERT_CERT_UNLOCKED", data: { completionPct: status.completionPct, price: paymentConfig.CERT_PRICES.expert, paymentEnabled: paymentConfig.PAYMENT_ENABLED } });
            }
        }

        // NANO_CERT_UNLOCKED — fires based on TIME (tenure threshold) AND completion >= 70%
        if (status.nanoDegreeUnlocked && !shownSet.has("NANO_CERT_UNLOCKED")) {
            const nanoThresholds = { "45 Days": 30, "1 Month": 22, "3 Months": 84, "6 Months": 120 };
            const nanoDayThreshold = nanoThresholds[student.tenure] || 22;
            if (status.daysSinceJoin >= nanoDayThreshold) {
                triggers.push({ name: "NANO_CERT_UNLOCKED", data: { completionPct: status.completionPct, price: paymentConfig.CERT_PRICES.nano_degree, paymentEnabled: paymentConfig.PAYMENT_ENABLED } });
            }
        }

        // FELLOWSHIP_WHISPER — ONLY for top 10% cohort AND 70%+ completion (strict double check)
        if (status.fellowshipUnlocked && !shownSet.has("FELLOWSHIP_WHISPER_SHOWN")) {
            triggers.push({ name: "FELLOWSHIP_WHISPER_SHOWN", data: { cohortRankPct: status.cohortRankPct, price: paymentConfig.CERT_PRICES.fellowship } });
        }

        // SOCIAL_PROOF_NOTIFICATION — max once per day
        if (!socialToday && Math.random() < 0.3) { // 30% chance per check
            triggers.push({ name: "SOCIAL_PROOF_NOTIFICATION", data: { message: "Another intern from your cohort just earned their Expert Certificate!" } });
        }

        res.json({ success: true, triggers, completionPct: status.completionPct, cohortRankPct: status.cohortRankPct });
    } catch (err) {
        console.error("[CERT] check-triggers error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ════════════════════════════════════════════════════════════════
// LOC / LOR / STAR CERTIFICATE AUTOMATION
// ════════════════════════════════════════════════════════════════

function createCertTransporter() {
    return nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });
}

async function generateCertPDF(student, type) {
    return new Promise((resolve, reject) => {
        const dir      = path.join(__dirname, "../../uploads/certificates");
        try { fs.mkdirSync(dir, { recursive: true }); } catch (_) {}

        const filename  = `${type}-${student.employeeId}-${Date.now()}.pdf`;
        const filepath  = path.join(dir, filename);
        const doc       = new PDFDocument({ size: "A4", margin: 60 });
        const stream    = fs.createWriteStream(filepath);
        doc.pipe(stream);

        const titles = { LOC: "LETTER OF COMPLETION", LOR: "LETTER OF RECOMMENDATION", STAR: "STAR PERFORMER CERTIFICATE" };

        doc.fontSize(10).fillColor("#888").text("THE ENTREPRENEURSHIP NETWORK", { align: "center" });
        doc.moveDown(0.3);
        doc.fontSize(22).fillColor("#1a1a2e").font("Helvetica-Bold").text(titles[type] || type, { align: "center" });
        doc.moveDown(0.5);
        doc.moveTo(60, doc.y).lineTo(535, doc.y).stroke("#f59e0b");
        doc.moveDown(1);

        doc.fontSize(12).fillColor("#333").font("Helvetica").text("This is to certify that", { align: "center" });
        doc.moveDown(0.5);
        doc.fontSize(18).font("Helvetica-Bold").fillColor("#1a1a2e").text(student.name || "", { align: "center" });
        doc.moveDown(0.5);
        doc.fontSize(11).font("Helvetica").fillColor("#555").text(`Employee ID: ${student.employeeId}`, { align: "center" });
        doc.moveDown(1);

        if (type === "LOC") {
            doc.text("has successfully completed the internship program in", { align: "center" });
            doc.moveDown(0.3);
            doc.fontSize(14).font("Helvetica-Bold").fillColor("#1a1a2e").text(student.domain || "", { align: "center" });
            doc.moveDown(0.5);
            doc.fontSize(11).font("Helvetica").fillColor("#555").text(`Duration: ${student.tenure || student.internshipDuration || "45 Days"}`, { align: "center" });
            doc.moveDown(0.5);
            doc.text(`Attendance: ${student.attendancePercentage || 0}%`, { align: "center" });
        } else if (type === "LOR") {
            doc.text("is hereby recommended for demonstrating outstanding dedication during the internship in", { align: "center" });
            doc.moveDown(0.3);
            doc.fontSize(14).font("Helvetica-Bold").fillColor("#1a1a2e").text(student.domain || "", { align: "center" });
            doc.moveDown(0.5);
            doc.fontSize(11).font("Helvetica").fillColor("#555").text(`Attendance: ${student.attendancePercentage || 0}% | Performance: ${student.performanceScore || 0}%`, { align: "center" });
        } else if (type === "STAR") {
            doc.text("has been recognized as a Star Performer for valuable contributions to", { align: "center" });
            doc.moveDown(0.3);
            doc.fontSize(14).font("Helvetica-Bold").fillColor("#1a1a2e").text("The Entrepreneurship Network", { align: "center" });
            doc.moveDown(0.5);
            doc.fontSize(11).font("Helvetica").fillColor("#555").text(`Domain: ${student.domain || ""}`, { align: "center" });
        }

        doc.moveDown(2);
        doc.moveTo(60, doc.y).lineTo(535, doc.y).stroke("#e5e5e5");
        doc.moveDown(1);
        doc.fontSize(11).fillColor("#555").text(
            `Date of Issue: ${new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}`,
            { align: "right" }
        );
        doc.moveDown(0.5);
        doc.text("Authorized by: The Entrepreneurship Network HR Team", { align: "right" });

        doc.end();
        stream.on("finish", () => resolve({ filepath, filename }));
        stream.on("error", reject);
    });
}

async function sendCertEmail(student, type, filepath) {
    const titles = { LOC: "Letter of Completion", LOR: "Letter of Recommendation", STAR: "Star Performer Certificate" };
    try {
        const transporter = createCertTransporter();
        await transporter.sendMail({
            from:    process.env.EMAIL_USER,
            to:      student.email,
            subject: `Your ${titles[type] || type} — TEN Internship`,
            html:    `<p>Dear ${student.name || "Student"},</p><p>Congratulations! Your <strong>${titles[type] || type}</strong> has been issued.</p><p>Please find it attached to this email. You can also download it from your portal under <strong>My Documents</strong>.</p><p>Best regards,<br>TEN HR Team</p>`,
            attachments: [{ filename: path.basename(filepath), path: filepath }]
        });
    } catch (e) {
        console.error("[CertEmail] Failed to send:", e.message);
    }
}

async function processStudentCertificates(student) {
    const att    = student.attendancePercentage || 0;
    const perf   = student.performanceScore     || 0;
    const updates = {};

    // LOC: requires 75%+ attendance
    if (student.locStatus === "pending_hr" || student.locStatus === "approved") {
        if (att >= 75) {
            const { filepath } = await generateCertPDF(student, "LOC");
            updates.locStatus   = "issued";
            updates.locIssuedAt = new Date();
            updates.locPdfPath  = filepath;
            await sendCertEmail(student, "LOC", filepath);
        } else {
            const alreadyFined = (student.pendingFines || []).some(f => f.type === "loc_attendance" && !f.paid);
            if (!alreadyFined) {
                updates.$push = {
                    pendingFines: {
                        type:   "loc_attendance",
                        amount: 100,
                        reason: `Attendance is ${att}% (required: 75%). Pay a fine to receive LOC.`,
                        paid:   false
                    }
                };
                updates.locStatus = "fine_pending";
            }
        }
    }

    // LOR: requires 75%+ attendance AND 75%+ performance
    if (student.lorStatus === "pending_hr" || student.lorStatus === "approved") {
        if (att >= 75 && perf >= 75) {
            const { filepath } = await generateCertPDF(student, "LOR");
            updates.lorStatus   = "issued";
            updates.lorIssuedAt = new Date();
            updates.lorPdfPath  = filepath;
            await sendCertEmail(student, "LOR", filepath);
        } else {
            const alreadyFined = (student.pendingFines || []).some(f => f.type === "lor_criteria" && !f.paid);
            if (!alreadyFined) {
                const reason = att < 75 && perf < 75
                    ? `Attendance ${att}% and Performance ${perf}% both below 75%.`
                    : att < 75 ? `Attendance ${att}% below 75%.` : `Performance ${perf}% below 75%.`;
                updates.$push = {
                    pendingFines: {
                        type:   "lor_criteria",
                        amount: 50,
                        reason: `${reason} Pay a fine to receive LOR.`,
                        paid:   false
                    }
                };
                updates.lorStatus = "fine_pending";
            }
        }
    }

    // Star Performer: HR manually approved
    if (student.starStatus === "approved") {
        const { filepath } = await generateCertPDF(student, "STAR");
        updates.starStatus   = "issued";
        updates.starIssuedAt = new Date();
        updates.starPdfPath  = filepath;
        await sendCertEmail(student, "STAR", filepath);
    }

    if (Object.keys(updates).length > 0) {
        await Student.findByIdAndUpdate(student._id, updates);
    }
}

// POST /api/v2/certificates/coordinator-approve
// Coordinator marks a student's internship as completed
router.post("/certificates/coordinator-approve", async (req, res) => {
    try {
        const { studentId } = req.body;
        if (!studentId) return res.status(400).json({ success: false, message: "studentId required" });
        const student = await Student.findById(studentId);
        if (!student) return res.status(404).json({ success: false, message: "Student not found" });

        await Student.findByIdAndUpdate(studentId, {
            coordinatorApprovalStatus: "approved",
            coordinatorApprovedAt:     new Date(),
            locStatus:                 "pending_hr",
            lorStatus:                 "pending_hr"
        });
        res.json({ success: true });
    } catch (e) {
        console.error("[Cert] coordinator-approve error:", e.message);
        res.status(500).json({ success: false, message: e.message });
    }
});

// POST /api/v2/certificates/hr-approve
// HR gives final approval and triggers certificate generation
router.post("/certificates/hr-approve", requireHR, async (req, res) => {
    try {
        const { studentId, types } = req.body; // types: ['LOC','LOR','STAR']
        if (!studentId || !Array.isArray(types)) {
            return res.status(400).json({ success: false, message: "studentId and types[] required" });
        }

        const updates = { hrApprovedAt: new Date() };
        if (types.includes("LOC"))  updates.locStatus  = "approved";
        if (types.includes("LOR"))  updates.lorStatus  = "approved";
        if (types.includes("STAR")) updates.starStatus = "approved";

        await Student.findByIdAndUpdate(studentId, updates);
        const updatedStudent = await Student.findById(studentId).lean();
        if (!updatedStudent) return res.status(404).json({ success: false, message: "Student not found" });

        await processStudentCertificates(updatedStudent);
        res.json({ success: true });
    } catch (e) {
        console.error("[Cert] hr-approve error:", e.message);
        res.status(500).json({ success: false, message: e.message });
    }
});

// GET /api/v2/certificates/pending-hr
// HR: list students pending certificate action
router.get("/certificates/pending-hr", requireHR, async (req, res) => {
    try {
        const students = await Student.find({
            $or: [
                { locStatus: "pending_hr" },
                { lorStatus: "pending_hr" },
                { starStatus: "pending_review" },
                { coordinatorApprovalStatus: "escalated_to_hr" }
            ]
        }).lean();
        res.json({ success: true, students });
    } catch (e) {
        console.error("[Cert] pending-hr error:", e.message);
        res.status(500).json({ success: false, message: e.message });
    }
});

// GET /api/v2/certificates/download-loc-lor-star/:type
// Student downloads their LOC / LOR / STAR certificate
router.get("/certificates/download-loc-lor-star/:type", requireStudent, async (req, res) => {
    try {
        const type    = req.params.type.toUpperCase(); // LOC | LOR | STAR
        const student = req.student;
        const pathMap = { LOC: student.locPdfPath, LOR: student.lorPdfPath, STAR: student.starPdfPath };
        const filePath = pathMap[type];

        if (!filePath || !fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, message: "Certificate not yet generated" });
        }
        res.download(filePath, `TEN-${type}-${student.employeeId}.pdf`);
    } catch (e) {
        console.error("[Cert] download error:", e.message);
        res.status(500).json({ success: false, message: e.message });
    }
});

// POST /api/v2/certificates/star-submit
// Student submits their Star Performer contribution
router.post("/certificates/star-submit", requireStudent, async (req, res) => {
    try {
        const { contribution } = req.body;
        if (!contribution || !contribution.trim()) {
            return res.status(400).json({ success: false, message: "Contribution text required" });
        }
        await Student.findByIdAndUpdate(req.student._id, {
            starStatus:       "pending_review",
            starContribution: contribution.trim()
        });
        res.json({ success: true });
    } catch (e) {
        console.error("[Cert] star-submit error:", e.message);
        res.status(500).json({ success: false, message: e.message });
    }
});

// ── CRON 1: Coordinator 24h timeout → escalate to HR (runs every hour) ──
cron.schedule("0 * * * *", async () => {
    try {
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const toEscalate = await Student.find({
            internshipCompleted:       true,
            coordinatorApprovalStatus: { $in: [null, "pending"] },
            internshipCompletedAt:     { $lt: cutoff }
        });
        for (const s of toEscalate) {
            await Student.findByIdAndUpdate(s._id, {
                coordinatorApprovalStatus: "escalated_to_hr",
                locStatus:                 "pending_hr",
                lorStatus:                 "pending_hr"
            });
            console.log(`[CertCron] Escalated ${s.employeeId} to HR (coordinator 24h timeout)`);
        }
    } catch (e) {
        console.error("[CertCron-Escalate]", e.message);
    }
});

// ── CRON 2: HR 24h timeout → auto-process certificates (runs every hour) ──
cron.schedule("30 * * * *", async () => {
    try {
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const toAutoProcess = await Student.find({
            $or: [{ locStatus: "pending_hr" }, { lorStatus: "pending_hr" }],
            coordinatorApprovedAt: { $lt: cutoff }
        });
        for (const s of toAutoProcess) {
            console.log(`[CertCron] Auto-processing certs for ${s.employeeId}`);
            try {
                await processStudentCertificates(s);
            } catch (err) {
                console.error(`[CertCron] Failed for ${s.employeeId}:`, err.message);
            }
        }
    } catch (e) {
        console.error("[CertCron-AutoProcess]", e.message);
    }
});

module.exports = router;
