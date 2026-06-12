const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const Student = require("../../models/Student");
const Submission = require("../../models/Submission");
const Attendance = require("../../models/Attendance");
const Notification = require("../../models/Notification");
const TestQuestions = require("../../models/TestQuestions");
const TestResult = require("../../models/TestResult");
const Notice = require("../../models/Notice");
const Coordinator = require("../../models/Coordinator");
const BadgeAward = require("../../models/BadgeAward");
const CoordinatorTask = require("../../models/CoordinatorTask");
const path = require("path");
const multer = require("multer");
const upload = multer({ dest: path.join(__dirname, "../../uploads/") });

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
const MAJOR_BADGE_IDS = new Set(["outstanding","top_performer","graduate","attendance_champion"]);

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

function countDaysExcludingSundays(start, end){
    let count = 0;
    const cur = new Date(start); cur.setHours(0,0,0,0);
    const e = new Date(end);     e.setHours(0,0,0,0);
    while(cur <= e){
        if(cur.getDay() !== 0) count++;
        cur.setDate(cur.getDate() + 1);
    }
    return count;
}

function broadcastNotification(domain, employeeId, notif) {
    console.log(`[Notification Broadcast] domain=${domain} student=${employeeId} title=${notif?.title}`);
}

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
        if(e.code === 11000) return null;
        console.log("awardBadgeIfNew error:", e.message);
        return null;
    }
}

async function computeAttendanceStats(employeeId, joiningDate){
    const records = await Attendance.find({ employeeId });
    const self   = records.filter(r => r.markedBy === "self");
    const coord  = records.filter(r => r.markedBy === "coordinator");

    const selfPresent  = self.filter(r => r.status === "Present").length;
    const coordPresent = coord.filter(r => r.status === "Present").length;
    const coordAbsent  = coord.filter(r => r.status === "Absent").length;

    const presentDayKeys = new Set();
    records.forEach(r => { if(r.status === "Present") presentDayKeys.add(r.dateKey); });
    const combinedPresentDays = presentDayKeys.size;

    let workingDays = 0;
    const jd = parseJoinDate(joiningDate);
    if(jd){
        const today = new Date();
        const j = new Date(jd); j.setHours(0,0,0,0);
        const t = new Date(today); t.setHours(0,0,0,0);
        if(j <= t) workingDays = countDaysExcludingSundays(j, t);
    }

    if(workingDays < 1){
        return {
            selfPresent, selfTotal: self.length,
            coordPresent, coordAbsent, coordTotal: coord.length,
            combinedPresentDays, workingDays: 0,
            selfPct: 0, coordPct: 0, combinedPct: 0,
            eligible: false
        };
    }

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

function gradeForScore(score){
    if(score >= 90) return "Outstanding ⭐";
    if(score >= 75) return "Excellent 🟢";
    if(score >= 60) return "Good 🔵";
    if(score >= 45) return "Average 🟡";
    return "Needs Improvement 🔴";
}

async function calculatePerformance(studentRefOrId){
    const mongoose = require("mongoose");
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

    const attendanceScore = (Math.min(100, stats.combinedPct || 0) / 100) * 30;
    const taskScore = totalSubmitted > 0 ? (approved / totalSubmitted) * 35 : 0;
    const qualityScore = (approved / Math.max(totalSubmitted, 1)) * 25;

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
            combinedAttendancePct: stats.combinedPct,
            approved, totalSubmitted
        }
    };
}

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

        const stats = await computeAttendanceStats(student.employeeId, student.joiningDate);
        if((stats.combinedPct || 0) >= 50 && !student.milestones.reached50Attendance) student.milestones.reached50Attendance = today;
        if((stats.combinedPct || 0) >= 75 && !student.milestones.reached75Attendance) student.milestones.reached75Attendance = today;

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

