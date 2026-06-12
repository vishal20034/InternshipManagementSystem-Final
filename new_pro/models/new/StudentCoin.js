// NEW FEATURE: Student Coin Balance & History
const mongoose = require("mongoose");
const { Schema, model, models } = mongoose;

const coinHistoryEntrySchema = new mongoose.Schema({
    action:    { type: String, required: true },
    coins:     { type: Number, required: true },
    timestamp: { type: Date, default: Date.now }
}, { _id: false });

const studentCoinSchema = new mongoose.Schema({
    studentId:    { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true, unique: true },
    totalCoins:   { type: Number, default: 0 },
    coinsHistory: { type: [coinHistoryEntrySchema], default: [] },
    lastUpdated:  { type: Date, default: Date.now }
}, { timestamps: true });

studentCoinSchema.index({ totalCoins: -1 });

module.exports = models.StudentCoin || model("StudentCoin", studentCoinSchema);
