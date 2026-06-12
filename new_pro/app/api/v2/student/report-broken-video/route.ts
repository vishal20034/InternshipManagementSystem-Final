import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Student from "@/models/Student";
import DomainTask from "@/models/new/DomainTask";

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

    const { taskId, domain, taskTitle } = await request.json();
    if (!taskId) {
      return NextResponse.json({ success: false, message: "taskId is required" }, { status: 400 });
    }

    const task = await DomainTask.findById(taskId);
    if (!task) {
      return NextResponse.json({ success: false, message: "Task not found" }, { status: 404 });
    }

    const query = `${domain || ""} ${taskTitle || "tutorial"} tutorial`;
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

    if (task.fallbackVideoUrl) {
      return NextResponse.json({
        success: true,
        replaced: true,
        newVideoUrl: task.fallbackVideoUrl,
        searchUrl
      });
    }

    return NextResponse.json({
      success: true,
      replaced: false,
      searchUrl
    });
  } catch (error: any) {
    console.error("[REPORT BROKEN VIDEO API] Error:", error);
    return NextResponse.json({ success: false, message: error.message || "Server Error" }, { status: 500 });
  }
}
