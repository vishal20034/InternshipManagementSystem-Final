"use strict";

const DomainTask = require("../../models/new/DomainTask");
const StudentTaskProgress = require("../../models/new/StudentTaskProgress");
const QuizQuestion = require("../../models/new/QuizQuestion");
const coinService = require("./coinService");
const taskEngine = require("./taskEngine");

const QUIZ_SETTINGS = {
    questionCount: 5,
    durationMinutes: 10,
    passPercent: 0.6
};

const FALLBACK_QUIZ_BANK = {
    "Python Development": ["Python syntax", "Control flow", "Functions and data structures"],
    "Java Development": ["Java basics", "OOP in Java", "Collections and exceptions"],
    "DevOps with AWS": ["Linux fundamentals", "CI/CD basics", "Cloud deployment"],
    "Web Development": ["HTML and CSS", "JavaScript DOM", "Responsive design"],
    "MERN Stack Development": ["MongoDB basics", "Express and APIs", "React components"],
    "Artificial Intelligence": ["AI fundamentals", "Machine learning basics", "Model evaluation"],
    "Data Science": ["Data cleaning", "Exploratory analysis", "Visualization"],
    "Cyber Security": ["Security fundamentals", "Threats and vulnerabilities", "Network defense"],
    "Software Engineering": ["SDLC basics", "Requirements and design", "Testing and quality"],
    "Flutter Development": ["Flutter widgets", "State management", "API integration"],
    "HR Management": ["Recruitment basics", "Employee engagement", "HR operations"],
    "Business Analyst": ["Business models", "Stakeholder analysis", "Data-driven decisions"],
    "Venture Capital": ["Startup lifecycle", "Market sizing", "Due diligence"],
    "Vibe Coding": ["Prompting basics", "Rapid prototyping", "Iterative refinement"],
    "Space Research": ["Orbital basics", "Mission planning", "Space systems"],
    "HR": ["Recruitment basics", "Employee engagement", "HR operations"]
};

function getQuizSettingsForWeek() {
    return { ...QUIZ_SETTINGS };
}

function getPassingScore(questionCount = QUIZ_SETTINGS.questionCount, passPercent = QUIZ_SETTINGS.passPercent) {
    return Math.ceil(questionCount * passPercent);
}

async function getProgressForTask(studentId, taskId) {
    return StudentTaskProgress.findOne({ studentId, taskId });
}

function normalizeQuestionDoc(question) {
    return {
        _id: question._id,
        question_text: question.question_text,
        options: question.options,
        correct_answer: question.correct_answer,
        explanation: question.explanation || ""
    };
}

function buildGeneratedQuestions(task, topic) {
    const safeTopic = topic || task.taskTitle || task.domain;
    const domain = task.domain;
    const title = task.taskTitle;
    const description = task.taskDescription;
    return [
        {
            question_text: `In ${domain}, what is the main focus of "${title}" during week ${task.weekNumber}?`,
            options: {
                A: "Ignoring the task requirements completely",
                B: `Applying ${safeTopic} concepts to a practical task`,
                C: "Skipping implementation and only memorizing terms",
                D: "Moving directly to the final project without practice"
            },
            correct_answer: "B",
            explanation: `${title} is meant to help the student apply ${safeTopic} in a practical way.`
        },
        {
            question_text: `Which approach best matches this task description: "${description}"?`,
            options: {
                A: "Break the work into steps and implement the required deliverable",
                B: "Avoid planning and submit an empty placeholder",
                C: "Copy unrelated work from another domain",
                D: "Skip learning resources and guess every concept"
            },
            correct_answer: "A",
            explanation: "Weekly tasks are designed to be completed step by step based on the task description."
        },
        {
            question_text: `What is the best outcome of completing the ${safeTopic} lesson for ${domain}?`,
            options: {
                A: "A deliverable that demonstrates practical understanding",
                B: "Only a screenshot with no actual work",
                C: "Watching 10% of the video and stopping",
                D: "Skipping the quiz and unlocking the next week"
            },
            correct_answer: "A",
            explanation: "The internship expects demonstrable practical understanding from each task."
        },
        {
            question_text: `Before passing the quiz for "${title}", what must the student do?`,
            options: {
                A: "Watch at least 80% of the task video",
                B: "Open the next week's task directly",
                C: "Switch to another domain",
                D: "Wait for a coordinator to unlock the quiz manually"
            },
            correct_answer: "A",
            explanation: "The quiz unlock rule requires at least 80% video watch progress."
        },
        {
            question_text: `Why is ${safeTopic} relevant to "${title}"?`,
            options: {
                A: "It directly supports the weekly task objective and quiz",
                B: "It is unrelated filler content",
                C: "It replaces all future weeks automatically",
                D: "It only matters for coordinators"
            },
            correct_answer: "A",
            explanation: `${safeTopic} is the foundation for the weekly task objective.`
        }
    ];
}

