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

    // Retrieve tasks list
    const tasksRes = await taskEngine.getStudentTasks(student);

    // Retrieve latest coin balance
    const coinBalance = await coinService.getBalance(student._id);

    return NextResponse.json({
      success: true,
      weeks: tasksRes.weeks || [],
      domain: tasksRes.domain || student.domain,
      durationType: tasksRes.durationType || student.v2DurationType,
      totalCoins: coinBalance.totalCoins || 0
    });
  } catch (error: any) {
    console.error("[STUDENT TASKS API] Error:", error);
    return NextResponse.json({ success: false, message: error.message || "Server Error" }, { status: 500 });
  }
}
