// NEW FEATURE: Certificate + Psychology Trigger Routes
// All routes under /api/v2/certificates/ and /api/v2/psychology/
"use strict";

const express             = require("express");
const router              = express.Router();
const path                = require("path");
const fs                  = require("fs");
const Student             = require("../../../models/Student");
const StudentCertificate  = require("../../../models/new/StudentCertificate");
const DocumentHistory     = require("../../../models/DocumentHistory");
const MailHistory         = require("../../../models/MailHistory");
const PsychologyTrigger   = require("../../../models/new/PsychologyTrigger");
const StudentTaskProgress = require("../../../models/new/StudentTaskProgress");
const paymentConfig       = require("../../../config/payment");
const { generateCertificateId, generateExpertCertificate, generateNanoCertificate, generateFellowshipCertificate } = require("../../../services/v2/certificateService");

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
// GET /api/v2/certificates/my-certs — smart unified handler
async function handleMyCerts(req, res) {
  try {
    const employeeId = req.query.employeeId || req.body.employeeId;
    const headerEmployeeId = req.headers["x-employee-id"] || req.headers["X-Employee-Id"];

    // If no query parameter employeeId and we have headers, check if it's the old portal (my-certificates.html)
    if (!employeeId && headerEmployeeId) {
      const student = await Student.findOne({ employeeId: String(headerEmployeeId) });
      if (!student) return res.status(401).json({ success: false, message: "Student not found" });
      const status  = await getCertStatus(student);

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

      return res.json({ success: true, ...result, paymentEnabled: paymentConfig.PAYMENT_ENABLED, prices: paymentConfig.CERT_PRICES });
    }

    const targetId = employeeId || headerEmployeeId;
    if (!targetId) {
      return res.status(400).json({ error: 'employeeId query parameter or header is required' });
    }

    const student = await Student.findOne({ employeeId: targetId },
      'name fullName employeeId locStatus locIssuedAt lorStatus lorIssuedAt starStatus starIssuedAt ' +
      'offerLetterStatus offerLetterGeneratedAt documentRejectionReason ' +
      'locPdfBase64 lorPdfBase64 starPdfBase64 offerPdfBase64 ' +
      'attendancePercentage performanceScore pendingFines starContribution'
    ).lean();
    if (!student) return res.status(404).json({ error: 'Not found' });
    
    const { locPdfBase64, lorPdfBase64, starPdfBase64, offerPdfBase64, ...safeStudent } = student;
    safeStudent.hasLocPdf   = !!locPdfBase64;
    safeStudent.hasLorPdf   = !!lorPdfBase64;
    safeStudent.hasStarPdf  = !!starPdfBase64;
    safeStudent.hasOfferPdf = !!offerPdfBase64;

    try {
      const StudentDocument = require("../../../models/new/StudentDocument");
      const docRec = await StudentDocument.findOne({ studentId: student._id }).lean();
      if (docRec) {
        if (!safeStudent.offerLetterStatus || safeStudent.offerLetterStatus === 'not_uploaded' || safeStudent.offerLetterStatus === 'not_eligible') {
          safeStudent.offerLetterStatus = docRec.uploadStatus || 'not_uploaded';
        }
        if (docRec.offerLetterUrl) {
          safeStudent.hasOfferPdf = true;
          safeStudent.offerLetterStatus = 'issued';
          if (docRec.offerLetterSentAt && !safeStudent.offerLetterGeneratedAt) {
            safeStudent.offerLetterGeneratedAt = docRec.offerLetterSentAt;
          }
        }
        if (docRec.locUrl) {
          safeStudent.hasLocPdf = true;
          safeStudent.locStatus = 'issued';
          if (docRec.locSentAt && !safeStudent.locIssuedAt) {
            safeStudent.locIssuedAt = docRec.locSentAt;
          }
        }
        if (docRec.lorUrl) {
          safeStudent.hasLorPdf = true;
          safeStudent.lorStatus = 'issued';
          if (docRec.lorSentAt && !safeStudent.lorIssuedAt) {
            safeStudent.lorIssuedAt = docRec.lorSentAt;
          }
        }
        if (docRec.rejectionReason && !safeStudent.documentRejectionReason) {
          safeStudent.documentRejectionReason = docRec.rejectionReason;
        }
      }
    } catch (fallbackErr) {
      console.error('[My-Certs] StudentDocument fallback error:', fallbackErr.message);
    }

    res.json(safeStudent);
  } catch(e) {
    console.error('[My-Certs] Error:', e.message);
    res.status(500).json({ error: e.message });
  }
}