async function ensureQuizBank(task) {
    const existing = await QuizQuestion.find({ task_id: task._id }).lean();
    if (existing.length >= QUIZ_SETTINGS.questionCount) {
        return existing.map(normalizeQuestionDoc);
    }

    const topics = FALLBACK_QUIZ_BANK[task.domain] || ["Foundations", "Practical workflow", "Best practices"];
    const topic = topics[(Math.max(1, task.weekNumber) - 1) % topics.length];
    const generated = buildGeneratedQuestions(task, topic);

    if (!existing.length) {
        await QuizQuestion.insertMany(generated.map((item) => ({
            task_id: task._id,
            domain: task.domain,
            week_number: task.weekNumber,
            duration_type: task.durationType,
            difficulty: task.difficultyLevel || "medium",
            ...item
        })));
    }

    const refreshed = await QuizQuestion.find({ task_id: task._id }).limit(QUIZ_SETTINGS.questionCount).lean();
    return refreshed.map(normalizeQuestionDoc);
}

async function tryUnlockNextWeekNoCoins(student, approvedTaskDoc) {
    const { domain, durationType, weekNumber: currentWeek } = approvedTaskDoc;
    const currentWeekTasks = await DomainTask.find({ domain, durationType, weekNumber: currentWeek }).lean();
    const currentWeekIds = currentWeekTasks.map((t) => t._id);
    if (!currentWeekIds.length) return { unlocked: 0 };

    const approvedCount = await StudentTaskProgress.countDocuments({
        studentId: student._id,
        taskId: { $in: currentWeekIds },
        status: "approved"
    });
    if (approvedCount < currentWeekIds.length) return { unlocked: 0 };

    const nextWeekTasks = await DomainTask.find({ domain, durationType, weekNumber: currentWeek + 1 }).lean();
    if (!nextWeekTasks.length) return { unlocked: 0 };

    const nextWeekIds = nextWeekTasks.map((t) => t._id);
    const res = await StudentTaskProgress.updateMany(
        { studentId: student._id, taskId: { $in: nextWeekIds }, status: "locked" },
        { $set: { status: "available" } }
    );
    if (res.modifiedCount > 0) {
        await coinService.awardCoins(student._id, "WEEK_COMPLETE", currentWeek, { actionKey: `week_complete_${currentWeek}` });
    }
    return { unlocked: res.modifiedCount, weekCompleted: currentWeek };
}

async function getQuizStatus(studentId, taskId) {
    const [task, progress] = await Promise.all([
        DomainTask.findById(taskId).lean(),
        getProgressForTask(studentId, taskId)
    ]);
    if (!task) return { error: "Task not found" };
    if (!progress) return { error: "Task not assigned" };

    return {
        attempts_used: progress.quiz_attempt_count || 0,
        locked_until: null,
        quiz_passed: !!progress.quiz_passed,
        best_score: progress.quiz_best_score || 0,
        bank_ready: true,
        bank_count: QUIZ_SETTINGS.questionCount,
        video_watched_percent: progress.videoWatchedPercent || 0,
        quiz_unlocked: (progress.videoWatchedPercent || 0) >= 80
    };
}

async function completeTaskViaFallback() {
    return { quiz_ready: true };
}

async function getQuestionsForTask(student, taskId) {
    const task = await DomainTask.findById(taskId).lean();
    if (!task) return { error: "Task not found" };
    const progress = await getProgressForTask(student._id, taskId);
    if (!progress) return { error: "Task not assigned" };
    if (progress.status === "locked") return { error: "Task locked" };
    if ((progress.videoWatchedPercent || 0) < 80) return { error: "Watch at least 80% of the video first" };
    if (progress.quiz_passed || progress.status === "approved") return { error: "already_passed" };

    const settings = getQuizSettingsForWeek(task.weekNumber);
    const passingScore = getPassingScore(settings.questionCount, settings.passPercent);
    const questionDocs = await ensureQuizBank(task);
    const selected = questionDocs.slice(0, settings.questionCount);
    const expiresAt = new Date(Date.now() + settings.durationMinutes * 60 * 1000);

    progress.quiz_current_question_ids = selected.map((q) => q._id);
    progress.quiz_current_expires_at = expiresAt;
    progress.quiz_last_question_ids = selected.map((q) => q._id);
    await progress.save();

    return {
        locked: false,
        task: {
            _id: task._id,
            weekNumber: task.weekNumber,
            domain: task.domain,
            durationType: task.durationType,
            taskTitle: task.taskTitle
        },
        quiz: {
            questionCount: settings.questionCount,
            durationMinutes: settings.durationMinutes,
            passPercent: settings.passPercent,
            passingScore
        },
        questions: selected.map((q) => ({ _id: q._id, question_text: q.question_text, options: q.options })),
        attempt: { resumes: false, expires_at: expiresAt }
    };
}

