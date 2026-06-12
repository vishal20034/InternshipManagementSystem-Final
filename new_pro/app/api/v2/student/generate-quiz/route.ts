import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Student from "@/models/Student";
import QuizQuestion from "@/models/new/QuizQuestion";
import StudentTaskProgress from "@/models/new/StudentTaskProgress";
import quizEngine from "@/services/v2/quizEngine";

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

    const { taskId } = await request.json();
    if (!taskId) {
      return NextResponse.json({ success: false, message: "taskId is required" }, { status: 400 });
    }

    // Call quizEngine service to generate or resume the quiz session
    const data = await quizEngine.getQuestionsForTask(student, taskId);

    if (data.error) {
      return NextResponse.json({ success: false, message: data.error }, { status: 400 });
    }

    // If it's locked, return locking status
    if (data.locked) {
      return NextResponse.json({
        success: false,
        locked: true,
        locked_until: data.locked_until,
        attempts_used: data.attempts_used
      });
    }

    // If it's a fallback, generate offline questions or return default mock questions
    if (data.fallback) {
      // Create mock questions based on domain
      const fallbackQuestions = [
        {
          question: `What is the primary objective of ${student.domain || "this domain"}?`,
          options: ["Memorization", "Problem solving with technology", "Hardware design", "None of the above"],
          answer: 1
        },
        {
          question: "What does debugging mean?",
          options: ["Adding features", "Finding and fixing errors", "Writing documentation", "Deploying the app"],
          answer: 1
        },
        {
          question: "What is version control used for?",
          options: ["Controlling user access", "Tracking code changes", "Server management", "UI design"],
          answer: 1
        },
        {
          question: "What is an API?",
          options: ["A database", "Application Programming Interface", "A frontend framework", "A server"],
          answer: 1
        },
        {
          question: "What does 'open source' mean?",
          options: ["Paid software", "Software with publicly available source code", "Closed network", "Encrypted code"],
          answer: 1
        }
      ];
      return NextResponse.json({ success: true, questions: fallbackQuestions });
    }

    // Fetch the full QuizQuestions from DB to include correct_answer for the frontend
    const progress = await StudentTaskProgress.findOne({ studentId: student._id, taskId });
    if (!progress || !progress.quiz_current_question_ids || progress.quiz_current_question_ids.length === 0) {
      return NextResponse.json({ success: false, message: "Failed to load quiz session" }, { status: 500 });
    }

    const dbQuestions = await QuizQuestion.find({ _id: { $in: progress.quiz_current_question_ids } }).lean();
    
    // Maintain order of questions
    const qMap = new Map();
    for (const q of dbQuestions) {
      qMap.set(q._id.toString(), q);
    }

    const mappedQuestions = progress.quiz_current_question_ids
      .map((id: any) => qMap.get(id.toString()))
      .filter(Boolean)
      .map((q: any) => {
        return {
          _id: q._id.toString(),
          question: q.question_text,
          options: [q.options.A, q.options.B, q.options.C, q.options.D],
          answer: ({ "A": 0, "B": 1, "C": 2, "D": 3 } as Record<string, number>)[q.correct_answer] || 0
        };
      });

    return NextResponse.json({
      success: true,
      questions: mappedQuestions,
      attempt: data.attempt
    });
  } catch (error: any) {
    console.error("[GENERATE QUIZ API] Error:", error);
    return NextResponse.json({ success: false, message: error.message || "Server Error" }, { status: 500 });
  }
}