async function buildDomainLeaderboard(domain, limit=10){
    const students = await Student.find({ domain }).sort({ createdAt: 1 });
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
    rows.sort((a,b) => b.score - a.score);
    return limit ? rows.slice(0, limit) : rows;
}

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

        if(totalMarked >= 1)                                          await awardBadgeIfNew(student, "first_step");
        if((student.bestStreak || 0) >= 7)                            await awardBadgeIfNew(student, "week_warrior");
        if(totalMarked >= 30)                                         await awardBadgeIfNew(student, "consistent");
        if((stats.combinedPct || 0) >= 90)                            await awardBadgeIfNew(student, "attendance_champion");

        if(totalSubmitted >= 1)                                       await awardBadgeIfNew(student, "first_task");
        if(approved >= 5)                                             await awardBadgeIfNew(student, "quick_learner");
        if(approved >= 10)                                            await awardBadgeIfNew(student, "task_master");
        if(approved >= 5 && rejected === 0)                           await awardBadgeIfNew(student, "perfectionist");

        if(perf && perf.score >= 75)                                  await awardBadgeIfNew(student, "rising_star");
        if(perf && perf.score >= 90)                                  await awardBadgeIfNew(student, "outstanding");

        if(student.joiningDate){
            const jKey = toDateKey(new Date(student.joiningDate));
            const attendedDay1 = attendance.some(a => a.dateKey === jKey);
            const submittedDay1 = submissions.some(s => toDateKey(new Date(s.submittedAt)) === jKey);
            if(attendedDay1 && submittedDay1)                         await awardBadgeIfNew(student, "day_one");
        }

        const tenureDays = (student.tenure || "").includes("6") ? 180
                         : (student.tenure || "").includes("3") ? 90
                         : 30;
        if(student.joiningDate){
            const j = new Date(student.joiningDate);
            const elapsed = (new Date() - j) / (1000*60*60*24);
            if(elapsed >= tenureDays * 0.5)                           await awardBadgeIfNew(student, "halfway_there");
            if(elapsed >= tenureDays)                                 await awardBadgeIfNew(student, "graduate");
        }

        if(student.domain){
            const lb = await buildDomainLeaderboard(student.domain, 1);
            if(lb.length && lb[0].employeeId === employeeId)          await awardBadgeIfNew(student, "top_performer");
        }
    }catch(e){ console.log("recomputeBadgesFor error:", e.message); }
}

// ── Students CRUD ───────────────────────────────────────────────────────────
router.get("/students", async (req, res) => {
    try { res.json(await Student.find().sort({ createdAt: -1 }).lean()); }
    catch (e) { res.status(500).json([]); }
});

