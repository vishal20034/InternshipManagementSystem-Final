// NEW FEATURE: Coin Award Service
"use strict";

const StudentCoin  = require("../../models/new/StudentCoin");
const StudentCoinModel = StudentCoin;

// NEW FEATURE: Coin Service — award, deduct, and retrieve coin balances
const COIN_ACTIONS = {
    TASK_APPROVED:         (coins) => ({ label: "Task approved",            coins }),
    TASK_FIRST:            ()      => ({ label: "First task bonus",          coins: 50 }),
    WEEK_COMPLETE:         (week)  => ({ label: `Week ${week} completed`,    coins: 25 }),
    ONBOARD_BONUS:         ()      => ({ label: "Welcome bonus",             coins: 20 }),
    VIDEO_WATCHED:         ()      => ({ label: "Video watched",             coins: 5  }),
    STREAK_BONUS:          (days)  => ({ label: `${days}-day streak bonus`,  coins: days >= 7 ? 30 : 10 }),
};

/**
 * Award coins to a student.
 * @param {ObjectId|string} studentId
 * @param {string}          action     - one of the COIN_ACTIONS keys
 * @param {*}               actionArg  - passed to the action function
 * @returns {Promise<{totalCoins, awarded}>}
 */
async function awardCoins(studentId, action, actionArg) {
    const entry = COIN_ACTIONS[action] ? COIN_ACTIONS[action](actionArg) : { label: action, coins: actionArg || 0 };
    if (!entry.coins || entry.coins <= 0) return { totalCoins: 0, awarded: 0 };

    const updated = await StudentCoinModel.findOneAndUpdate(
        { studentId },
        {
            $inc:  { totalCoins: entry.coins },
            $push: { coinsHistory: { action: entry.label, coins: entry.coins, timestamp: new Date() } },
            $set:  { lastUpdated: new Date() }
        },
        { upsert: true, new: true }
    );
    return { totalCoins: updated.totalCoins, awarded: entry.coins };
}

/**
 * Get a student's coin balance and recent history.
 */
async function getBalance(studentId) {
    const doc = await StudentCoinModel.findOne({ studentId }).lean();
    if (!doc) return { totalCoins: 0, coinsHistory: [] };
    const history = [...(doc.coinsHistory || [])].reverse().slice(0, 50);
    return { totalCoins: doc.totalCoins, coinsHistory: history };
}

module.exports = { awardCoins, getBalance, COIN_ACTIONS };
