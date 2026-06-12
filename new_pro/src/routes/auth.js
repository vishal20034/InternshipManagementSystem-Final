const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const Student = require("../../models/Student");
const HR = require("../../models/HR");
const Coordinator = require("../../models/Coordinator");
const { generateEmployeeId } = require("../../utils/documentNumber");

const BASE_URL = process.env.BASE_URL || "https://virtualinternships.entrepreneurshipnetwork.net";

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many auth attempts. Please wait before trying again." },
});

router.post("/register", authLimiter, async (req, res) => {
    try {
        const { firstName, lastName, email, domain, whatsapp, collegeName, tenure, joiningDate } = req.body;
        if (!firstName || !lastName || !email || !domain) {
            return res.status(400).json({ success: false, message: "Required fields missing" });
        }
        
        const emailLc = email.toLowerCase().trim();
        const existingByEmail = await Student.find({ email: emailLc });
        
        const sameDomainHit = existingByEmail.find(s => (s.domain || "") === domain);
        if (sameDomainHit) {
            return res.json({
                success: false,
                already: true,
                message: "You are already registered in this domain",
                employeeId: sameDomainHit.employeeId
            });
        }
        
        if (existingByEmail.length >= 2) {
            return res.json({
                success: false,
                message: "This email is already registered in 2 domains (the maximum allowed)."
            });
        }
        
        const isFirstRegistration = existingByEmail.length === 0;
        const crypto = require("crypto");
        const rawPassword = isFirstRegistration
            ? crypto.randomBytes(4).toString("hex")
            : (existingByEmail[0].password || crypto.randomBytes(4).toString("hex"));
            
        const hashedPassword = await bcrypt.hash(rawPassword, 10);
        const newEmployeeId = await generateEmployeeId(Student, domain);
        
        const student = new Student({
            employeeId: newEmployeeId,
            firstName,
            lastName,
            name: `${firstName} ${lastName}`.trim(),
            email: emailLc,
            domain,
            password: hashedPassword,
            whatsapp: whatsapp || "",
            phone: whatsapp || "",
            collegeName: collegeName || "",
            college: collegeName || "",
            tenure: tenure || "1 Month",
            joiningDate: joiningDate || new Date().toISOString(),
            lastActiveDate: new Date()
        });
        await student.save();
        
        const allForEmail = [...existingByEmail, student];
        const linked = allForEmail.map(s => ({
            domain: s.domain,
            studentId: s._id,
            employeeId: s.employeeId
        }));
        await Promise.all(allForEmail.map(s => Student.findByIdAndUpdate(s._id, { linkedDomains: linked })));
        
        res.json({
            success: true,
            message: "Registration successful",
            employeeId: newEmployeeId,
            password: rawPassword
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /api/auth/student-login
router.post("/student-login", authLimiter, async (req, res) => {
    try {
        const { employeeId, password } = req.body;
        if (!employeeId || !password) {
            return res.status(400).json({ success: false, message: "Credentials required" });
        }
        const searchId = String(employeeId || "").trim();
        const student = await Student.findOne({
            $or: [
                { employeeId: searchId },
                { employeeId: searchId.toUpperCase() },
                { email: searchId.toLowerCase() }
            ]
        });
        if (!student) return res.status(401).json({ success: false, message: "Invalid credentials" });
        
        let isMatch = false;
        if (student.password && (student.password.startsWith("$2a$") || student.password.startsWith("$2b$") || student.password.startsWith("$2y$"))) {
            isMatch = await bcrypt.compare(password, student.password).catch(() => false);
        } else {
            isMatch = (password === student.password);
        }
        if (!isMatch) return res.status(401).json({ success: false, message: "Invalid credentials" });
        
        await Student.findByIdAndUpdate(student._id, { lastActiveDate: new Date() });
        res.json({
            success: true,
            student: student
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /api/auth/coordinator-login
router.post("/coordinator-login", authLimiter, async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ success: false, message: "Credentials required" });
        }
        const COORDINATORS = require("../../middleware/auth").COORDINATORS;
        const legacy = COORDINATORS[username];
        if (legacy && legacy.password === password) {
            return res.json({ success: true, coordinator: { username, domain: [legacy.domain] } });
        }
        const dbC = await Coordinator.findOne({ $or: [{ username }, { email: username.toLowerCase() }] });
        if (dbC) {
            let isMatch = false;
            if (dbC.password && (dbC.password.startsWith("$2a$") || dbC.password.startsWith("$2b$") || dbC.password.startsWith("$2y$"))) {
                isMatch = await bcrypt.compare(password, dbC.password).catch(() => false);
            } else {
                isMatch = (password === dbC.password);
            }
            if (isMatch || dbC.tempPassword === password) {
                const domainArr = Array.isArray(dbC.domain) ? dbC.domain : [dbC.domain || ""];
                return res.json({ success: true, coordinator: { username: dbC.username || username, domain: domainArr, name: dbC.name } });
            }
        }
        return res.status(401).json({ success: false, message: "Invalid credentials" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /api/auth/hr-login
router.post("/hr-login", authLimiter, async (req, res) => {
    try {
        const { email, username, password } = req.body;
        const identifier = email || username;
        if (!identifier || !password) {
            return res.status(400).json({ success: false, message: "Credentials required" });
        }
        const HR_ACCOUNTS = require("../../middleware/auth").HR_ACCOUNTS;
        const legacy = HR_ACCOUNTS[identifier];
        if (legacy && legacy.password === password) {
            return res.json({ success: true, hr: { username: identifier, name: legacy.name, email: legacy.email } });
        }
        const legacyByEmail = Object.entries(HR_ACCOUNTS).find(([_, v]) => v.email === identifier);
        if (legacyByEmail) {
            const [u, v] = legacyByEmail;
            if (v.password === password) {
                return res.json({ success: true, hr: { username: u, name: v.name, email: v.email } });
            }
        }
        const dbH = await HR.findOne({ email: identifier.toLowerCase() });
        if (dbH) {
            let isMatch = false;
            if (dbH.password && (dbH.password.startsWith("$2a$") || dbH.password.startsWith("$2b$") || dbH.password.startsWith("$2y$"))) {
                isMatch = await bcrypt.compare(password, dbH.password).catch(() => false);
            } else {
                isMatch = (password === dbH.password);
            }
            if (isMatch) {
                return res.json({ success: true, hr: { username: dbH.email, name: dbH.name, email: dbH.email } });
            }
        }
        return res.status(401).json({ success: false, message: "Invalid credentials" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;