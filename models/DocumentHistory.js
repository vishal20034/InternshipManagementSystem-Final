const mongoose = require("mongoose");

const documentHistorySchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", default: null, index: true },
    studentName: { type: String, default: "" },
    studentEmail: { type: String, default: "" },
    employeeId: { type: String, default: "", index: true },
    college: { type: String, default: "" },
    domain: { type: String, default: "" },
    documentType: { type: String, default: "" },
    documentKey: { type: String, default: "", index: true },
    documentNumber: { type: String, default: "", index: true },
    sentAt: { type: Date, default: Date.now, index: true },
    sentBy: { type: String, default: "" },
    sentToEmail: { type: String, default: "" }
  },
  { timestamps: true, minimize: true }
);

documentHistorySchema.index({ documentNumber: 1 }, { unique: false });

module.exports =
  mongoose.models.DocumentHistory || mongoose.model("DocumentHistory", documentHistorySchema);