router.get("/certificates/my-certs", async (req, res) => {
    return handleMyCerts(req, res);
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

        const certDir = path.join(__dirname, "../../../uploads/certificates");
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

// ─────────────────────────────────────────────────────────────────────────────
// CERTIFICATE AUTOMATION — SECTION 1, 2, 3, 4
// ─────────────────────────────────────────────────────────────────────────────

const nodemailer          = require("nodemailer");
const PDFDocument         = require("pdfkit");
const cron                = require("node-cron");

// Find the existing transporter and make it fault-tolerant
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',    // or 'smtp'
  host:    process.env.EMAIL_HOST,
  port:    parseInt(process.env.EMAIL_PORT) || 587,
  secure:  process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendCertificateEmail(toEmail, studentName, certType, pdfBuffer) {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('[Email] EMAIL_USER or EMAIL_PASS not set — skipping email');
      return { sent: false, reason: 'Email not configured' };
    }
    await transporter.sendMail({
      from:    `"TEN Internship" <${process.env.EMAIL_USER}>`,
      to:      toEmail,
      subject: `🎓 Your ${certType} — TEN Internship Network`,
      html:    buildCertEmailHTML(studentName, certType),
      attachments: [{ 
        filename: `TEN-${certType}-${studentName.replace(/\s/g,'-')}.pdf`, 
        content: pdfBuffer, 
        contentType: 'application/pdf' 
      }],
    });
    console.log(`[Email] ✓ ${certType} sent to ${toEmail}`);
    return { sent: true };
  } catch(e) {
    console.error(`[Email] ✗ Failed to send ${certType} to ${toEmail}:`, e.message);
    return { sent: false, reason: e.message };  // NEVER throw — just return failure
  }
}

