// NEW FEATURE: Student Portal V2 API Routes
"use strict";

const express      = require("express");
const router       = express.Router();
const Student      = require("../../models/Student");

// NEW FEATURE: Dynamically add V2 fields to the Student schema if not present
const mongoose = require("mongoose");
if (!Student.schema.path("v2Onboarded"))    Student.schema.add({ v2Onboarded:    { type: Boolean, default: false } });
if (!Student.schema.path("v2DurationType")) Student.schema.add({ v2DurationType: { type: String,  default: null  } });
const StudentTaskProgress = require("../../models/new/StudentTaskProgress");
const DomainTask   = require("../../models/new/DomainTask");
const taskEngine   = require("../../services/v2/taskEngine");
const coinService  = require("../../services/v2/coinService");

// NEW FEATURE: Auth middleware — validate student by employeeId header/body
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

// ────────────────────────────────────────────────
// POST /api/v2/student/onboard
// Select domain + duration; assign tasks; award welcome coins
// ────────────────────────────────────────────────
router.post("/student/onboard", requireStudent, async (req, res) => {
    try {
        const { durationType } = req.body;
        const student = req.student;

        const validDurations = ["45days", "1month", "3months", "6months"];
        if (!validDurations.includes(durationType)) {
            return res.status(400).json({ success: false, message: "Invalid duration type" });
        }

        // Save v2 settings on the student (use updateOne to ensure dynamic fields are persisted)
        await Student.updateOne(
            { _id: student._id },
            { $set: { v2Onboarded: true, v2DurationType: durationType } }
        );
        student.v2Onboarded    = true;
        student.v2DurationType = durationType;

        // Assign tasks (idempotent)
        const result = await taskEngine.assignTasksForStudent(student);

        // Welcome bonus (only on first onboard)
        const coinResult = await coinService.awardCoins(student._id, "ONBOARD_BONUS");

        res.json({
            success: true,
            message: "Onboarding complete",
            tasksAssigned: result.total || 0,
            coinsAwarded:  coinResult.awarded,
            totalCoins:    coinResult.totalCoins
        });
    } catch (err) {
        console.error("[V2] onboard error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ────────────────────────────────────────────────
// GET /api/v2/student/status
// Returns onboard status + domain + durationType + coin balance
// ────────────────────────────────────────────────
router.get("/student/status", requireStudent, async (req, res) => {
    try {
        const student = req.student;

        // NEW FEATURE: Derive onboard state from task-progress entries (bypasses Mongoose schema-field read issues)
        const [progressStats, sampleProgress, coinData] = await Promise.all([
            StudentTaskProgress.aggregate([
                { $match: { studentId: student._id } },
                { $group: { _id: "$status", count: { $sum: 1 } } }
            ]),
            StudentTaskProgress.findOne({ studentId: student._id }).populate("taskId", "durationType").lean(),
            coinService.getBalance(student._id)
        ]);

        const v2Onboarded  = !!sampleProgress;
        const durationType = (sampleProgress?.taskId?.durationType) || taskEngine.tenureToDurationType(student.tenure);

        const stats = {};
        for (const s of progressStats) stats[s._id] = s.count;

        res.json({
            success:       true,
            v2Onboarded,
            domain:        student.domain,
            durationType,
            totalCoins:    coinData.totalCoins,
            taskStats: {
                locked:      stats.locked      || 0,
                available:   stats.available   || 0,
                in_progress: stats.in_progress || 0,
                submitted:   stats.submitted   || 0,
                approved:    stats.approved    || 0
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ────────────────────────────────────────────────
// GET /api/v2/tasks/my-tasks
// Returns all tasks for the student grouped by week
// ────────────────────────────────────────────────
router.get("/tasks/my-tasks", requireStudent, async (req, res) => {
    try {
        const student = req.student;

        // Auto-assign if not yet done
        if (!student.v2Onboarded) {
            await taskEngine.assignTasksForStudent(student);
        }

        const data = await taskEngine.getStudentTasks(student);
        const { totalCoins } = await coinService.getBalance(student._id);

        res.json({ success: true, ...data, totalCoins });
    } catch (err) {
        console.error("[V2] my-tasks error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ────────────────────────────────────────────────
// POST /api/v2/tasks/:taskId/start
// Mark task as in_progress (student started it)
// ────────────────────────────────────────────────
router.post("/tasks/:taskId/start", requireStudent, async (req, res) => {
    try {
        const student = req.student;
        const taskId  = req.params.taskId;

        const progress = await StudentTaskProgress.findOne({ studentId: student._id, taskId });
        if (!progress) return res.status(404).json({ success: false, message: "Task not assigned" });
        if (!["available"].includes(progress.status)) {
            return res.json({ success: true, status: progress.status });
        }

        progress.status    = "in_progress";
        progress.startedAt = new Date();
        await progress.save();

        res.json({ success: true, status: "in_progress" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ────────────────────────────────────────────────
// POST /api/v2/tasks/:taskId/submit
// Submit a task (url + notes)
// ────────────────────────────────────────────────
router.post("/tasks/:taskId/submit", requireStudent, async (req, res) => {
    try {
        const student = req.student;
        const taskId  = req.params.taskId;
        const { submissionUrl, submissionNotes } = req.body;

        if (!submissionUrl && !submissionNotes) {
            return res.status(400).json({ success: false, message: "Submission URL or notes required" });
        }

        const progress = await StudentTaskProgress.findOne({ studentId: student._id, taskId });
        if (!progress) return res.status(404).json({ success: false, message: "Task not assigned to you" });
        if (!["available", "in_progress", "rejected"].includes(progress.status)) {
            return res.status(400).json({ success: false, message: `Cannot submit: task is ${progress.status}` });
        }

        progress.status          = "submitted";
        progress.submissionUrl   = submissionUrl  || progress.submissionUrl;
        progress.submissionNotes = submissionNotes || progress.submissionNotes;
        progress.submittedAt     = new Date();
        if (!progress.startedAt) progress.startedAt = new Date();
        await progress.save();

        res.json({ success: true, message: "Task submitted successfully", status: "submitted" });
    } catch (err) {
        console.error("[V2] submit error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ────────────────────────────────────────────────
// PATCH /api/v2/tasks/:taskId/video-progress
// Update video watch percentage (0-100)
// ────────────────────────────────────────────────
router.patch("/tasks/:taskId/video-progress", requireStudent, async (req, res) => {
    try {
        const student = req.student;
        const taskId  = req.params.taskId;
        const percent = Math.min(100, Math.max(0, parseInt(req.body.percent) || 0));

        const progress = await StudentTaskProgress.findOne({ studentId: student._id, taskId });
        if (!progress) return res.status(404).json({ success: false, message: "Task not assigned" });

        const wasWatched = progress.videoWatchedPercent >= 90;
        progress.videoWatchedPercent = Math.max(progress.videoWatchedPercent, percent);

        // Award video-watched coins on first 90% completion
        let coinsAwarded = 0;
        if (!wasWatched && progress.videoWatchedPercent >= 90) {
            const result = await coinService.awardCoins(student._id, "VIDEO_WATCHED");
            coinsAwarded = result.awarded;
        }

        await progress.save();
        res.json({ success: true, videoWatchedPercent: progress.videoWatchedPercent, coinsAwarded });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ────────────────────────────────────────────────
// POST /api/v2/tasks/:progressId/approve  (coordinator)
// Approve a task — awards coins + unlocks next week
// ────────────────────────────────────────────────
router.post("/tasks/:progressId/approve", async (req, res) => {
    try {
        // NEW FEATURE: coordinator approval via Bearer hr_ token or coordinator session
        const auth = req.headers.authorization || "";
        if (!auth.startsWith("Bearer ")) {
            return res.status(401).json({ success: false, message: "Coordinator auth required" });
        }

        const { feedback, studentEmployeeId } = req.body;
        if (!studentEmployeeId) return res.status(400).json({ success: false, message: "studentEmployeeId required" });

        const student = await Student.findOne({ employeeId: studentEmployeeId });
        if (!student) return res.status(404).json({ success: false, message: "Student not found" });

        const result = await taskEngine.approveTask(student, req.params.progressId, null, feedback);
        if (result.error) return res.status(400).json({ success: false, message: result.error });

        res.json({ success: true, ...result });
    } catch (err) {
        console.error("[V2] approve error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ────────────────────────────────────────────────
// POST /api/v2/tasks/:progressId/reject  (coordinator)
// Reject a task submission
// ────────────────────────────────────────────────
router.post("/tasks/:progressId/reject", async (req, res) => {
    try {
        const auth = req.headers.authorization || "";
        if (!auth.startsWith("Bearer ")) {
            return res.status(401).json({ success: false, message: "Coordinator auth required" });
        }

        const { feedback, studentEmployeeId } = req.body;
        if (!studentEmployeeId) return res.status(400).json({ success: false, message: "studentEmployeeId required" });

        const student = await Student.findOne({ employeeId: studentEmployeeId });
        if (!student) return res.status(404).json({ success: false, message: "Student not found" });

        const progress = await StudentTaskProgress.findById(req.params.progressId);
        if (!progress) return res.status(404).json({ success: false, message: "Progress not found" });
        if (progress.studentId.toString() !== student._id.toString()) {
            return res.status(403).json({ success: false, message: "Forbidden" });
        }

        progress.status              = "rejected";
        progress.coordinatorFeedback = feedback || "";
        await progress.save();

        res.json({ success: true, message: "Task rejected" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ────────────────────────────────────────────────
// GET /api/v2/coordinator/submissions
// All submitted tasks for coordinator's domain
// ────────────────────────────────────────────────
router.get("/coordinator/submissions", async (req, res) => {
    try {
        const auth = req.headers.authorization || "";
        if (!auth.startsWith("Bearer ")) {
            return res.status(401).json({ success: false, message: "Coordinator auth required" });
        }
        const domain = req.query.domain;
        if (!domain) return res.status(400).json({ success: false, message: "domain query param required" });

        const tasks = await DomainTask.find({ domain }).lean();
        const taskIds = tasks.map(t => t._id);
        const taskMap = {};
        for (const t of tasks) taskMap[t._id.toString()] = t;

        const submissions = await StudentTaskProgress.find({
            taskId: { $in: taskIds },
            status: "submitted"
        }).populate("studentId", "firstName lastName employeeId email domain").lean();

        const result = submissions.map(s => ({
            progressId:      s._id,
            studentName:     s.studentId ? `${s.studentId.firstName} ${s.studentId.lastName}`.trim() : "Unknown",
            employeeId:      s.studentId ? s.studentId.employeeId : "",
            studentEmail:    s.studentId ? s.studentId.email : "",
            taskTitle:       taskMap[s.taskId.toString()]?.taskTitle || "Unknown Task",
            weekNumber:      taskMap[s.taskId.toString()]?.weekNumber || 0,
            coinReward:      taskMap[s.taskId.toString()]?.coinReward || 0,
            submissionUrl:   s.submissionUrl,
            submissionNotes: s.submissionNotes,
            submittedAt:     s.submittedAt
        }));

        res.json({ success: true, submissions: result });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ────────────────────────────────────────────────
// GET /api/v2/coins/balance
// ────────────────────────────────────────────────
router.get("/coins/balance", requireStudent, async (req, res) => {
    try {
        const data = await coinService.getBalance(req.student._id);
        res.json({ success: true, ...data });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ────────────────────────────────────────────────
// GET /api/v2/coins/history
// ────────────────────────────────────────────────
router.get("/coins/history", requireStudent, async (req, res) => {
    try {
        const data = await coinService.getBalance(req.student._id);
        res.json({ success: true, history: data.coinsHistory, totalCoins: data.totalCoins });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ────────────────────────────────────────────────
// GET /api/v2/leaderboard
// Top 20 students by coin balance (public)
// ────────────────────────────────────────────────
router.get("/leaderboard", async (req, res) => {
    try {
        const { StudentCoin } = require("../../models/new/StudentCoin");
        const top = await require("../../models/new/StudentCoin").find()
            .sort({ totalCoins: -1 })
            .limit(20)
            .populate("studentId", "firstName lastName domain")
            .lean();

        const board = top.map((entry, i) => ({
            rank:       i + 1,
            name:       entry.studentId ? `${entry.studentId.firstName} ${entry.studentId.lastName}`.trim() : "Anonymous",
            domain:     entry.studentId?.domain || "",
            totalCoins: entry.totalCoins
        }));

        res.json({ success: true, leaderboard: board });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

module.exports = router;
