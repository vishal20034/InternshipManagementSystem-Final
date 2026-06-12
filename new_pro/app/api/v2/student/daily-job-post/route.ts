import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Student from "@/models/Student";
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

    const { coins } = await request.json();
    const coinsToAward = typeof coins === "number" ? coins : 0;

    if (coinsToAward > 0) {
      await coinService.awardCoins(student._id, "Daily job posting task", coinsToAward);
    }

    return NextResponse.json({ success: true, coinsAwarded: coinsToAward });
  } catch (error: any) {
    console.error("[DAILY JOB POST API] Error:", error);
    return NextResponse.json({ success: false, message: error.message || "Server Error" }, { status: 500 });
  }
}
