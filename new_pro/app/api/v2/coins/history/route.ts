import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Student from "@/models/Student";
import coinService from "@/services/v2/coinService";

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

    const coinBalance = await coinService.getBalance(student._id);

    return NextResponse.json({
      success: true,
      totalCoins: coinBalance.totalCoins || 0,
      coinsHistory: coinBalance.coinsHistory || [],
      rupeeValue: coinBalance.rupeeValue || "0.00"
    });
  } catch (error: any) {
    console.error("[COIN HISTORY API] Error:", error);
    return NextResponse.json({ success: false, message: error.message || "Server Error" }, { status: 500 });
  }
}
