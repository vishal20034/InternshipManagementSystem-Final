// NEW FEATURE: Student Task Progress Tracking
const mongoose = require("mongoose");

const studentTaskProgressSchema = new mongoose.Schema({
    studentId:           { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    taskId:              { type: mongoose.Schema.Types.ObjectId, ref: "DomainTask", required: true },
    status:              { type: String, enum: ["locked", "available", "in_progress", "submitted", "approved", "rejected"], default: "locked" },
    startedAt:           { type: Date, default: null },
    submittedAt:         { type: Date, default: null },
    approvedAt:          { type: Date, default: null },
    approvedBy:          { type: mongoose.Schema.Types.ObjectId, ref: "Coordinator", default: null },
    submissionUrl:       { type: String, default: null },
    submissionNotes:     { type: String, default: null },
    coordinatorFeedback: { type: String, default: null },
    coinsAwarded:        { type: Number, default: 0 },
    videoWatchedPercent: { type: Number, default: 0 },
    skipVideoLogged:     { type: Boolean, default: false }
}, { timestamps: true });

studentTaskProgressSchema.index({ studentId: 1, taskId: 1 }, { unique: true });
studentTaskProgressSchema.index({ studentId: 1, status: 1 });
studentTaskProgressSchema.index({ approvedBy: 1, status: 1 });

module.exports = mongoose.model("StudentTaskProgress", studentTaskProgressSchema);
