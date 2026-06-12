import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Student from "@/models/Student";
import DomainTask from "@/models/new/DomainTask";
import StudentTaskProgress from "@/models/new/StudentTaskProgress";
import coinService from "@/services/v2/coinService";

export async function POST(request: Request) {
  try {
    await dbConnect();
    const empId = request.headers.get("x-employee-id");
    if (!empId) {
      return NextResponse.json({ success: false, message: "x-employee-id header is missing" }, { status: 401 });
    }

    const student = await Student.findOne({ employeeId: empId });
    if (!student) {
      return NextResponse.json({ success: false, message: "Student not found" }, { status: 404 });
    }

    const { taskId, score, total, passed } = await request.json();
    if (!taskId) {
      return NextResponse.json({ success: false, message: "taskId is required" }, { status: 400 });
    }

    const task = await DomainTask.findById(taskId);
    if (!task) {
      return NextResponse.json({ success: false, message: "Task not found" }, { status: 404 });
    }

    let progress = await StudentTaskProgress.findOne({ studentId: student._id, taskId });
    if (!progress) {
      progress = new StudentTaskProgress({
        studentId: student._id,
        taskId,
        status: "available"
      });
    }

    // Check lock expiration
    if (progress.quiz_locked_until) {
      const now = new Date();
      if (new Date(progress.quiz_locked_until).getTime() > now.getTime()) {
        return NextResponse.json({
          success: false,
          message: "Quiz is locked. Please try again later.",
          locked: true,
          locked_until: progress.quiz_locked_until
        }, { status: 403 });
      } else {
        progress.quiz_locked_until = null;
        progress.quiz_attempts = 0;
      }
    }

    const isFirstAttempt = (progress.quiz_attempts || 0) === 0;
    progress.quiz_attempts = (progress.quiz_attempts || 0) + 1;
    progress.quiz_last_attempt_at = new Date();
    progress.quiz_best_score = Math.max(progress.quiz_best_score || 0, score);

    let coinsAwarded = 0;
    let nextWeekUnlocked = false;

    if (passed) {
      progress.quiz_passed = true;
      progress.quiz_pass_score = score;
      progress.status = "approved";
      progress.approvedAt = new Date();
      progress.approvedBy = null;

      // Award task approved coins
      const taskReward = task.coinReward || 10;
      progress.coinsAwarded = taskReward;
      const tCoinRes = await coinService.awardCoins(student._id, "TASK_APPROVED", taskReward);
      coinsAwarded += tCoinRes.awarded || 0;

      // Award quiz pass bonus
      const quizAction = isFirstAttempt ? "QUIZ_PASSED_FIRST" : "QUIZ_PASSED_RETRY";
      const qCoinRes = await coinService.awardCoins(student._id, quizAction);
      coinsAwarded += qCoinRes.awarded || 0;

      // Unlock next week's tasks if all current week's tasks are approved
      const currentWeek = task.weekNumber;
      const domain = task.domain;
      const durationType = task.durationType;

      const currentWeekTasks = await DomainTask.find({ domain, durationType, weekNumber: currentWeek }).lean();
      const currentWeekIds = currentWeekTasks.map((t: any) => t._id);

      const approvedCount = await StudentTaskProgress.countDocuments({
        studentId: student._id,
        taskId: { $in: currentWeekIds },
        status: "approved"
      });

      // Since the current task is being marked approved now, check if approvedCount + 1 (if not already counted) is equal to week's task count
      // Or just save the progress first and then query the DB
      await progress.save();

      const updatedApprovedCount = await StudentTaskProgress.countDocuments({
        studentId: student._id,
        taskId: { $in: currentWeekIds },
        status: "approved"
      });

      if (updatedApprovedCount >= currentWeekIds.length) {
        // Unlock next week
        const nextWeekTasks = await DomainTask.find({ domain, durationType, weekNumber: currentWeek + 1 }).lean();
        if (nextWeekTasks.length > 0) {
          const nextWeekIds = nextWeekTasks.map((t: any) => t._id);
          const updateRes = await StudentTaskProgress.updateMany(
            { studentId: student._id, taskId: { $in: nextWeekIds }, status: "locked" },
            { $set: { status: "available" } }
          );
          if (updateRes.modifiedCount > 0) {
            nextWeekUnlocked = true;
            // Award week completion bonus
            const wCoinRes = await coinService.awardCoins(student._id, "WEEK_COMPLETE", currentWeek);
            coinsAwarded += wCoinRes.awarded || 0;
          }
        }
      }
    } else {
      if (progress.quiz_attempts >= 3) {
        progress.quiz_locked_until = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours lock
      }
      await progress.save();
    }

    return NextResponse.json({
      success: true,
      passed,
      attempts: progress.quiz_attempts,
      locked_until: progress.quiz_locked_until || null,
      coinsAwarded,
      nextWeekUnlocked
    });
  } catch (error: any) {
    console.error("[QUIZ RESULT API] Error:", error);
    return NextResponse.json({ success: false, message: error.message || "Server Error" }, { status: 500 });
  }
}
