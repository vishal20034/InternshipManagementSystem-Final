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

    linkedDomains: [{
        domain:     { type: String, required: true },
        studentId:  { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
        employeeId: { type: String, required: true }
    }],

    passwordResetToken:   { type: String, default: null, index: true },
    passwordResetExpiry:  { type: Date,   default: null },

    currentStreak:        { type: Number, default: 0 },
    bestStreak:           { type: Number, default: 0 },
    lastAttendanceDate:   { type: Date },
    lastActiveDate:       { type: Date },

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

    reminderEmailsSent: {
        type: Map,
        of: Date,
        default: {}
    },
    certificateEligibilityEmailSent: { type: Boolean, default: false },

    documentsAutoSent:    { type: Boolean, default: false },
    documentsAutoSentAt:  { type: Date },
    autoDocUniqueId:      { type: String, default: "" },
    documentVerified:     { type: Boolean, default: false },
    documentVerifiedAt:   { type: Date },
    documentNumber:       { type: String, default: "" },

    // FEATURE 1 — Onboarding popup shown only once
    onboardingPopupSeen:  { type: Boolean, default: false },

    // FEATURE 1 — Joiner type popup shown only once
    joinerTypeSelected:   { type: Boolean, default: false },
    joinerType:           { type: String, enum: ['new', 'whatsapp', null], default: null },

    // v2 portal fields
    v2Onboarded:          { type: Boolean, default: false },
    v2DurationType:       { type: String, default: null }
}, {
    timestamps: true
});

module.exports = mongoose.models.Student || mongoose.model("Student", studentsSchema);
