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
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Student", studentsSchema);