function buildCertEmailHTML(name, certType) {
  const labels = { LOC:'Letter of Completion', LOR:'Letter of Recommendation', STAR:'Star Performer Certificate', OFFER:'Offer Letter' };
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a19;color:#e2e8f0;padding:40px;border-radius:16px;">
      <h2 style="color:#f59e0b;text-align:center;">🎓 TEN Internship Network</h2>
      <hr style="border-color:#1e293b;">
      <h3 style="color:#f1f5f9;">Dear ${name},</h3>
      <p style="color:#94a3b8;line-height:1.7;">
        Congratulations! Your <strong style="color:#f1f5f9">${labels[certType] || certType}</strong> has been officially issued by TEN.
      </p>
      <p style="color:#94a3b8;line-height:1.7;">
        Your certificate is attached to this email as a PDF. You can also download it anytime from your 
        <strong style="color:#f59e0b">My Documents</strong> section in the student portal.
      </p>
      <div style="background:#1e293b;border-radius:10px;padding:16px;margin:20px 0;">
        <p style="margin:0;color:#64748b;font-size:13px;">
          📌 Keep this certificate safe — it is your official proof of internship with TEN.
        </p>
      </div>
      <p style="color:#475569;font-size:12px;text-align:center;margin-top:30px;">
        The Entrepreneurship Network · virtualinternships.entrepreneurshipnetwork.net
      </p>
    </div>
  `;
}

async function buildCertPDF(student, certType) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({ size: 'A4', margin: 70, bufferPages: true });
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end',  ()    => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  
    const gold  = '#b45309';
    const dark  = '#1a1a2e';
    const gray  = '#64748b';
    const name  = student.name || student.fullName || 'Student';
    const empId = student.employeeId || '';
    const dom   = student.domain || '';
    const dur   = student.internshipDuration || '45 Days';
    const att   = student.attendancePercentage || 0;
    const perf  = student.performanceScore     || 0;
    const now   = new Date().toLocaleDateString('en-IN', { year:'numeric', month:'long', day:'numeric' });
  
    // ── Header ──
    doc.fontSize(9).fillColor(gray).text('THE ENTREPRENEURSHIP NETWORK', { align:'center' });
    doc.moveDown(0.2);
    doc.fontSize(8).fillColor(gray).text('virtualinternships.entrepreneurshipnetwork.net', { align:'center' });
    doc.moveDown(0.5);
  
    // Gold divider
    doc.moveTo(70, doc.y).lineTo(525, doc.y).lineWidth(2).strokeColor(gold).stroke();
    doc.moveDown(0.8);
  
    // Title
    const titles = {
      LOC:   'LETTER OF COMPLETION',
      LOR:   'LETTER OF RECOMMENDATION',
      STAR:  'STAR PERFORMER CERTIFICATE',
      OFFER: 'INTERNSHIP OFFER LETTER',
    };
    doc.fontSize(24).fillColor(dark).font('Helvetica-Bold')
       .text(titles[certType], { align:'center' });
    doc.moveDown(1.2);
  
    // Body
    doc.fontSize(12).fillColor('#374151').font('Helvetica')
       .text('This is to certify that', { align:'center' });
    doc.moveDown(0.4);
    doc.fontSize(20).font('Helvetica-Bold').fillColor(dark)
       .text(name, { align:'center' });
    doc.moveDown(0.3);
    doc.fontSize(11).font('Helvetica').fillColor(gray)
       .text(`Employee ID: ${empId}`, { align:'center' });
    doc.moveDown(1);
  
    if (certType === 'LOC') {
      doc.fontSize(12).fillColor('#374151')
         .text('has successfully completed the Virtual Internship Program in', { align:'center' });
      doc.moveDown(0.4);
      doc.fontSize(15).font('Helvetica-Bold').fillColor(dark)
         .text(dom, { align:'center' });
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica').fillColor(gray)
         .text(`Duration: ${dur}  |  Attendance: ${att}%`, { align:'center' });
  
    } else if (certType === 'LOR') {
      doc.fontSize(12).fillColor('#374151')
         .text('is hereby recommended for outstanding performance during the Virtual Internship in', { align:'center' });
      doc.moveDown(0.4);
      doc.fontSize(15).font('Helvetica-Bold').fillColor(dark)
         .text(dom, { align:'center' });
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica').fillColor(gray)
         .text(`Attendance: ${att}%  |  Performance Score: ${perf}%`, { align:'center' });
  
    } else if (certType === 'STAR') {
      doc.fontSize(12).fillColor('#374151')
         .text('has been awarded the Star Performer distinction for exceptional contribution to', { align:'center' });
      doc.moveDown(0.4);
      doc.fontSize(15).font('Helvetica-Bold').fillColor(dark)
         .text('The Entrepreneurship Network', { align:'center' });
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica').fillColor(gray)
         .text(`Domain: ${dom}`, { align:'center' });
  
    } else if (certType === 'OFFER') {
      doc.fontSize(12).fillColor('#374151')
         .text('is hereby offered a Virtual Internship position in', { align:'center' });
      doc.moveDown(0.4);
      doc.fontSize(15).font('Helvetica-Bold').fillColor(dark)
         .text(dom, { align:'center' });
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica').fillColor(gray)
         .text(`Duration: ${dur}  |  Mode: Virtual / Remote`, { align:'center' });
    }
  
    doc.moveDown(1.5);
    doc.moveTo(70, doc.y).lineTo(525, doc.y).lineWidth(0.5).strokeColor('#e2e8f0').stroke();
    doc.moveDown(1);
  
    // Issuance info
    doc.fontSize(11).fillColor(gray)
       .text(`Date of Issue: ${now}`, 300, doc.y, { align:'right', width:225 });
    doc.moveDown(0.4);
    doc.fontSize(10).fillColor(gray)
       .text('Authorized by: TEN HR Team', { align:'right' });
  
    doc.moveDown(2);
  
    // ── Fine / Eligibility Notice box (always shown) ──
    const noticeY = doc.y;
    doc.rect(70, noticeY, 455, certType === 'OFFER' ? 80 : 110)
       .lineWidth(0.5).strokeColor('#e2e8f0').stroke();
    doc.moveDown(0.3);
    
    doc.fontSize(8).fillColor(gray).font('Helvetica-Bold')
       .text('CERTIFICATE ELIGIBILITY CRITERIA & FINE POLICY', 80, noticeY + 10);
    doc.font('Helvetica').fillColor(gray);
  
    if (certType === 'LOC') {
      doc.fontSize(8).text(
        '• LOC is issued when attendance ≥ 75%.\n' +
        '• If attendance < 75%, a ₹100 fine must be paid to receive this certificate.\n' +
        '• Fine payment unlocks certificate issuance within 24 hours.\n' +
        '• Pay fine from: My Documents → Outstanding Fines section in the student portal.',
        80, noticeY + 22, { width: 435, lineGap: 3 }
      );
    } else if (certType === 'LOR') {
      doc.fontSize(8).text(
        '• LOR is issued when both Attendance ≥ 75% AND Performance ≥ 75%.\n' +
        '• If either criterion is not met, a ₹50 fine must be paid to receive this certificate.\n' +
        '• Fine payment unlocks certificate issuance within 24 hours.\n' +
        '• Pay fine from: My Documents → Outstanding Fines section in the student portal.',
        80, noticeY + 22, { width: 435, lineGap: 3 }
      );
    } else if (certType === 'STAR') {
      doc.fontSize(8).text(
        '• Star Performer Certificate is awarded to students who contribute a genuine idea + implementation to improve TEN.\n' +
        '• Submit your contribution from My Documents → Star Performer section.\n' +
        '• HR reviews submissions and approves manually. No fine applies for this certificate.',
        80, noticeY + 22, { width: 435, lineGap: 3 }
      );
    } else if (certType === 'OFFER') {
      doc.fontSize(8).text(
        '• Offer Letter is issued after HR reviews and approves your uploaded Address Proof and College Marksheet.\n' +
        '• Upload documents from My Documents → Upload Documents tab. HR processes within 24 hours.',
        80, noticeY + 22, { width: 435, lineGap: 3 }
      );
    }
  
    doc.end();
  });
}

async function generateAndSaveCert(studentId, certType, studentData = null, sentBy = "System") {
  const student = studentData || await Student.findById(studentId);
  if (!student) {
    console.error(`[Cert] Student not found: ${studentId}`);
    return { success: false, error: 'Student not found' };
  }
  const pdfBuffer = await buildCertPDF(student, certType);
  
  const fieldMap = {
    LOC:   { pdfField: 'locPdfBase64',   statusField: 'locStatus',   dateField: 'locIssuedAt' },
    LOR:   { pdfField: 'lorPdfBase64',   statusField: 'lorStatus',   dateField: 'lorIssuedAt' },
    STAR:  { pdfField: 'starPdfBase64',  statusField: 'starStatus',  dateField: 'starIssuedAt' },
    OFFER: { pdfField: 'offerPdfBase64', statusField: 'offerLetterStatus', dateField: 'offerLetterGeneratedAt' },
  };
  const fields = fieldMap[certType];
  
  // SAVE FIRST — email is optional
  await Student.findByIdAndUpdate(studentId, {
    [fields.pdfField]:   pdfBuffer.toString('base64'),
    [fields.statusField]: 'issued',
    [fields.dateField]:  new Date(),
  });
  console.log(`[Cert] ✓ ${certType} saved to DB for student ${studentId}`);
  
  const emailResult = await sendCertificateEmail(student.email, student.name || student.fullName || 'Student', certType, pdfBuffer);
  
  // Update StudentDocument to keep legacy collections in perfect sync
  try {
    const StudentDocument = require("../../../models/new/StudentDocument");
    let docRec = await StudentDocument.findOne({ studentId });
    if (!docRec) docRec = new StudentDocument({ studentId });

    if (certType === 'OFFER') {
      docRec.uploadStatus = "approved";
      docRec.offerLetterUrl = `/uploads/offer-letters/${student.employeeId ? student.employeeId.replace(/\//g, "-") : studentId}_offer_letter.pdf`;
      docRec.offerLetterSentAt = new Date();
    } else if (certType === 'LOC') {
      docRec.locUrl = `/uploads/certificates/${student.employeeId ? student.employeeId.replace(/\//g, "-") : studentId}_loc.pdf`;
      docRec.locSentAt = new Date();
    } else if (certType === 'LOR') {
      docRec.lorUrl = `/uploads/certificates/${student.employeeId ? student.employeeId.replace(/\//g, "-") : studentId}_lor.pdf`;
      docRec.lorSentAt = new Date();
    }
    await docRec.save();
    console.log(`[CertSync] ✓ Synced ${certType} to StudentDocument for student ${studentId}`);
  } catch (docSyncErr) {
    console.error(`[CertSync] ✗ Failed to sync to StudentDocument:`, docSyncErr.message);
  }

  // Create DocumentHistory record (Document Send History)
  try {
    const studentName = (student.name || student.fullName || "").trim();
    const college = (student.collegeName || student.college || "Not provided").trim();
    const docNumber = `TEN-${certType}-${student.employeeId ? student.employeeId.replace(/\//g, "-") : student._id.toString().slice(-6)}`.toUpperCase();

    const labels = { 
      LOC: 'Letter of Completion', 
      LOR: 'Letter of Recommendation', 
      STAR: 'Star Performer Certificate', 
      OFFER: 'Offer Letter' 
    };

    await DocumentHistory.create({
      studentId: student._id,
      studentName,
      studentEmail: student.email || "",
      employeeId: student.employeeId || "",
      college,
      domain: student.domain || "",
      documentType: labels[certType] || certType,
      documentKey: certType.toLowerCase(),
      documentNumber: docNumber,
      sentAt: new Date(),
      sentBy: sentBy,
      sentToEmail: student.email || ""
    });
    console.log(`[CertHistory] ✓ Logged DocumentHistory for student ${studentId}`);
  } catch (historyErr) {
    console.error(`[CertHistory] Failed to log DocumentHistory for ${studentId}:`, historyErr.message);
  }

  // Create MailHistory record (Automated Mail History)
  try {
    const studentName = (student.name || student.fullName || "").trim();
    await MailHistory.create({
      recipientEmail: student.email || "",
      recipientName: studentName,
      studentId: student._id,
      subject: `🎓 Your ${certType} — TEN Internship Network`,
      mailType: certType.toLowerCase(),
      sentAt: new Date(),
      status: emailResult.sent ? "sent" : "failed",
      errorMessage: emailResult.sent ? "" : (emailResult.reason || "SMTP error")
    });
    console.log(`[MailHistory] ✓ Logged MailHistory for student ${studentId}`);
  } catch (mailHistoryErr) {
    console.error(`[MailHistory] Failed to log MailHistory for ${studentId}:`, mailHistoryErr.message);
  }
  
  return { success: true, emailSent: emailResult.sent };
}