async function generateQuizForStudent(student, params = {}) {
    let task = null;
    if (params.taskId) {
        task = await DomainTask.findById(params.taskId).lean();
    } else {
        task = await DomainTask.findOne({
            domain: student.domain,
            durationType: params.durationType || student.v2DurationType,
            weekNumber: parseInt(params.weekNumber, 10) || 1
        }).lean();
    }
    if (!task) return { error: "Task not found" };
    const generated = await getQuestionsForTask(student, task._id);
    return generated;
}

async function submitQuiz(student, taskId, answers, meta) {
    const task = await DomainTask.findById(taskId).lean();
    if (!task) return { error: "Task not found" };
    const progress = await getProgressForTask(student._id, taskId);
    if (!progress) return { error: "Task not assigned" };
    if (progress.status === "locked") return { error: "Task locked" };
    if ((progress.videoWatchedPercent || 0) < 80) return { error: "Watch at least 80% of the video first" };

    const currentIds = (progress.quiz_current_question_ids || []).map((x) => x.toString());
    if (!currentIds.length) return { error: "No active quiz attempt. Start the quiz again." };

    const questions = await QuizQuestion.find({ _id: { $in: currentIds } }).lean();
    const qById = {};
    for (const q of questions) qById[q._id.toString()] = q;

    const answerMap = answers && typeof answers === "object" ? answers : {};
    let score = 0;
    const review = [];
    for (const qId of currentIds) {
        const q = qById[qId];
        if (!q) continue;
        const selected = String(answerMap[qId] || "").toUpperCase();
        const correct = q.correct_answer;
        if (selected && selected === correct) score += 1;
        review.push({
            _id: q._id,
            question_text: q.question_text,
            options: q.options,
            selected,
            correct_answer: correct,
            explanation: q.explanation || ""
        });
    }

    const passingScore = 3;
    const passed = score >= passingScore;
    progress.quiz_last_attempt_at = new Date();
    progress.quiz_attempt_count = (progress.quiz_attempt_count || 0) + 1;
    progress.quiz_attempts = progress.quiz_attempt_count;
    progress.quiz_best_score = Math.max(progress.quiz_best_score || 0, score);
    progress.quiz_last_result = passed ? "passed" : "failed";

    let coinsAwarded = 0;
    let nextWeekUnlocked = false;
    if (passed) {
        progress.quiz_passed = true;
        progress.quiz_pass_score = score;
        progress.status = "approved";
        progress.approvedAt = new Date();
        progress.approvedBy = null;

        const rewardAction = progress.quiz_attempt_count === 1 ? "QUIZ_PASSED_FIRST" : "QUIZ_PASSED_RETRY";
        const quizReward = await coinService.awardCoins(
            student._id,
            rewardAction,
            null,
            { actionKey: `quiz_reward_${task._id}` }
        );
        coinsAwarded += quizReward.awarded || 0;

        const taskReward = await coinService.awardCoins(
            student._id,
            "TASK_APPROVED",
            { difficulty: task.difficultyLevel || "medium" },
            { actionKey: `task_approved_${task._id}` }
        );
        if (!progress.coinsAwarded) {
            progress.coinsAwarded = taskReward.awarded || 0;
        }
        coinsAwarded += taskReward.awarded || 0;

        const unlock = await tryUnlockNextWeekNoCoins(student, task);
        nextWeekUnlocked = !!unlock.unlocked;
        await taskEngine.maybeAwardCourseCompletion(student, task);
    } else {
        progress.quiz_passed = false;
    }

    progress.quiz_current_question_ids = [];
    progress.quiz_current_expires_at = null;
    await progress.save();

    return {
        passed,
        score,
        total: currentIds.length,
        passing_score: passingScore,
        coins_awarded: coinsAwarded,
        next_week_unlocked: nextWeekUnlocked,
        attempt_number: progress.quiz_attempt_count || 0,
        locked_until: null,
        review: passed ? [] : review,
        meta: meta && typeof meta === "object" ? meta : null
    };
}

module.exports = {
    getQuizSettingsForWeek,
    getPassingScore,
    getQuizStatus,
    getQuestionsForTask,
    submitQuiz,
    completeTaskViaFallback,
    generateQuizForStudent
};