router.get("/students/:id", async (req, res) => {
    try {
        const s = await Student.findById(req.params.id).lean();
        if (!s) return res.status(404).json({ success: false, message: "Not found" });
        res.json(s);
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put("/students/:id", async (req, res) => {
    try {
        const s = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
        if (!s) return res.status(404).json({ success: false, message: "Not found" });
        res.json(s);
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete("/students/:id", async (req, res) => {
    try { await Student.findByIdAndDelete(req.params.id); res.json({ success: true }); }
    catch (e) { res.status(500).json({ success: false }); }
});

// ── Coordinator approval ────────────────────────────────────────────────────
router.post("/students/:id/coordinator-approve", async (req, res) => {
    try {
        await Student.findByIdAndUpdate(req.params.id, { certificateApprovedByCoordinator: true });
        res.json({ success: true, message: "Student approved for certificate" });
    } catch (e) { res.status(500).json({ success: false }); }
});

router.post("/students/:id/coordinator-revoke", async (req, res) => {
    try {
        await Student.findByIdAndUpdate(req.params.id, { certificateApprovedByCoordinator: false });
        res.json({ success: true, message: "Approval revoked" });
    } catch (e) { res.status(500).json({ success: false }); }
});

// ── Submissions ─────────────────────────────────────────────────────────────
router.get("/student-submissions/:employeeId", async (req, res) => {
    try {
        const subs = await Submission.find({ employeeId: req.params.employeeId }).sort({ submittedAt: -1 }).lean();
        res.json({ success: true, submissions: subs });
    } catch (e) { res.status(500).json({ success: false }); }
});

router.get("/all-submissions/:domain", async (req, res) => {
    try { res.json(await Submission.find({ domain: req.params.domain }).sort({ submittedAt: -1 }).lean()); }
    catch (e) { res.json([]); }
});

router.post("/update-status", async (req, res) => {
    try {
        const { id, status, feedback, domain } = req.body;
        if (!id || !status) return res.status(400).json({ success: false, message: "Missing id or status" });
        const sub = await Submission.findById(id);
        if (!sub) return res.status(404).json({ success: false, message: "Not found" });
        if (sub.reviewedOnce) return res.json({ success: false, alreadyReviewed: true });
        sub.status = status;
        sub.feedback = feedback || "";
        sub.reviewedOnce = true;
        await sub.save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// ── Notices ─────────────────────────────────────────────────────────────────
router.post("/update-notice", async (req, res) => {
    try {
        const { domain, morningMeeting, eveningMeeting, meetingLink, importantNotice } = req.body;
        await Notice.findOneAndUpdate(
            { domain },
            { domain, morningMeeting, eveningMeeting, meetingLink, importantNotice, updatedAt: new Date() },
            { upsert: true }
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

router.get("/get-notice/:domain", async (req, res) => {
    try {
        const n = await Notice.findOne({ domain: req.params.domain }).lean();
        res.json(n || {});
    } catch (e) { res.json({}); }
});

// ── Test Questions ──────────────────────────────────────────────────────────
router.get("/get-test-questions/:domain", async (req, res) => {
    try {
        const tq = await TestQuestions.findOne({ domain: req.params.domain }).lean();
        const questions = (tq?.questions || []).map(q => ({ question: q.question, options: q.options }));
        res.json({ success: true, questions });
    } catch (e) { res.json({ success: true, questions: [] }); }
});

router.post("/save-test-questions", async (req, res) => {
    try {
        const { domain, questions } = req.body;
        await TestQuestions.findOneAndUpdate({ domain }, { domain, questions, updatedAt: new Date() }, { upsert: true });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

router.post("/submit-test", async (req, res) => {
    try {
        const { employeeId, domain, score, totalQuestions } = req.body;
        const result = new TestResult({
            employeeId, domain, score, totalQuestions,
            percentage: Math.round((score / totalQuestions) * 100),
            submittedAt: new Date()
        });
        await result.save();
        res.json({ success: true, resultId: result._id });
    } catch (e) { res.status(500).json({ success: false }); }
});

router.get("/test-leaderboard/:domain", async (req, res) => {
    try {
        const results = await TestResult.find({ domain: req.params.domain }).sort({ percentage: -1 }).lean();
        const leaderboard = results.map(r => ({
            ...r, studentName: r.studentName || r.employeeId,
            percentage: r.percentage || Math.round((r.score / r.totalQuestions) * 100)
        }));
        res.json({ success: true, leaderboard });
    } catch (e) { res.json({ success: true, leaderboard: [] }); }
});

// ── Attendance ──────────────────────────────────────────────────────────────
router.post("/attendance/coordinator", async (req, res) => {
    try {
        const { employeeId, date, status, coordinatorId, domain } = req.body;
        let att = await Attendance.findOne({ employeeId, date, domain });
        if (att) { att.coordinator = status; await att.save(); res.json({ success: true, updated: true, attendance: att }); }
        else { att = new Attendance({ employeeId, date, coordinator: status, coordinatorId, domain, status: status }); await att.save(); res.json({ success: true, attendance: att }); }
    } catch (e) { res.status(500).json({ success: false }); }
});

router.post("/attendance/coordinator/bulk", async (req, res) => {
    try {
        const { domain, employeeIds, date, status, coordinatorId } = req.body;
        let created = 0;
        for (const empId of employeeIds) {
            const existing = await Attendance.findOne({ employeeId: empId, date, domain });
            if (existing) { existing.coordinator = status; await existing.save(); }
            else { await Attendance.create({ employeeId: empId, date, coordinator: status, coordinatorId, domain, status: status }); }
            created++;
        }
        res.json({ success: true, created });
    } catch (e) { res.status(500).json({ success: false }); }
});

// ── QR Attendance ───────────────────────────────────────────────────────────
router.post("/qr-attendance/mark", async (req, res) => {
    try {
        const { employeeId, password, domain } = req.body;
        const student = await Student.findOne({ employeeId });
        if (!student) return res.json({ success: false, message: "Student not found" });
        const isMatch = await bcrypt.compare(password, student.password).catch(() => false);
        if (!isMatch) return res.json({ success: false, message: "Invalid password" });
        const today = new Date().toISOString().split("T")[0];
        const existing = await Attendance.findOne({ employeeId, date: today, domain });
        if (existing) return res.json({ success: false, alreadyMarked: true, message: "Already marked for today" });
        await Attendance.create({ employeeId, date: today, self: "Present", domain, markedBy: "qr", coordinatorId: req.body.coordinatorId });
        res.json({ success: true, message: "Attendance marked successfully" });
    } catch (e) { res.status(500).json({ success: false }); }
});

// ── Promoted Registration ───────────────────────────────────────────────────
router.post("/promoted/verify", async (req, res) => {
    try {
        const { email, tempPassword } = req.body;
        const coord = await Coordinator.findOne({ email: email.toLowerCase(), tempPassword });
        if (coord) return res.json({ valid: true, name: coord.name, employeeId: coord.username, newRole: coord.newRole, domain: coord.domain });
        res.json({ valid: false, message: "Invalid credentials" });
    } catch (e) { res.json({ valid: false, message: "Error" }); }
});

router.post("/promoted/register", async (req, res) => {
    try {
        const { email, tempPassword, newPassword } = req.body;
        const hashed = await bcrypt.hash(newPassword, 10);
        const coord = await Coordinator.findOneAndUpdate(
            { email: email.toLowerCase(), tempPassword },
            { password: hashed, $unset: { tempPassword: "" } },
            { new: true }
        );
        if (coord) return res.json({ success: true, redirect: "/coordinator-login" });
        res.json({ success: false, message: "Registration failed" });
    } catch (e) { res.status(500).json({ success: false }); }
});

// ── Notifications ───────────────────────────────────────────────────────────
router.get("/notifications/coordinator/:domain", async (req, res) => {
    try {
        const notifications = await Notification.find({ domain: req.params.domain }).sort({ createdAt: -1 }).limit(20).lean();
        const readerId = "coord:" + req.params.domain;
        const unread = notifications.filter(n => !n.readBy?.includes(readerId)).length;
        res.json({ success: true, notifications, unread });
    } catch (e) { res.json({ success: true, notifications: [], unread: 0 }); }
});

router.post("/notifications/mark-read", async (req, res) => {
    try {
        const { notifId, readerId } = req.body;
        await Notification.findByIdAndUpdate(notifId, { $addToSet: { readBy: readerId } });
        res.json({ success: true });
    } catch (e) { res.json({ success: true }); }
});

// ── HR routes (simple) ─────────────────────────────────────────────────────
router.get("/hr/stats", async (req, res) => {
    try {
        const total = await Student.countDocuments();
        const submissions = await Submission.countDocuments();
        res.json({ success: true, stats: { totalStudents: total, totalSubmissions: submissions } });
    } catch (e) { res.json({ success: true, stats: { totalStudents: 0 } }); }
});

router.get("/hr/students", async (req, res) => {
    try { res.json({ success: true, students: await Student.find().sort({ createdAt: -1 }).lean() }); }
    catch (e) { res.status(500).json({ success: false }); }
});

router.get("/hr/students/domain/:domain", async (req, res) => {
    try { res.json({ success: true, students: await Student.find({ domain: req.params.domain }).lean() }); }
    catch (e) { res.status(500).json({ success: false, students: [] }); }
});

router.get("/hr/submissions", async (req, res) => {
    try { res.json({ success: true, submissions: await Submission.find().sort({ submittedAt: -1 }).lean() }); }
    catch (e) { res.status(500).json({ success: false }); }
});

router.get("/hr/send-notification", async (req, res) => { res.json({ success: true }); });
router.post("/hr/send-notification", async (req, res) => {
    try {
        const { title, message, type, targetDomain } = req.body;
        await Notification.create({ title, message, type: type || "info", readBy: [], from: "HR", domain: targetDomain });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

router.get("/hr/notifications", async (req, res) => {
    try { res.json({ success: true, notifications: await Notification.find().sort({ createdAt: -1 }).limit(50).lean() }); }
    catch (e) { res.json({ success: true, notifications: [] }); }
});

router.delete("/hr/notifications/:id", async (req, res) => {
    try { await Notification.findByIdAndDelete(req.params.id); res.json({ success: true }); }
    catch (e) { res.status(500).json({ success: false }); }
});

// ====== NEW V2 NOTIFICATIONS ENPOINTS FOR HR BROADCAST & STUDENT SIDEBAR ======
router.post("/notifications/send", async (req, res) => {
    try {
        const { title, message, type, target, targetStudentId, from } = req.body;
        const targetType = target === "individual" ? "student" : "all";
        const newNotif = await Notification.create({
            title,
            message,
            type: type || "info",
            from: from || "HR",
            targetType,
            targetEmployeeId: target === "individual" ? targetStudentId : ""
        });
        res.json({ success: true, notification: newNotif });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

router.get("/notifications/student/:employeeId", async (req, res) => {
    try {
        const student = await Student.findOne({ employeeId: req.params.employeeId });
        const domain = student ? student.domain : "";
        const notifications = await Notification.find({
            $or: [
                { targetType: "all" },
                { targetType: "student", targetEmployeeId: req.params.employeeId },
                { targetType: "domain", targetDomain: domain }
            ]
        }).sort({ createdAt: -1 }).limit(100).lean();
        const readerId = req.params.employeeId;
        const unread = notifications.filter(n => !n.readBy?.includes(readerId)).length;
        res.json({ success: true, notifications, unread });
    } catch (e) {
        res.json({ success: true, notifications: [], unread: 0 });
    }
});

router.get("/notifications/all", async (req, res) => {
    try {
        const notifications = await Notification.find().sort({ createdAt: -1 }).limit(100).lean();
        res.json({ success: true, notifications });
    } catch (e) {
        res.json({ success: true, notifications: [] });
    }
});

router.post("/notifications/mark-all-read", async (req, res) => {
    try {
        const { readerId } = req.body;
        if (readerId) {
            await Notification.updateMany(
                {
                    $or: [
                        { targetType: "all" },
                        { targetType: "student", targetEmployeeId: readerId }
                    ],
                    readBy: { $ne: readerId }
                },
                { $addToSet: { readBy: readerId } }
            );
        }
        res.json({ success: true });
    } catch (e) {
        res.json({ success: true });
    }
});

router.post("/hr/send-documents-now", async (req, res) => { res.json({ success: true, message: "Documents sent" }); });

// ---- STUDENT: mark own attendance (once per day) ----
router.post("/attendance/self", async(req,res)=>{
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
    
    await bumpStreakAndMilestones(student);
    await checkCertificateEligibility(employeeId);
    await recomputeBadgesFor(employeeId);
    res.json({ success:true, message:"Attendance marked for today", attendance:att });
}catch(e){
    if(e.code === 11000) return res.json({ success:false, alreadyMarked:true, message:"Already marked for today" });
    console.log(e); res.json({ success:false, message:"Failed to mark attendance" });
}
});

// ---- GET attendance history + stats for one student ----
router.get("/attendance/student/:employeeId", async(req,res)=>{
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

// ---- GET performance for a student ----
router.get("/students/:id/performance", async(req,res)=>{
try{
    const id = req.params.id;
    const mongoose = require("mongoose");
    let student = null;
    if(mongoose.isValidObjectId(id)) student = await Student.findById(id);
    if(!student) student = await Student.findOne({ employeeId: id });
    if(!student) return res.status(404).json({ success:false, message:"Student not found" });
    const perf = await calculatePerformance(student);
    res.json({ success:true, performance: perf });
}catch(e){ console.log(e); res.status(500).json({ success:false }); }
});

// ---- SUBMIT task ----
router.post("/submit-task", upload.fields([
    { name: "image", maxCount: 1 },
    { name: "pdf", maxCount: 1 }
]), async(req,res)=>{
try{
    const { employeeId, domain, githubLink, note, task } = req.body;
    const image = req.files && req.files["image"] ? "/" + req.files["image"][0].path.replace(/\\/g, "/") : "";
    const pdf   = req.files && req.files["pdf"]   ? "/" + req.files["pdf"][0].path.replace(/\\/g, "/")   : "";

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
    
    await setMilestone(employeeId, "firstTaskSubmitted");
    await recomputeBadgesFor(employeeId);
    res.json({ success:true, message:"Task Submitted Successfully" });
}catch(error){
    console.log(error);
    res.json({ success:false, message:"Submission Failed" });
}
});

// ---- DELETE submission ----
router.delete("/submissions/:id", async(req,res)=>{
try{
    const id = req.params.id;
    const fs = require("fs");
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

// ---- BADGES CATALOG ----
router.get("/badges/catalog", (req,res) => {
    res.json({ success:true, catalog: BADGE_CATALOG });
});

// ---- GET STUDENT BADGES ----
router.get("/badges/student/:employeeId", async(req,res)=>{
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

// ---- GET STUDENT STREAK ----
router.get("/students/:employeeId/streak", async(req,res)=>{
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

// ---- COORDINATOR TASKS - GET ----
router.get("/coordinator/tasks/:domain", async(req,res)=>{
try{
    const domain = decodeURIComponent(req.params.domain);
    const ct = await CoordinatorTask.findOne({ domain });
    res.json({ success:true, tasks: ct?.tasks||[], fileUrl: ct?.fileUrl||"", fileName: ct?.fileName||"" });
}catch(e){ res.json({ success:true, tasks:[], fileUrl:"", fileName:"" }); }
});

// ---- COORDINATOR TASKS - SAVE ----
router.post("/coordinator/tasks", async(req,res)=>{
try{
    const { domain, tasks, deadline } = req.body;
    let deadlineVal = undefined;
    if(deadline === "" || deadline === null){
        deadlineVal = null;
    } else if(deadline){
        const d = new Date(deadline);
        if(!isNaN(d.getTime())) deadlineVal = d;
    }
    const update = { domain, tasks, updatedAt: new Date() };
    if(deadlineVal !== undefined){
        update.deadline = deadlineVal;
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

// ---- COORDINATOR TASKS - UPLOAD FILE ----
router.post("/coordinator/tasks/upload-file", upload.single("taskFile"), async(req,res)=>{
try{
    const { domain } = req.body;
    if(!req.file){ return res.json({ success:false, message:"No file uploaded" }); }
    const fileUrl  = "/" + req.file.path.replace(/\\/g, "/");
    const fileName = req.file.originalname;
    await CoordinatorTask.findOneAndUpdate(
        { domain },
        { domain, fileUrl, fileName, updatedAt: new Date() },
        { upsert:true, new:true }
    );
    res.json({ success:true, fileUrl, fileName });
}catch(e){ res.json({ success:false, message:"Upload failed: " + e.message }); }
});

// ---- COORDINATOR TASKS - REMOVE FILE ----
router.post("/coordinator/tasks/remove-file", async(req,res)=>{
try{
    const { domain } = req.body;
    await CoordinatorTask.findOneAndUpdate({ domain }, { fileUrl:"", fileName:"" });
    res.json({ success:true });
}catch(e){ res.json({ success:false }); }
});

// ---- STUDENT: coordinator details ----
router.get("/student/coordinator-details", async(req,res)=>{
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
    const COORDINATORS = require("../../middleware/auth").COORDINATORS;
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

// ---- Multi-domain: switch domain ----
router.post("/student/switch-domain", async(req,res)=>{
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
        college: target.collegeName || target.college || "",
        collegeName: target.collegeName || target.college || ""
    }});
}catch(e){ console.log(e); res.status(500).json({ success:false }); }
});

// ---- Auth: reset password ----
router.post("/auth/reset-password", async(req,res)=>{
    try{
        const { token, role, newPassword } = req.body || {};
        if(!token || !role || !newPassword) return res.json({ success:false, message:"Token, role and new password are required" });
        if(String(newPassword).length < 8) return res.json({ success:false, message:"Password must be at least 8 characters" });
        const validRoles = ["student","coordinator","hr"];
        if(!validRoles.includes(role)) return res.json({ success:false, message:"Invalid role" });

        const HR = require("../../models/HR");
        const Models = { student: Student, coordinator: Coordinator, hr: HR };
        const Model = Models[role];
        const user = await Model.findOne({ passwordResetToken: token });
        if(!user) return res.json({ success:false, message:"Invalid or already-used reset link" });
        if(!user.passwordResetExpiry || user.passwordResetExpiry < new Date()){
            return res.json({ success:false, message:"This reset link has expired. Please request a new one." });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.passwordResetToken = null;
        user.passwordResetExpiry = null;
        await user.save();
        res.json({ success:true, message:"Password updated! Please log in with your new password." });
    }catch(e){ console.log(e); res.status(500).json({ success:false, message:"Server error" }); }
});

module.exports = router;