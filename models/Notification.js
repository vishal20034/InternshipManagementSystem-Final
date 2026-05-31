const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema({
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, default: "info" }, // info, warning, success, urgent
    from: { type: String, default: "HR" },
    
    // Targeting
    targetType: { 
        type: String, 
        enum: ["all", "domain", "coordinator", "student", "coordinator-domain"],
        default: "all"
    },
    targetDomain: { type: String, default: "" },       // specific domain
    targetEmployeeId: { type: String, default: "" },   // specific student
    targetUsername: { type: String, default: "" },     // specific coordinator username
    
    // Read tracking
    readBy: [{ type: String }],     // array of employeeIds or coordinator usernames who read it
    
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Notification", NotificationSchema);
