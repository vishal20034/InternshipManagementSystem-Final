const express = require("express");
const router = express.Router();
const Student = require("../../models/Student");
const HR = require("../../models/HR");
const Submission = require("../../models/Submission");
const Notification = require("../../models/Notification");
const DocumentHistory = require("../../models/DocumentHistory");
const MailHistory = require("../../models/MailHistory");

router.get("/intern-list", async (req, res) => {
    try { res.json({ success: true, students: await Student.find().lean() }); }
    catch (e) { res.status(500).json({ success: false }); }
});

router.get("/intern-stats", async (req, res) => {
    try {
        const total = await Student.countDocuments();
        res.json({ success: true, stats: { total, approved: 0, pending: 0, rejected: 0 }, total });
    } catch (e) { res.status(500).json({ success: false }); }
});

router.get("/intern-stats/monthly", async (req, res) => {
    try { res.json({ success: true, stats: [] }); }
    catch (e) { res.status(500).json({ success: false }); }
});

router.get("/document-history", async (req, res) => {
    try { res.json({ success: true, documents: await DocumentHistory.find().sort({ sentAt: -1 }).limit(50).lean() }); }
    catch (e) { res.status(500).json({ success: false }); }
});

router.get("/automail-history", async (req, res) => {
    try { res.json({ success: true, mails: await MailHistory.find().sort({ sentAt: -1 }).limit(50).lean() }); }
    catch (e) { res.status(500).json({ success: false }); }
});

router.get("/verify-by-docnumber", async (req, res) => {
    try { res.json({ success: false, message: "Not implemented" }); }
    catch (e) { res.status(500).json({ success: false }); }
});

router.post("/send-notification", async (req, res) => {
    try {
        const { title, message, type, targetDomain } = req.body;
        await Notification.create({ title, message, type: type || "info", readBy: [], from: "HR", domain: targetDomain });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

router.get("/notifications", async (req, res) => {
    try { res.json({ success: true, notifications: await Notification.find().sort({ createdAt: -1 }).limit(50).lean() }); }
    catch (e) { res.json({ success: true, notifications: [] }); }
});

router.delete("/notifications/:id", async (req, res) => {
    try { await Notification.findByIdAndDelete(req.params.id); res.json({ success: true }); }
    catch (e) { res.status(500).json({ success: false }); }
});

module.exports = router;