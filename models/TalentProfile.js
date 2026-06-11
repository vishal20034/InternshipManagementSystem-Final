const mongoose = require("mongoose");

const TalentProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  role: { type: String, enum: ["student","founder","mentor","investor","contractor"], required: true },
  fullName: { type: String, required: true, trim: true },
  bio: { type: String, maxlength: 1000 },
  skills: [{ type: String }],
  domains: [{ type: String }],
  linkedIn: { type: String },
  github: { type: String },
  portfolioUrl: { type: String },
  availability: { type: String, enum: ["full-time","part-time","freelance","not-available"], default: "not-available" },
  isPublic: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model("TalentProfile", TalentProfileSchema);

