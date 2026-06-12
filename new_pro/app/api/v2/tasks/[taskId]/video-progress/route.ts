import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Student from "@/models/Student";
import StudentTaskProgress from "@/models/new/StudentTaskProgress";
import coinService from "@/services/v2/coinService";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await context.params;
    await dbConnect();
    const empId = request.headers.get("x-employee-id");
    if (!empId) {
      return NextResponse.json({ success: false, message: "x-employee-id header is missing" }, { status: 401 });
    }

    const student = await Student.findOne({ employeeId: empId });
    if (!student) {
      return NextResponse.json({ success: false, message: "Student not found" }, { status: 404 });
    }

    if (!taskId) {
      return NextResponse.json({ success: false, message: "taskId is required" }, { status: 400 });
    }

    const body = await request.json();
    const percent = typeof body.percent === "number" ? body.percent : 0;

    let progress = await StudentTaskProgress.findOne({ studentId: student._id, taskId });
    let isFirstWatch = false;

    if (!progress) {
      progress = new StudentTaskProgress({
        studentId: student._id,
        taskId,
        status: "available",
        videoWatchedPercent: percent
      });
      if (percent >= 80) {
        isFirstWatch = true;
      }
    } else {
      const oldPercent = progress.videoWatchedPercent || 0;
      if (percent > oldPercent) {
        progress.videoWatchedPercent = percent;
        if (percent >= 80 && oldPercent < 80) {
          isFirstWatch = true;
        }
      }
    }

    await progress.save();

    let coinsAwarded = 0;
    if (isFirstWatch) {
      const coinRes = await coinService.awardCoins(student._id, "VIDEO_WATCHED");
      coinsAwarded = coinRes.awarded || 5;
    }

    return NextResponse.json({
      success: true,
      videoWatchedPercent: progress.videoWatchedPercent,
      coinsAwarded
    });
  } catch (error: any) {
    console.error("[VIDEO PROGRESS API] Error:", error);
    return NextResponse.json({ success: false, message: error.message || "Server Error" }, { status: 500 });
  }
}