async function checkAndIssueCerts(studentId, sentBy = "System Automation") {
  const student = await Student.findById(studentId).lean();
  if (!student) return;
  const att  = student.attendancePercentage || 0;
  const perf = student.performanceScore || 0;
  
  const locFinePaid = (student.pendingFines||[]).some(f => f.fineType === 'loc_attendance' && f.paid);
  const lorFinePaid = (student.pendingFines||[]).some(f => f.fineType === 'lor_criteria' && f.paid);

  // LOC check
  if (['pending_hr', 'approved', 'fine_pending'].includes(student.locStatus) && student.locStatus !== 'issued') {
    if (att >= 75 || locFinePaid) {
      await generateAndSaveCert(studentId, 'LOC', student, sentBy);
    } else {
      // Add fine if not already added
      const hasFine = (student.pendingFines||[]).some(f => f.fineType === 'loc_attendance');
      if (!hasFine) {
        await Student.findByIdAndUpdate(studentId, {
          locStatus: 'fine_pending',
          $push: { pendingFines: {
            fineType: 'loc_attendance',
            amount: 100,
            reason: `Your attendance is ${att}% (minimum required: 75%). Pay ₹100 to unlock your LOC.`,
          }}
        });
      }
    }
  }
  
  // LOR check
  if (['pending_hr', 'approved', 'fine_pending'].includes(student.lorStatus) && student.lorStatus !== 'issued') {
    if ((att >= 75 && perf >= 75) || lorFinePaid) {
      await generateAndSaveCert(studentId, 'LOR', student, sentBy);
    } else {
      const hasFine = (student.pendingFines||[]).some(f => f.fineType === 'lor_criteria');
      if (!hasFine) {
        let reason = '';
        if (att < 75 && perf < 75) reason = `Attendance ${att}% and Performance ${perf}% are both below 75%.`;
        else if (att < 75)  reason = `Attendance ${att}% is below 75% (performance is fine at ${perf}%).`;
        else                reason = `Performance ${perf}% is below 75% (attendance is fine at ${att}%).`;
        await Student.findByIdAndUpdate(studentId, {
          lorStatus: 'fine_pending',
          $push: { pendingFines: {
            fineType: 'lor_criteria',
            amount: 50,
            reason: `${reason} Pay ₹50 to unlock your LOR.`,
          }}
        });
      }
    }
  }
  
  // STAR — only if HR explicitly set starStatus = 'approved'
  if (student.starStatus === 'approved') {
    await generateAndSaveCert(studentId, 'STAR', student, sentBy);
  }
}

