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
    v2DurationType:       { type: String, default: null },

    // Attendance and performance
    attendancePercentage: { type: Number, default: 0 },
    performanceScore:     { type: Number, default: 0 },

    // Offer letter tracking
    offerLetterStatus:       { type: String, default: null },
    offerLetterGeneratedAt:  { type: Date,   default: null },
    offerLetterPath:         { type: String, default: null },

    // Certificate flow tracking
    internshipCompleted:       { type: Boolean, default: false },
    internshipCompletedAt:     { type: Date,    default: null },
    coordinatorApprovalStatus: { type: String,  enum: ['pending', 'approved', 'escalated_to_hr'], default: null },

    // LOC (Letter of Completion) — requires 75%+ attendance
    locStatus:    { type: String, enum: ['not_eligible', 'pending_coordinator', 'pending_hr', 'approved', 'issued', 'fine_pending'], default: 'not_eligible' },
    locIssuedAt:  { type: Date,    default: null },
    locPdfPath:   { type: String,  default: null },
    locFinePaid:  { type: Boolean, default: false },

    // LOR (Letter of Recommendation) — requires 75%+ attendance AND 75%+ performance
    lorStatus:    { type: String, enum: ['not_eligible', 'pending_coordinator', 'pending_hr', 'approved', 'issued', 'fine_pending'], default: 'not_eligible' },
    lorIssuedAt:  { type: Date,    default: null },
    lorPdfPath:   { type: String,  default: null },
    lorFinePaid:  { type: Boolean, default: false },

    // Star Performer — requires contribution submission + HR approval
    starStatus:       { type: String, enum: ['not_submitted', 'pending_review', 'approved', 'issued', 'rejected'], default: 'not_submitted' },
    starContribution: { type: String, default: null },
    starPdfPath:      { type: String, default: null },
    starIssuedAt:     { type: Date,   default: null },

    // Fine tracking
    pendingFines: [{
        type:      { type: String, enum: ['loc_attendance', 'lor_criteria'] },
        amount:    { type: Number },
        reason:    { type: String },
        paid:      { type: Boolean, default: false },
        createdAt: { type: Date,    default: Date.now }
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model("Student", studentsSchema);
