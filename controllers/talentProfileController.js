const TalentProfile = require("../models/TalentProfile");

exports.list = async (req, res) => {
  try {
    const profiles = await TalentProfile.find({ isPublic: true }).lean();
    res.json({ success: true, data: profiles });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
};

exports.get = async (req, res) => {
  try {
    const profile = await TalentProfile.findById(req.params.id).lean();
    if (!profile) return res.status(404).json({ success: false, error: "Not found" });
    res.json({ success: true, data: profile });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
};

exports.create = async (req, res) => {
  try {
    const profile = await TalentProfile.create(req.body);
    res.status(201).json({ success: true, data: profile });
  } catch (e) { res.status(400).json({ success: false, error: e.message }); }
};

exports.update = async (req, res) => {
  try {
    const profile = await TalentProfile.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!profile) return res.status(404).json({ success: false, error: "Not found" });
    res.json({ success: true, data: profile });
  } catch (e) { res.status(400).json({ success: false, error: e.message }); }
};

exports.remove = async (req, res) => {
  try {
    await TalentProfile.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Deleted" });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
};
