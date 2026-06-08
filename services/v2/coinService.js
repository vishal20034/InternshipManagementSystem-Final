"use strict";

const StudentCoinModel = require("../../models/new/StudentCoin");

const RUPEE_PER_COIN = 0.5;

const COIN_ACTIONS = {
    TASK_APPROVED: ({ difficulty = "medium" } = {}) => {
        const map = { easy: 20, medium: 30, hard: 40, expert: 100 };
        const safeDifficulty = map[difficulty] ? difficulty : "medium";
        return {
            label: `${safeDifficulty[0].toUpperCase()}${safeDifficulty.slice(1)} task approved`,
            coins: map[safeDifficulty]
        };
    },
    QUIZ_PASSED_FIRST: () => ({ label: "Quiz passed on first attempt", coins: 50 }),
    QUIZ_PASSED_RETRY: () => ({ label: "Quiz passed on retry", coins: 25 }),
    DAILY_JOB_POSTING: ({ platforms = 0 } = {}) => {
        if (platforms >= 6) return { label: "Daily job posting on 6-9 platforms", coins: 15 };
        if (platforms >= 3) return { label: "Daily job posting on 3-5 platforms", coins: 10 };
        if (platforms >= 1) return { label: "Daily job posting on 1-2 platforms", coins: 5 };
        return { label: "Daily job posting", coins: 0 };
    },
    DAILY_JOB_FORM_BONUS: () => ({ label: "Daily job posting tracking form bonus", coins: 3 }),
    ATTENDANCE_DAILY: () => ({ label: "Daily attendance marked", coins: 5 }),
    ATTENDANCE_STREAK_7: () => ({ label: "Perfect attendance (7 days streak)", coins: 50 }),
    ATTENDANCE_STREAK_30: () => ({ label: "Perfect attendance (30 days streak)", coins: 200 }),
    ONBOARD_BONUS: () => ({ label: "Onboarding completed", coins: 20 }),
    FIRST_TASK_SUBMITTED: () => ({ label: "First task submitted", coins: 10 }),
    WEEK_COMPLETE: (week) => ({ label: `All tasks in week ${week} completed`, coins: 30 }),
    COURSE_COMPLETE: () => ({ label: "Course completed", coins: 500 }),
    LOGIN_STREAK_7: () => ({ label: "7-day login streak", coins: 25 }),
    LOGIN_STREAK_30: () => ({ label: "30-day login streak", coins: 100 })
};

function toRupeeValue(coins) {
    return Number((Number(coins || 0) * RUPEE_PER_COIN).toFixed(2));
}

async function hasActionKey(studentId, actionKey) {
    if (!actionKey) return false;
    const doc = await StudentCoinModel.findOne({
        studentId,
        "coinsHistory.actionKey": actionKey
    }).select("_id").lean();
    return !!doc;
}

async function awardCoins(studentId, action, actionArg, opts = {}) {
    const entry = COIN_ACTIONS[action] ? COIN_ACTIONS[action](actionArg) : { label: action, coins: Number(actionArg) || 0 };
    if (!entry.coins || entry.coins <= 0) {
        return { totalCoins: 0, awarded: 0, skipped: true, rupeeValue: 0 };
    }

    const actionKey = opts.actionKey || null;
    if (actionKey && await hasActionKey(studentId, actionKey)) {
        const balance = await getBalance(studentId);
        return { totalCoins: balance.totalCoins, awarded: 0, skipped: true, rupeeValue: balance.rupeeValue };
    }

    const updated = await StudentCoinModel.findOneAndUpdate(
        { studentId },
        {
            $inc: { totalCoins: entry.coins },
            $push: {
                coinsHistory: {
                    action: entry.label,
                    actionKey,
                    coins: entry.coins,
                    meta: opts.meta || null,
                    timestamp: new Date()
                }
            },
            $set: { lastUpdated: new Date() }
        },
        { upsert: true, new: true }
    );

    return {
        totalCoins: updated.totalCoins,
        awarded: entry.coins,
        skipped: false,
        rupeeValue: toRupeeValue(updated.totalCoins)
    };
}

async function getBalance(studentId) {
    const doc = await StudentCoinModel.findOne({ studentId }).lean();
    if (!doc) return { totalCoins: 0, coinsHistory: [], rupeeValue: 0 };
    const history = [...(doc.coinsHistory || [])].reverse().slice(0, 50);
    return {
        totalCoins: doc.totalCoins,
        coinsHistory: history,
        rupeeValue: toRupeeValue(doc.totalCoins)
    };
}

module.exports = {
    RUPEE_PER_COIN,
    COIN_ACTIONS,
    awardCoins,
    getBalance,
    toRupeeValue
};
