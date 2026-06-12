// NEW FEATURE: Sequential Task Unlock Engine
"use strict";

const DomainTask           = require("../../models/new/DomainTask");
const StudentTaskProgress  = require("../../models/new/StudentTaskProgress");
const coinService          = require("./coinService");

// NEW FEATURE: Map legacy tenure strings to durationType enum values
function tenureToDurationType(tenure) {
    if (!tenure) return "1month";
    const t = tenure.toString().toLowerCase().replace(/\s+/g, "");
    if (t.includes("45")) return "45days";
    if (t.includes("6m") || t.includes("6month")) return "6months";
    if (t.includes("3m") || t.includes("3month")) return "3months";
    return "1month";
}

/**
 * Assign all tasks for a student's domain + durationType.
 * Week 1 tasks → available, all other weeks → locked.
 * Idempotent — safe to call multiple times.
 */
async function assignTasksForStudent(student) {
    const domain       = student.domain;
    const durationType = student.v2DurationType || tenureToDurationType(student.tenure);

    if (!domain || !durationType) return { assigned: 0 };

    const allTasks = await DomainTask.find({ domain, durationType }).lean();
    if (!allTasks.length) return { assigned: 0 };

    const ops = allTasks.map(task => ({
        updateOne: {
            filter: { studentId: student._id, taskId: task._id },
            update: {
                $setOnInsert: {
                    studentId:  student._id,
                    taskId:     task._id,
                    status:     task.weekNumber === 1 ? "available" : "locked",
                    coinsAwarded: 0,
                    videoWatchedPercent: 0
                }
            },
            upsert: true
        }
    }));

    const result = await StudentTaskProgress.bulkWrite(ops);
    return { assigned: result.upsertedCount, total: allTasks.length };
}

/**
 * Unlock the next week's tasks after all of the current week's tasks are approved.
 * Called after a task is marked approved.
 * Returns { unlocked: number }
 */
async function tryUnlockNextWeek(student, approvedTaskId, { awardCoins: shouldAwardCoins = true } = {}) {
    const approvedTaskDoc = await DomainTask.findById(approvedTaskId).lean();
    if (!approvedTaskDoc) return { unlocked: 0 };

    const { domain, durationType, weekNumber: currentWeek } = approvedTaskDoc;

    const currentWeekTasks = await DomainTask.find({ domain, durationType, weekNumber: currentWeek }).lean();
    const currentWeekIds   = currentWeekTasks.map(t => t._id);

    const approvedCount = await StudentTaskProgress.countDocuments({
        studentId: student._id,
        taskId:    { $in: currentWeekIds },
        status:    "approved"
    });

    if (approvedCount < currentWeekIds.length) return { unlocked: 0 };

    const nextWeekTasks = await DomainTask.find({ domain, durationType, weekNumber: currentWeek + 1 }).lean();
    if (!nextWeekTasks.length) return { unlocked: 0 };

    const nextWeekIds = nextWeekTasks.map(t => t._id);
    const res = await StudentTaskProgress.updateMany(
        { studentId: student._id, taskId: { $in: nextWeekIds }, status: "locked" },
        { $set: { status: "available" } }
    );

    if (res.modifiedCount > 0 && shouldAwardCoins) {
        await coinService.awardCoins(student._id, "WEEK_COMPLETE", currentWeek);
    }

    return { unlocked: res.modifiedCount, weekCompleted: currentWeek };
}

/**
 * Approve a task: update StudentTaskProgress → approved, award coins, try unlock next week.
 */
async function approveTask(student, progressId, coordinatorId, feedback) {
    const progress = await StudentTaskProgress.findById(progressId).populate("taskId");
    if (!progress) return { error: "not_found" };
    if (progress.studentId.toString() !== student._id.toString()) return { error: "forbidden" };
    if (progress.status === "approved") return { error: "already_approved" };

    const task       = progress.taskId;
    const coinReward = task ? task.coinReward || 10 : 10;

    // First check if this is the student's first ever approved task
    const priorApprovals = await StudentTaskProgress.countDocuments({ studentId: student._id, status: "approved" });
    const isFirst        = priorApprovals === 0;

    progress.status      = "approved";
    progress.approvedAt  = new Date();
    progress.approvedBy  = coordinatorId || null;
    progress.coordinatorFeedback = feedback || "";
    progress.coinsAwarded = coinReward;
    await progress.save();

    // Award task coins
    await coinService.awardCoins(student._id, "TASK_APPROVED", coinReward);

    // First-task bonus
    if (isFirst) await coinService.awardCoins(student._id, "TASK_FIRST");

    // Try to unlock next week
    const unlock = await tryUnlockNextWeek(student, progress.taskId._id || progress.taskId);

    return { approved: true, coinsAwarded: coinReward, unlock };
}

/**
 * Get all tasks for a student, grouped by week, with their status.
 */
async function getStudentTasks(student) {
    const domain       = student.domain;
    const durationType = student.v2DurationType || tenureToDurationType(student.tenure);

    if (!domain || !durationType) return { weeks: [], domain, durationType };

    const [allTasks, progressList] = await Promise.all([
        DomainTask.find({ domain, durationType }).sort({ weekNumber: 1, _id: 1 }).lean(),
        StudentTaskProgress.find({ studentId: student._id }).lean()
    ]);

    const progressMap = {};
    for (const p of progressList) progressMap[p.taskId.toString()] = p;

    const weekMap = {};
    for (const task of allTasks) {
        const w = task.weekNumber;
        if (!weekMap[w]) weekMap[w] = { week: w, tasks: [], allApproved: false };
        const prog = progressMap[task._id.toString()];
        weekMap[w].tasks.push({
            _id:             task._id,
            taskTitle:       task.taskTitle,
            taskDescription: task.taskDescription,
            videoUrl:        task.videoUrl,
            coinReward:      task.coinReward,
            difficultyLevel: task.difficultyLevel,
            progressId:      prog ? prog._id : null,
            status:          prog ? prog.status : "locked",
            submissionUrl:   prog ? prog.submissionUrl : null,
            submissionNotes: prog ? prog.submissionNotes : null,
            coordinatorFeedback: prog ? prog.coordinatorFeedback : null,
            videoWatchedPercent: prog ? prog.videoWatchedPercent : 0,
            coinsAwarded:    prog ? prog.coinsAwarded : 0,
            submittedAt:     prog ? prog.submittedAt : null,
            approvedAt:      prog ? prog.approvedAt : null
        });
    }

    const weeks = Object.values(weekMap).map(w => {
        w.allApproved = w.tasks.every(t => t.status === "approved");
        w.anyAvailable = w.tasks.some(t => ["available","in_progress"].includes(t.status));
        w.completedCount = w.tasks.filter(t => t.status === "approved").length;
        w.totalCount = w.tasks.length;
        return w;
    });

    return { weeks, domain, durationType };
}

module.exports = { assignTasksForStudent, tryUnlockNextWeek, approveTask, getStudentTasks, tenureToDurationType };
