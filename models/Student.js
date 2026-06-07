const mongoose = require("mongoose");

const studentsSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    name: String,
    domain: String,
    whatsapp: String,
    email: String,
    collegeName: { type: String, default: "" },
    college: { type: String, default: "" },
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

    // ===== Multi-domain registration (Feature 1) =====
    // Each Student doc represents one (email, domain) pair.
    // linkedDomains lists every (email, domain) the same person is registered
    // in. Updated on second-domain registration; both records carry the same
    // list so the UI can render a "My Domains" switcher.
    linkedDomains: [{
        domain:     { type: String, required: true },
        studentId:  { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
        employeeId: { type: String, required: true }
    }],

    // ===== Forgot password (Feature 9) =====
    passwordResetToken:   { type: String, default: null, index: true },
    passwordResetExpiry:  { type: Date,   default: null },

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
    },

    // ===== F9 — automated email reminder tracking =====
    // Each key tracks when (or whether) a reminder was last sent so the cron
    // doesn't spam the same student. The two well-known keys are:
    //   - attendanceWarning3d   (Date | null) — last sent for >=3-day gap
    //   - lowAttendance         (Date | null) — last sent when combined < 60%
    //   - internshipEnding7d    (Date | null) — once when 7d before end date
    reminderEmailsSent: {
        type: Map,
        of: Date,
        default: {}
    },
    certificateEligibilityEmailSent: { type: Boolean, default: false },

    // ===== Auto document email tracking =====
    documentsAutoSent:    { type: Boolean, default: false },
    documentsAutoSentAt:  { type: Date },
    autoDocUniqueId:      { type: String, default: "" },

    // ===== Document verification =====
    documentVerified:     { type: Boolean, default: false },
    documentVerifiedAt:   { type: Date },
    documentNumber:       { type: String, default: "" }
}, {
    timestamps: true
});

module.exports = mongoose.model("Student", studentsSchema);
