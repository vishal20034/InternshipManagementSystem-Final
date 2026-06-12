import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Student from "@/models/Student";
import StudentTaskProgress from "@/models/new/StudentTaskProgress";

export async function POST(
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

    let progress = await StudentTaskProgress.findOne({ studentId: student._id, taskId });
    if (!progress) {
      progress = new StudentTaskProgress({
        studentId: student._id,
        taskId,
        status: "in_progress",
        startedAt: new Date()
      });
    } else {
      if (progress.status === "locked") {
        return NextResponse.json({ success: false, message: "Task is locked and cannot be started" }, { status: 400 });
      }
      if (progress.status === "available") {
        progress.status = "in_progress";
        progress.startedAt = new Date();
      }
    }

    await progress.save();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[START TASK API] Error:", error);
    return NextResponse.json({ success: false, message: error.message || "Server Error" }, { status: 500 });
  }
}