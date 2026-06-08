// NEW FEATURE: Student Portal V2 API Routes
"use strict";

const express = require("express");
const router = express.Router();
const Student = require("../../models/Student");
const StudentTaskProgress = require("../../models/new/StudentTaskProgress");
const DomainTask = require("../../models/new/DomainTask");
const taskEngine = require("../../services/v2/taskEngine");
const coinService = require("../../services/v2/coinService");
const quizEngine = require("../../services/v2/quizEngine");
const { getEmployeeIdFromRequest, issueStudentToken } = require("../../services/v2/auth");

const FALLBACK_VIDEOS = {
    "Python Development": { 1: "https://www.youtube.com/watch?v=rfscVS0vtbw", 2: "https://www.youtube.com/watch?v=t8pPdKYpowI", 3: "https://www.youtube.com/watch?v=W8KRzm-HUcc" },
    "Java Development": { 1: "https://www.youtube.com/watch?v=eIrMbAQSU34", 2: "https://www.youtube.com/watch?v=GoXwIVyNvX0", 3: "https://www.youtube.com/watch?v=IttZfFoMnAI" },
    "DevOps with AWS": { 1: "https://www.youtube.com/watch?v=ROjZy1WbCIA", 2: "https://www.youtube.com/watch?v=6YZvp2GwT0A", 3: "https://www.youtube.com/watch?v=fqMOX6JJhGo" },
    "Web Development": { 1: "https://www.youtube.com/watch?v=mU6anWqZJcc", 2: "https://www.youtube.com/watch?v=G3e-cpL7ofc", 3: "https://www.youtube.com/watch?v=916GWv2Qs08" },
    "MERN Stack Development": { 1: "https://www.youtube.com/watch?v=7CqJlxBYj-M", 2: "https://www.youtube.com/watch?v=SqcY0GlETPk", 3: "https://www.youtube.com/watch?v=-0exw-9YJBo" },
    "Artificial Intelligence": { 1: "https://www.youtube.com/watch?v=aircAruvnKk", 2: "https://www.youtube.com/watch?v=JMUxmLyrhSk", 3: "https://www.youtube.com/watch?v=tpCFfeUEGs8" },
    "Data Science": { 1: "https://www.youtube.com/watch?v=ua-CiDNNj30", 2: "https://www.youtube.com/watch?v=vmEHCJofslg", 3: "https://www.youtube.com/watch?v=LHBE6Q9XlzI" },
    "Cyber Security": { 1: "https://www.youtube.com/watch?v=inWWhr5tnEA", 2: "https://www.youtube.com/watch?v=3Kq1MIfTWCE", 3: "https://www.youtube.com/watch?v=U_P23SqJaDc" },
    "Software Engineering": { 1: "https://www.youtube.com/watch?v=QHE5g9YQm7A", 2: "https://www.youtube.com/watch?v=qnaxm0Ye4eQ", 3: "https://www.youtube.com/watch?v=3R9SpICe5y0" },
    "Flutter Development": { 1: "https://www.youtube.com/watch?v=VPvVD8t02U8", 2: "https://www.youtube.com/watch?v=1gDhl4leEzA", 3: "https://www.youtube.com/watch?v=x0uinJvhNxI" },
    "HR Management": { 1: "https://www.youtube.com/watch?v=8fS6U2bSUGY", 2: "https://www.youtube.com/watch?v=VdN0Jr5Jb2Y", 3: "https://www.youtube.com/watch?v=ndh0E0gV2ko" },
    "Business Analyst": { 1: "https://www.youtube.com/watch?v=QoAOzMTLP5s", 2: "https://www.youtube.com/watch?v=Ib_8WG9T0Kk", 3: "https://www.youtube.com/watch?v=vmEHCJofslg" },
    "Venture Capital": { 1: "https://www.youtube.com/watch?v=gRaXB5hNuX4", 2: "https://www.youtube.com/watch?v=bCGkSFwbFXc", 3: "https://www.youtube.com/watch?v=ZCFkWDdmXG8" },
    "Vibe Coding": { 1: "https://www.youtube.com/watch?v=zOjov-2OZ0E", 2: "https://www.youtube.com/watch?v=Ke90Tje7VS0", 3: "https://www.youtube.com/watch?v=F2JCjVSZlG0" },
    "Space Research": { 1: "https://www.youtube.com/watch?v=21X5lGlDOfg", 2: "https://www.youtube.com/watch?v=wwMDvPCGeE0", 3: "https://www.youtube.com/watch?v=44cv416bKP4" },
    "HR": { 1: "https://www.youtube.com/watch?v=8fS6U2bSUGY", 2: "https://www.youtube.com/watch?v=VdN0Jr5Jb2Y", 3: "https://www.youtube.com/watch?v=ndh0E0gV2ko" }
};

async function requireStudent(req, res, next) {
    try {
        const employeeId = getEmployeeIdFromRequest(req);
        if (!employeeId) return res.status(401).json({ success: false, message: "Authentication required" });
        const student = await Student.findOne({ employeeId: String(employeeId) });
        if (!student) return res.status(401).json({ success: false, message: "Student not found" });
        req.student = student;
        next();
    } catch (err) {
        res.status(500).json({ success: false, message: "Auth error" });
    }
}

