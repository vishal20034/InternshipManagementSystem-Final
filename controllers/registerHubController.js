const bcrypt = require("bcrypt");

// Lightweight multi-role registration handler.
// Existing student/HR/coordinator routes are NOT modified.
exports.register = async (req, res) => {
  try {
    const { role, fullName, email, password } = req.body;
    if (!role || !fullName || !email || !password) {
      return res.status(400).json({ success: false, error: "All fields are required." });
    }
    const allowedRoles = ["founder", "mentor", "investor", "contractor", "student"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ success: false, error: "Invalid role." });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, error: "Password must be at least 8 characters." });
    }
    // TODO: persist to role-specific collection or unified User model
    res.status(201).json({ success: true, message: "Registration received.", role });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};