// POST /api/v2/certificates/hr-approve — HR manually approves
router.post('/hr-approve', async (req, res) => {
  try {
    const { studentId, certTypes, force } = req.body; // certTypes: ['LOC','LOR','STAR']
    const update = {};
    if (certTypes.includes('LOC'))  update.locStatus  = 'pending_hr';
    if (certTypes.includes('LOR'))  update.lorStatus  = 'pending_hr';
    if (certTypes.includes('STAR')) update.starStatus = 'approved';
    await Student.findByIdAndUpdate(studentId, update);
    
    if (force) {
      const studentObj = await Student.findById(studentId);
      if (certTypes.includes('LOC')) await generateAndSaveCert(studentId, 'LOC', studentObj, "HR Portal (Forced)");
      if (certTypes.includes('LOR')) await generateAndSaveCert(studentId, 'LOR', studentObj, "HR Portal (Forced)");
      if (certTypes.includes('STAR')) await generateAndSaveCert(studentId, 'STAR', studentObj, "HR Portal (Forced)");
    } else {
      await checkAndIssueCerts(studentId, "HR Portal");
    }
    
    res.json({ success: true });
  } catch(e) {
    console.error('[HR-Approve] Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/v2/certificates/pay-fine — HR marks a fine as paid and triggers issuance
router.post('/pay-fine', async (req, res) => {
  try {
    const { studentId, fineType } = req.body; // fineType: 'loc_attendance' or 'lor_criteria'
    
    // Find student, update the specific fine to paid = true
    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    
    let fineFound = false;
    if (student.pendingFines) {
      student.pendingFines.forEach(f => {
        if (f.fineType === fineType && !f.paid) {
          f.paid = true;
          fineFound = true;
        }
      });
    }
    
    if (fineFound) {
      // Also update locStatus / lorStatus back from fine_pending to pending_hr so it gets processed
      if (fineType === 'loc_attendance' && student.locStatus === 'fine_pending') {
        student.locStatus = 'pending_hr';
      } else if (fineType === 'lor_criteria' && student.lorStatus === 'fine_pending') {
        student.lorStatus = 'pending_hr';
      }
      
      await student.save();
      // Auto run certificate checks!
      await checkAndIssueCerts(studentId);
      return res.json({ success: true, message: `Fine of type ${fineType} successfully marked as paid and certificate generated` });
    } else {
      return res.status(400).json({ success: false, message: `No unpaid fine of type ${fineType} found for this student` });
    }
  } catch(e) {
    console.error('[Pay-Fine] Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});
  
// POST /api/v2/certificates/coordinator-approve — Coordinator marks completion
router.post('/coordinator-approve', async (req, res) => {
  try {
    const { studentId } = req.body;
    await Student.findByIdAndUpdate(studentId, {
      internshipCompleted: true,
      internshipCompletedAt: new Date(),
      coordinatorApprovedAt: new Date(),
      coordinatorApprovalStatus: 'approved',
      locStatus: 'pending_hr',
      lorStatus: 'pending_hr',
    });
    await checkAndIssueCerts(studentId);
    res.json({ success: true });
  } catch(e) {
    console.error('[Coordinator-Approve] Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});
  
// POST /api/v2/certificates/star-submit — Student submits star contribution
router.post('/star-submit', async (req, res) => {
  try {
    const { employeeId, contribution } = req.body;
    await Student.findOneAndUpdate({ employeeId }, {
      starStatus: 'pending_review',
      starContribution: contribution,
    });
    res.json({ success: true });
  } catch(e) {
    console.error('[Star-Submit] Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});
  
// GET /api/v2/certificates/my-certs — Student fetches their certificate status (smart/merged)
router.get('/my-certs', async (req, res) => {
    return handleMyCerts(req, res);
});
  
// GET /api/v2/certificates/download/:type — Download PDF
router.get('/download/:type', async (req, res) => {
  try {
    const { employeeId } = req.query;
    const type = req.params.type.toUpperCase();
    const student = await Student.findOne({ employeeId }).lean();
    if (!student) return res.status(404).json({ error: 'Not found' });
  
    const pdfMap = { LOC:'locPdfBase64', LOR:'lorPdfBase64', STAR:'starPdfBase64', OFFER:'offerPdfBase64' };
    const b64 = student[pdfMap[type]];
    if (!b64) {
      // Fallback: Check StudentDocument for legacy / file system PDF
      try {
        const StudentDocument = require("../../../models/new/StudentDocument");
        const docRec = await StudentDocument.findOne({ studentId: student._id }).lean();
        let fileUrl = '';
        if (type === 'OFFER' && docRec && docRec.offerLetterUrl) {
          fileUrl = docRec.offerLetterUrl;
        } else if (type === 'LOC' && docRec && docRec.locUrl) {
          fileUrl = docRec.locUrl;
        } else if (type === 'LOR' && docRec && docRec.lorUrl) {
          fileUrl = docRec.lorUrl;
        }
        
        if (fileUrl) {
          const absolutePath = path.join(__dirname, "../..", fileUrl);
          if (fs.existsSync(absolutePath)) {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="TEN-${type}-${employeeId}.pdf"`);
            return res.sendFile(absolutePath);
          }
        }
      } catch (fallbackErr) {
        console.error('[Download] StudentDocument fallback error:', fallbackErr.message);
      }
      
      return res.status(404).json({ error: 'Certificate not yet generated' });
    }
  
    const buffer = Buffer.from(b64, 'base64');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="TEN-${type}-${employeeId}.pdf"`);
    res.send(buffer);
  } catch(e) {
    console.error('[Download] Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});
  
// GET /api/v2/certificates/pending-hr — HR views what needs approval
router.get('/pending-hr', async (req, res) => {
  try {
    const students = await Student.find({
      $or: [
        { locStatus:  { $in: ['pending_hr'] } },
        { lorStatus:  { $in: ['pending_hr'] } },
        { starStatus: 'pending_review' },
        { coordinatorApprovalStatus: 'escalated_to_hr' },
      ]
    }, 'name fullName employeeId domain attendancePercentage performanceScore locStatus lorStatus starStatus coordinatorApprovalStatus internshipCompletedAt starContribution').lean();
    res.json({ students });
  } catch(e) {
    console.error('[Pending-HR] Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// CRON JOBS — SECTION 4
// ─────────────────────────────────────────────────────────────────────────────

// Cron 1: Coordinator didn't act in 24h → escalate to HR
cron.schedule('0 * * * *', async () => {
  try {
    const cutoff = new Date(Date.now() - 24*60*60*1000);
    const list = await Student.find({
      internshipCompleted: true,
      coordinatorApprovalStatus: 'pending',
      internshipCompletedAt: { $lt: cutoff },
    });
    for (const s of list) {
      await Student.findByIdAndUpdate(s._id, {
        coordinatorApprovalStatus: 'escalated_to_hr',
        locStatus: 'pending_hr',
        lorStatus: 'pending_hr',
      });
      console.log(`[CertCron-1] Escalated ${s.employeeId} → HR (coordinator 24h timeout)`);
    }
  } catch (e) {
    console.error('[CertCron-1] Error:', e.message);
  }
});
  
// Cron 2: HR didn't act in 24h → auto-process certs
cron.schedule('20 * * * *', async () => {
  try {
    const cutoff = new Date(Date.now() - 24*60*60*1000);
    const list = await Student.find({
      $or: [{ locStatus:'pending_hr' }, { lorStatus:'pending_hr' }],
      coordinatorApprovedAt: { $lt: cutoff },
    });
    for (const s of list) {
      console.log(`[CertCron-2] Auto-issuing certs for ${s.employeeId}`);
      await checkAndIssueCerts(s._id.toString());
    }
  } catch (e) {
    console.error('[CertCron-2] Error:', e.message);
  }
});
  
// Cron 3: Offer letter auto-generate 24h after doc upload if HR hasn't acted
cron.schedule('40 * * * *', async () => {
  try {
    const cutoff = new Date(Date.now() - 24*60*60*1000);
    const list = await Student.find({
      offerLetterStatus: { $in: ['pending', 'under_review'] },
      documentsSubmittedAt: { $lt: cutoff },
    });
    for (const s of list) {
      console.log(`[CertCron-3] Auto-generating Offer Letter for ${s.employeeId}`);
      await generateAndSaveCert(s._id.toString(), 'OFFER', s, "System Automation");
    }
  } catch (e) {
    console.error('[CertCron-3] Error:', e.message);
  }
});

router.generateAndSaveCert = generateAndSaveCert;
router.checkAndIssueCerts = checkAndIssueCerts;

module.exports = router;