function resolveFallbackVideo(domain, weekNumber) {
    const safeWeek = Math.max(1, parseInt(weekNumber, 10) || 1);
    const domainMap = FALLBACK_VIDEOS[domain] || FALLBACK_VIDEOS.HR || {};
    if (domainMap[safeWeek]) return domainMap[safeWeek];
    for (let w = safeWeek; w >= 1; w -= 1) {
        if (domainMap[w]) return domainMap[w];
    }
    return domainMap[1] || null;
}

function buildYouTubeSearchUrl(domain, taskTitle) {
    const q = encodeURIComponent(`${domain} ${taskTitle || "tutorial"} tutorial`);
    return `https://www.youtube.com/results?search_query=${q}`;
}

function getEndDate(student) {
    if (!student.joiningDate) return null;
    const joined = new Date(student.joiningDate);
    if (Number.isNaN(joined.getTime())) return null;
    const tenure = String(student.tenure || "").toLowerCase();
    const days = tenure.includes("45") ? 45 : tenure.includes("6") ? 180 : tenure.includes("3") ? 90 : 30;
    joined.setDate(joined.getDate() + days);
    return joined.toISOString();
}

async function buildStudentPayload(student) {
    const [progressStats, sampleProgress, coinData] = await Promise.all([
        StudentTaskProgress.aggregate([
            { $match: { studentId: student._id } },
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]),
        StudentTaskProgress.findOne({ studentId: student._id }).populate("taskId", "durationType").lean(),
        coinService.getBalance(student._id)
    ]);

    const stats = {};
    for (const row of progressStats) stats[row._id] = row.count;
    const durationType = (sampleProgress?.taskId?.durationType) || student.v2DurationType || taskEngine.tenureToDurationType(student.tenure);

    return {
        employeeId: student.employeeId,
        name: [student.firstName, student.lastName].filter(Boolean).join(" ").trim() || student.name || student.employeeId,
        firstName: student.firstName || "",
        lastName: student.lastName || "",
        domain: student.domain,
        tenure: student.tenure || "",
        joiningDate: student.joiningDate || null,
        internshipEnd: getEndDate(student),
        email: student.email || "",
        phone: student.whatsapp || "",
        college: student.collegeName || student.college || "",
        linkedDomains: student.linkedDomains || [],
        onboardingPopupSeen: !!student.onboardingPopupSeen,
        joinerTypeSelected: !!student.joinerTypeSelected,
        joinerType: student.joinerType || null,
        v2Onboarded: !!sampleProgress || !!student.v2Onboarded,
        durationType,
        totalCoins: coinData.totalCoins,
        rupeeValue: coinData.rupeeValue,
        taskStats: {
            locked: stats.locked || 0,
            available: stats.available || 0,
            in_progress: stats.in_progress || 0,
            submitted: stats.submitted || 0,
            approved: stats.approved || 0
        }
    };
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

        const firstOnboard = !student.v2Onboarded;
        await Student.updateOne(
            { _id: student._id },
            { $set: { v2Onboarded: true, v2DurationType: durationType } }
        );
        student.v2Onboarded = true;
        student.v2DurationType = durationType;

        const result = await taskEngine.assignTasksForStudent(student);
        let coinResult = { awarded: 0, totalCoins: 0 };
        if (firstOnboard && !student.coinMilestones?.onboardingCompleted) {
            coinResult = await coinService.awardCoins(student._id, "ONBOARD_BONUS", null, { actionKey: "onboarding_completed" });
            await Student.updateOne({ _id: student._id }, { $set: { "coinMilestones.onboardingCompleted": true } });
        } else {
            coinResult = await coinService.getBalance(student._id);
            coinResult.awarded = 0;
        }

        res.json({
            success: true,
            message: "Onboarding complete",
            tasksAssigned: result.total || 0,
            coinsAwarded: coinResult.awarded,
            totalCoins: coinResult.totalCoins,
            rupeeValue: coinResult.rupeeValue
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
        const payload = await buildStudentPayload(req.student);
        res.json({ success: true, ...payload });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

router.get("/student/me", requireStudent, async (req, res) => {
    try {
        const payload = await buildStudentPayload(req.student);
        res.json({ success: true, token: issueStudentToken(req.student), student: payload });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

router.post("/student/mark-onboarding-seen", requireStudent, async (req, res) => {
    try {
        await Student.updateOne({ _id: req.student._id }, { $set: { onboardingPopupSeen: true } });
        res.json({ success: true, onboardingPopupSeen: true });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

router.post("/student/set-joiner-type", requireStudent, async (req, res) => {
    try {
        const joinerType = req.body && req.body.joinerType;
        if (!["new", "whatsapp"].includes(joinerType)) {
            return res.status(400).json({ success: false, message: "Invalid joiner type" });
        }
        await Student.updateOne(
            { _id: req.student._id },
            { $set: { joinerTypeSelected: true, joinerType } }
        );
        res.json({ success: true, joinerTypeSelected: true, joinerType });
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

        if (!student.v2Onboarded) {
            await taskEngine.assignTasksForStudent(student);
        }

        const data = await taskEngine.getStudentTasks(student);
        const { totalCoins, rupeeValue } = await coinService.getBalance(student._id);

        res.json({ success: true, ...data, totalCoins, rupeeValue });
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

        if (!student.coinMilestones?.firstTaskSubmitted) {
            await coinService.awardCoins(student._id, "FIRST_TASK_SUBMITTED", null, { actionKey: "first_task_submitted" });
            await Student.updateOne({ _id: student._id }, { $set: { "coinMilestones.firstTaskSubmitted": true } });
        }

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
        const taskId = req.params.taskId;
        const percent = Math.min(100, Math.max(0, parseInt(req.body.percent) || 0));

        const progress = await StudentTaskProgress.findOne({ studentId: req.student._id, taskId });
        if (!progress) return res.status(404).json({ success: false, message: "Task not assigned" });

        progress.videoWatchedPercent = Math.max(progress.videoWatchedPercent, percent);
        if (!progress.quiz_unlocked_at && progress.videoWatchedPercent >= 80) progress.quiz_unlocked_at = new Date();

        await progress.save();
        res.json({
            success: true,
            videoWatchedPercent: progress.videoWatchedPercent,
            quizUnlocked: progress.videoWatchedPercent >= 80
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

router.post("/student/generate-quiz", requireStudent, async (req, res) => {
    try {
        const { taskId, weekNumber, durationType } = req.body || {};
        const result = await quizEngine.generateQuizForStudent(req.student, {
            taskId,
            weekNumber,
            durationType: durationType || req.student.v2DurationType
        });
        if (result.error) return res.status(400).json({ success: false, message: result.error });
        res.json({ success: true, ...result });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

router.post("/student/report-broken-video", requireStudent, async (req, res) => {
    try {
        const { taskId, domain, weekNumber, taskTitle } = req.body || {};
        if (!taskId) return res.status(400).json({ success: false, message: "taskId required" });
        const task = await DomainTask.findById(taskId);
        if (!task) return res.status(404).json({ success: false, message: "Task not found" });

        const fallbackVideoUrl = resolveFallbackVideo(domain || task.domain, weekNumber || task.weekNumber);
        await StudentTaskProgress.updateOne(
            { studentId: req.student._id, taskId: task._id },
            { $set: { brokenVideoReportedAt: new Date() } }
        );

        if (!fallbackVideoUrl) {
            return res.json({
                success: true,
                fallbackVideoUrl: null,
                searchUrl: buildYouTubeSearchUrl(domain || task.domain, taskTitle || task.taskTitle)
            });
        }

        task.fallbackVideoUrl = fallbackVideoUrl;
        task.videoUrl = fallbackVideoUrl;
        await task.save();

        res.json({ success: true, fallbackVideoUrl, searchUrl: null });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

router.post("/student/daily-job-post", requireStudent, async (req, res) => {
    try {
        const platforms = Array.isArray(req.body?.platforms) ? req.body.platforms.filter(Boolean) : [];
        const formFilled = !!req.body?.formFilled;
        const date = String(req.body?.date || new Date().toISOString().slice(0, 10));
        if (!platforms.length) {
            return res.status(400).json({ success: false, message: "Select at least one platform" });
        }

        const baseReward = await coinService.awardCoins(
            req.student._id,
            "DAILY_JOB_POSTING",
            { platforms: platforms.length },
            {
                actionKey: `daily_job_post_${date}`,
                meta: { date, platforms }
            }
        );

        let bonusReward = { awarded: 0 };
        if (formFilled) {
            bonusReward = await coinService.awardCoins(
                req.student._id,
                "DAILY_JOB_FORM_BONUS",
                null,
                {
                    actionKey: `daily_job_post_form_${date}`,
                    meta: { date, formFilled: true }
                }
            );
        }

        const balance = await coinService.getBalance(req.student._id);
        res.json({
            success: true,
            coinsAwarded: (baseReward.awarded || 0) + (bonusReward.awarded || 0),
            totalCoins: balance.totalCoins,
            rupeeValue: balance.rupeeValue
        });
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
        res.json({ success: true, history: data.coinsHistory, totalCoins: data.totalCoins, rupeeValue: data.rupeeValue });
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
        const top = await require("../../models/new/StudentCoin").find()
            .sort({ totalCoins: -1 })
            .limit(20)
            .populate("studentId", "firstName lastName domain")
            .lean();

        const board = top.map((entry, i) => ({
            rank:       i + 1,
            name:       entry.studentId ? `${entry.studentId.firstName} ${entry.studentId.lastName}`.trim() : "Anonymous",
            domain:     entry.studentId?.domain || "",
            totalCoins: entry.totalCoins,
            rupeeValue: coinService.toRupeeValue(entry.totalCoins)
        }));

        res.json({ success: true, leaderboard: board });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

module.exports = router;
