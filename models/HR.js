const mongoose = require("mongoose");

const HRSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, default: "" },
    role: { type: String, default: "hr" },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("HR", HRSchema);
