const express = require("express");
const router = express.Router();
const Student = require("../../models/Student");
const Submission = require("../../models/Submission");
const Attendance = require("../../models/Attendance");

router.get("/student-overview/:domain", async (req, res) => {
    try {
        const students = await Student.find({ domain: req.params.domain }).lean();
        const submissions = await Submission.find({ domain: req.params.domain }).lean();
        const enriched = students.map(s => ({
            ...s, submissions: submissions.filter(sub => sub.employeeId === s.employeeId),
            stats: { combinedPct: 50, selfPct: 50, coordPct: 50, selfTotal: 0, coordPresent: 0, coordTotal: 0 }
        }));
        res.json({ success: true, students: enriched });
    } catch (e) { res.status(500).json({ success: false }); }
});

router.get("/attendance/:domain", async (req, res) => {
    try {
        const date = req.query.date || new Date().toISOString().split("T")[0];
        const records = await Attendance.find({ domain: req.params.domain, date });
        res.json({ success: true, records });
    } catch (e) { res.status(500).json({ success: false }); }
});

router.get("/qr/:coordinatorId", async (req, res) => {
    try {
        const QRCode = require("qrcode");
        const domain = req.query.domain || "";
        const baseUrl = process.env.BASE_URL || "http://localhost:5000";
        const url = `${baseUrl}/qr-attendance?domain=${encodeURIComponent(domain)}&coordinatorId=${encodeURIComponent(req.params.coordinatorId)}`;
        const dataUrl = await QRCode.toDataURL(url);
        res.json({ success: true, dataUrl, url });
    } catch (e) { res.status(500).json({ success: false }); }
});

router.get("/tasks/:domain", async (req, res) => {
    try { res.json({ success: true, tasks: [] }); } catch (e) { res.json({ success: true, tasks: [] }); }
});

router.post("/tasks", async (req, res) => {
    try { res.json({ success: true }); } catch (e) { res.json({ success: true }); }
});

router.get("/coding-questions/:domain", async (req, res) => {
    try { res.json({ success: true, questions: [] }); } catch (e) { res.json({ success: true, questions: [] }); }
});

router.post("/coding-questions", async (req, res) => {
    try { res.json({ success: true }); } catch (e) { res.status(500).json({ success: false }); }
});

router.get("/coding-submissions/:domain", async (req, res) => {
    try { res.json({ success: true, submissions: [] }); } catch (e) { res.json({ success: true, submissions: [] }); }
});

router.get("/proctoring/violations/:domain", async (req, res) => {
    res.json({ success: true, violations: [] });
});

module.exports = router;