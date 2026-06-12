import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import TestResult from "@/models/new/TestResult";

export async function GET(
  request: Request,
  context: { params: Promise<{ domain: string }> }
) {
  try {
    const { domain: rawDomain } = await context.params;
    await dbConnect();
    const domain = decodeURIComponent(rawDomain);

    const leaderboard = await TestResult.find({ domain })
      .sort({ percentage: -1, score: -1, completedAt: 1 })
      .limit(20)
      .lean();

    return NextResponse.json({
      success: true,
      leaderboard: leaderboard.map((item: any) => ({
        employeeId: item.employeeId,
        studentName: item.studentName,
        percentage: item.percentage,
        score: item.score,
        totalQuestions: item.totalQuestions
      }))
    });
  } catch (error: any) {
    console.error("[GET TEST LEADERBOARD] Error:", error);
    return NextResponse.json({ success: false, message: "Server Error" }, { status: 500 });
  }
}