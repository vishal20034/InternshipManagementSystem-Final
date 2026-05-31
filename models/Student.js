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
    hrRejectionReason:                { type: String, default: "" },

    // ===== Streak counter (Feature 7) =====
    currentStreak:        { type: Number, default: 0 },
    bestStreak:           { type: Number, default: 0 },
    lastAttendanceDate:   { type: Date },

    // ===== Internship progress timeline (Feature 11) =====
    // Each milestone stores the Date when it was reached, or stays undefined
    // until the corresponding event happens. Updated by the relevant routes.
    milestones: {
        firstAttendance:        { type: Date },
        firstTaskSubmitted:     { type: Date },
        firstTaskApproved:      { type: Date },
        reached50Attendance:    { type: Date },
        reached75Attendance:    { type: Date },
        certificateEligible:    { type: Date },
        coordinatorApproved:    { type: Date },
        hrApproved:             { type: Date },
        certificatesGenerated:  { type: Date },
        internshipCompleted:    { type: Date }
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Student", studentsSchema);
