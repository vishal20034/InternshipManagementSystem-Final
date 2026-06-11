const bcrypt = require("bcrypt");
const EcosystemUser = require("../models/EcosystemUser");

exports.register = async (req, res) => {
  try {
    const { role, fullName, email, password } = req.body;

    if (!role || !fullName || !email || !password) {
      return res.status(400).json({ success: false, error: "All fields are required." });
    }

    const allowedRoles = ["founder", "mentor", "investor", "contractor", "student"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ success: false, error: "Invalid role selected." });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, error: "Password must be at least 8 characters." });
    }

    const existing = await EcosystemUser.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ success: false, already: true, error: "This email is already registered. Please log in." });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await EcosystemUser.create({
      role,
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      password: hashed
    });

    res.status(201).json({
      success: true,
      message: "Account created successfully! Welcome to TEN.",
      role: user.role,
      fullName: user.fullName,
      email: user.email
    });

  } catch (e) {
    if (e.code === 11000) {
      return res.status(409).json({ success: false, already: true, error: "This email is already registered. Please log in." });
    }
    res.status(500).json({ success: false, error: "Server error. Please try again." });
  }
};
