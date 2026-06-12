const mongoose = require("mongoose");

const coordinatorTaskSchema = new mongoose.Schema({
    domain:    { type: String, required: true, unique: true },
    tasks:     [String],
    fileUrl:   { type: String, default: "" },
    fileName:  { type: String, default: "" },
    deadline:           { type: Date,   default: null },
    lastOverdueRunAt:   { type: Date,   default: null },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.CoordinatorTask || mongoose.model("CoordinatorTask", coordinatorTaskSchema);
