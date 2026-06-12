import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Student from "@/models/Student";
import coinService from "@/services/v2/coinService";
import taskEngine from "@/services/v2/taskEngine";

export async function POST(request: Request) {
  try {
    await dbConnect();
    const empId = request.headers.get("x-employee-id");
    if (!empId) {
      return NextResponse.json({ success: false, message: "x-employee-id header is missing" }, { status: 401 });
    }

    const body = await request.json();
    const { durationType } = body;
    if (!durationType) {
      return NextResponse.json({ success: false, message: "durationType is required" }, { status: 400 });
    }

    const student = await Student.findOne({ employeeId: empId });
    if (!student) {
      return NextResponse.json({ success: false, message: "Student not found" }, { status: 404 });
    }

    // Save onboarding information
    student.v2Onboarded = true;
    student.v2DurationType = durationType;
    await student.save();

    // Assign tasks for student domain and durationType
    const assignRes = await taskEngine.assignTasksForStudent(student);

    // Award welcome/onboard bonus (20 coins)
    const coinRes = await coinService.awardCoins(student._id, "ONBOARD_BONUS");

    return NextResponse.json({
      success: true,
      tasksAssigned: assignRes.assigned || 0,
      coinsAwarded: coinRes.awarded || 20
    });
  } catch (error: any) {
    console.error("[STUDENT ONBOARD API] Error:", error);
    return NextResponse.json({ success: false, message: error.message || "Server Error" }, { status: 500 });
  }
}
