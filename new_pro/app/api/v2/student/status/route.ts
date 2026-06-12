import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Student from "@/models/Student";
import coinService from "@/services/v2/coinService";
import taskEngine from "@/services/v2/taskEngine";

export async function GET(request: Request) {
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

    // Retrieve coin balance
    const coinBalance = await coinService.getBalance(student._id);

    // Retrieve tasks for counts
    const tasksRes = await taskEngine.getStudentTasks(student);

    let approved = 0;
    let available = 0;
    let submitted = 0;
    let inProgress = 0;

    if (tasksRes && tasksRes.weeks) {
      for (const w of tasksRes.weeks) {
        for (const t of w.tasks) {
          if (t.status === "approved") approved++;
          else if (t.status === "submitted") submitted++;
          else if (t.status === "in_progress") inProgress++;
          else if (t.status === "available") available++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      v2Onboarded: !!student.v2Onboarded,
      totalCoins: coinBalance.totalCoins || 0,
      taskStats: {
        approved,
        available: available + inProgress,
        submitted
      }
    });
  } catch (error: any) {
    console.error("[STUDENT STATUS API] Error:", error);
    return NextResponse.json({ success: false, message: error.message || "Server Error" }, { status: 500 });
  }
}
