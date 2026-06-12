const mongoose = require("mongoose");
const { Schema, model, models } = mongoose;

const testResultSchema = new mongoose.Schema({
    employeeId:     { type: String, required: true },
    studentName:    { type: String, required: true },
    domain:         { type: String, required: true },
    score:          { type: Number, required: true },
    totalQuestions: { type: Number, required: true },
    percentage:     { type: Number, required: true },
    completedAt:    { type: Date, default: Date.now }
}, { timestamps: true });

testResultSchema.index({ domain: 1, percentage: -1 });
testResultSchema.index({ employeeId: 1, domain: 1 }, { unique: true });

module.exports = models.TestResult || model("TestResult", testResultSchema);
