const mongoose = require("mongoose");

const studentsSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    name: String,
    domain: String,
    whatsapp: String,
    email: String,
    tenure: String,
    joiningDate: String,
    employeeId: { type: String, unique: true, sparse: true },
    password: {
        type: String,
        default: "intern123"
    },

    // ===== Certificate approval workflow (two-step: Coordinator -> HR) =====
    certificateApprovedByCoordinator: { type: Boolean, default: false },
    coordinatorApprovedAt:            { type: Date },
    approvedByCoordinatorId:          { type: String, default: "" },
    coordinatorRemarks:               { type: String, default: "" },

    certificateApprovedByHR:          { type: Boolean, default: false },
    hrApprovedAt:                     { type: Date },
    approvedByHRId:                   { type: String, default: "" },
    hrRemarks:                        { type: String, default: "" },

    hrRejected:                       { type: Boolean, default: false },
    hrRejectionReason:                { type: String, default: "" }
}, {
    timestamps: true
});

module.exports = mongoose.model("Student", studentsSchema);
