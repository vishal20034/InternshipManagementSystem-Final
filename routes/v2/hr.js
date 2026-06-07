"use strict";

const express = require("express");
const router = express.Router();

const Student = require("../../models/Student");
const Coordinator = require("../../models/Coordinator");
const StudentDocument = require("../../models/new/StudentDocument");
const StudentCertificate = require("../../models/new/StudentCertificate");
const StudentTaskProgress = require("../../models/new/StudentTaskProgress");
const DomainTask = require("../../models/new/DomainTask");
const StudentCoin = require("../../models/new/StudentCoin");
const CoordinatorCoin = require("../../models/new/CoordinatorCoin");
const DocumentHistory = require("../../models/DocumentHistory");
const MailHistory = require("../../models/MailHistory");
const taskEngine = require("../../services/v2/taskEngine");
const { generateDocumentNumber, normalizeDocumentNumber } = require("../../utils/documentNumber");

async function requireHR(req, res, next) {
  try {
    const auth = req.headers["authorization"] || req.headers["Authorization"] || "";
    if (auth && auth.startsWith("Bearer hr_")) {
      req.hrUser = { token: auth };
      return next();
    }
    return res.status(401).json({ success: false, message: "HR authentication required" });
  } catch (_) {
    return res.status(500).json({ success: false, message: "HR auth error" });
  }
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

router.get("/dashboard-stats", requireHR, async (_req, res) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalStudents,
      activeStudents,
      pendingDocuments,
      offerLettersSent,
      certificatesIssued,
      expertIssued,
      nanoIssued,
      fellowshipIssued,
      totalCoordinators,
      documentsToday
    ] = await Promise.all([
      Student.countDocuments(),
      Student.countDocuments({ lastActiveDate: { $gte: sevenDaysAgo } }),
      StudentDocument.countDocuments({ uploadStatus: "pending" }),
      DocumentHistory.countDocuments({ $or: [{ documentKey: "offer_letter" }, { documentType: /offer/i }] }),
      StudentCertificate.countDocuments({ issuedAt: { $ne: null } }),
      StudentCertificate.countDocuments({ certificateType: "expert", issuedAt: { $ne: null } }),
      StudentCertificate.countDocuments({ certificateType: "nano_degree", issuedAt: { $ne: null } }),
      StudentCertificate.countDocuments({ certificateType: "fellowship", issuedAt: { $ne: null } }),
      Coordinator.countDocuments(),
      DocumentHistory.countDocuments({ sentAt: { $gte: startOfToday() } })
    ]);

    res.json({
      success: true,
      total_students: totalStudents,
      active_students: activeStudents,
      pending_documents: pendingDocuments,
      offer_letters_sent: offerLettersSent,
      certificates_issued: certificatesIssued,
      total_coordinators: totalCoordinators,
      documents_today: documentsToday,
      certificates: { expert: expertIssued, nano_degree: nanoIssued, fellowship: fellowshipIssued }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/internship-tracker", requireHR, async (_req, res) => {
  try {
    const students = await Student.find()
      .select("firstName lastName name email employeeId domain tenure joiningDate createdAt lastActiveDate v2DurationType")
      .lean();

    const taskGroups = await DomainTask.aggregate([
      { $group: { _id: { domain: "$domain", durationType: "$durationType" }, total: { $sum: 1 }, maxWeek: { $max: "$weekNumber" } } }
    ]);
    const taskCountMap = new Map(
      taskGroups.map((g) => [`${g._id.domain}|||${g._id.durationType}`, { total: g.total, maxWeek: g.maxWeek }])
    );

    const progressAgg = await StudentTaskProgress.aggregate([
      {
        $group: {
          _id: "$studentId",
          total: { $sum: 1 },
          approved: { $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] } },
          maxApprovedAt: { $max: "$approvedAt" },
          maxUpdatedAt: { $max: "$updatedAt" }
        }
      }
    ]);
    const progressMap = new Map(progressAgg.map((p) => [p._id.toString(), p]));

    const approvedWeekAgg = await StudentTaskProgress.aggregate([
      { $match: { status: "approved" } },
      {
        $lookup: {
          from: "domaintasks",
          localField: "taskId",
          foreignField: "_id",
          as: "task"
        }
      },
      { $unwind: "$task" },
      { $group: { _id: "$studentId", maxWeekApproved: { $max: "$task.weekNumber" } } }
    ]);
    const weekMap = new Map(approvedWeekAgg.map((w) => [w._id.toString(), w.maxWeekApproved || 0]));

    const coins = await StudentCoin.find({ studentId: { $in: students.map((s) => s._id) } })
      .select("studentId totalCoins")
      .lean();
    const coinMap = new Map(coins.map((c) => [c.studentId.toString(), c.totalCoins || 0]));

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const rows = students.map((s) => {
      const studentName =
        (s.name || `${s.firstName || ""} ${s.lastName || ""}`.trim() || s.email || "").trim();
      const employeeId = s.employeeId || "";
      const domain = s.domain || "";
      const durationType = s.v2DurationType || taskEngine.tenureToDurationType(s.tenure);
      const taskKey = `${domain}|||${durationType}`;
      const taskMeta = taskCountMap.get(taskKey) || { total: 0, maxWeek: 0 };

      const p = progressMap.get(s._id.toString()) || { total: 0, approved: 0, maxApprovedAt: null, maxUpdatedAt: null };
      const approvedCount = p.approved || 0;
      const totalTasks = taskMeta.total || p.total || 0;
      const progressPercent = totalTasks ? Math.round((approvedCount / totalTasks) * 100) : 0;
      const maxWeekApproved = weekMap.get(s._id.toString()) || 0;
      const currentWeek = Math.min((maxWeekApproved || 0) + 1, taskMeta.maxWeek || (maxWeekApproved || 0) + 1);

      const lastActivity = p.maxApprovedAt || p.maxUpdatedAt || s.lastActiveDate || null;
      const completed = totalTasks > 0 && approvedCount >= totalTasks;
      let status = "at_risk";
      if (completed) status = "completed";
      else if (lastActivity && new Date(lastActivity) >= sevenDaysAgo && approvedCount > 0) status = "active";
      else if (lastActivity && new Date(lastActivity) >= fourteenDaysAgo) status = "active";

      const joinDate = s.joiningDate ? new Date(s.joiningDate) : s.createdAt ? new Date(s.createdAt) : null;

      return {
        student_id: s._id,
        student_name: studentName,
        employee_id: employeeId,
        domain,
        duration: s.tenure || "",
        duration_type: durationType,
        current_week: currentWeek,
        tasks_completed: approvedCount,
        total_tasks: totalTasks,
        progress_percent: progressPercent,
        coins: coinMap.get(s._id.toString()) || 0,
        join_date: joinDate,
        status
      };
    });

    res.json({ success: true, students: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/certificates", requireHR, async (_req, res) => {
  try {
    const certs = await StudentCertificate.find({ issuedAt: { $ne: null } }).sort({ issuedAt: -1 }).lean();
    const studentIds = [...new Set(certs.map((c) => c.studentId.toString()))];
    const students = await Student.find({ _id: { $in: studentIds } })
      .select("firstName lastName name employeeId email domain collegeName college tenure")
      .lean();
    const studentMap = new Map(students.map((s) => [s._id.toString(), s]));

    res.json({
      success: true,
      certificates: certs.map((c) => {
        const s = studentMap.get(c.studentId.toString());
        const studentName =
          (s?.name || `${s?.firstName || ""} ${s?.lastName || ""}`.trim() || s?.email || "").trim();
        return {
          student_id: c.studentId,
          student_name: studentName,
          employee_id: s?.employeeId || "",
          certificate_type: c.certificateType,
          domain: c.domain || s?.domain || "",
          document_number: c.certificateId || "",
          issue_date: c.issuedAt,
          payment_status: c.paymentStatus || "pending",
          pdf_url: c.pdfUrl,
          verification_url: c.verificationUrl
        };
      })
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/mail-history", requireHR, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10) || 1);
    const limit = 50;
    const skip = (page - 1) * limit;
    const total = await MailHistory.countDocuments();
    const records = await MailHistory.find().sort({ sentAt: -1 }).skip(skip).limit(limit).lean();
    res.json({ success: true, records, total, page });
  } catch (_) {
    res.status(500).json({ success: false, records: [], total: 0, page: 1 });
  }
});

router.get("/coordinators", requireHR, async (_req, res) => {
  try {
    const coordinators = await Coordinator.find().select("name email username domain createdAt").lean();

    const studentCounts = await Student.aggregate([{ $group: { _id: "$domain", count: { $sum: 1 } } }]);
    const studentsByDomain = new Map(studentCounts.map((d) => [d._id || "", d.count || 0]));

    const pendingByDomainAgg = await StudentTaskProgress.aggregate([
      { $match: { status: "submitted" } },
      { $lookup: { from: "domaintasks", localField: "taskId", foreignField: "_id", as: "task" } },
      { $unwind: "$task" },
      { $group: { _id: "$task.domain", pending: { $sum: 1 } } }
    ]);
    const pendingByDomain = new Map(pendingByDomainAgg.map((d) => [d._id || "", d.pending || 0]));

    const coins = await CoordinatorCoin.find().lean();
    const coinByCoordinatorId = new Map(coins.map((c) => [String(c.coordinatorId), c]));

    res.json({
      success: true,
      coordinators: coordinators.map((c) => {
        const key = String(c.email || c.username || c._id);
        const coin = coinByCoordinatorId.get(key);
        return {
          coordinator_id: c._id,
          coordinator_name: c.name || "",
          email: c.email || "",
          domain: c.domain || "",
          assigned_students: studentsByDomain.get(c.domain || "") || 0,
          pending_reviews: pendingByDomain.get(c.domain || "") || 0,
          performance_score: coin ? coin.performanceScore || 0 : 0,
          avg_review_time_hours: coin ? coin.avgReviewTimeHours || 0 : 0,
          status: "active"
        };
      })
    });
  } catch (_) {
    res.status(500).json({ success: false, coordinators: [] });
  }
});

router.post("/document-history/log", requireHR, async (req, res) => {
  try {
    const payload = req.body || {};
    const studentId = payload.studentId || payload.student_id || null;
    const student = studentId ? await Student.findById(studentId).select("firstName lastName name email employeeId domain collegeName college").lean() : null;
    const studentName =
      (payload.student_name || payload.studentName || student?.name || `${student?.firstName || ""} ${student?.lastName || ""}`.trim() || student?.email || "").trim();

    const documentKey = String(payload.document_key || payload.documentKey || payload.document_type || payload.documentType || "").trim();
    const documentType = String(payload.document_type_label || payload.documentType || payload.documentTypeLabel || "").trim() || documentKey;
    const documentNumber = normalizeDocumentNumber(payload.document_number || payload.documentNumber || payload.documentNo || generateDocumentNumber(documentKey || "doc"));

    await DocumentHistory.create({
      studentId: student?._id || studentId || null,
      studentName,
      studentEmail: payload.student_email || payload.studentEmail || student?.email || "",
      employeeId: payload.employee_id || payload.employeeId || student?.employeeId || "",
      college: payload.college || student?.collegeName || student?.college || "Not provided",
      domain: payload.domain || student?.domain || "",
      documentType,
      documentKey,
      documentNumber,
      sentAt: new Date(),
      sentBy: payload.sent_by || payload.sentBy || "HR Portal",
      sentToEmail: payload.sent_to_email || payload.sentToEmail || ""
    });

    res.json({ success: true, documentNumber });
  } catch (_) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;

