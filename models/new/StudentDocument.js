// NEW FEATURE: Student Document Upload & Offer Letter Tracking
const mongoose = require("mongoose");

const studentDocumentSchema = new mongoose.Schema({
    studentId:        { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true, unique: true },
    addressProofUrl:  { type: String, default: null },
    marksheetUrl:     { type: String, default: null },
    uploadStatus:     { type: String, enum: ["not_uploaded", "pending", "under_review", "approved", "rejected"], default: "not_uploaded" },
    reviewedBy:       { type: mongoose.Schema.Types.ObjectId, ref: "HR", default: null },
    reviewedAt:       { type: Date, default: null },
    offerLetterUrl:   { type: String, default: null },
    offerLetterSentAt:{ type: Date, default: null },
    rejectionReason:  { type: String, default: null }
}, { timestamps: true });

studentDocumentSchema.index({ studentId: 1 });
studentDocumentSchema.index({ uploadStatus: 1 });

module.exports = mongoose.model("StudentDocument", studentDocumentSchema);
