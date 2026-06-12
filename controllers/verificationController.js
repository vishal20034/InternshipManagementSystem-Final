'use strict';

const TalentProfile   = require('../models/TalentProfile');
const FounderProfile  = require('../models/FounderProfile');
const MentorProfile   = require('../models/MentorProfile');
const InvestorProfile = require('../models/InvestorProfile');
const { ROLES, VERIFY_ROLES } = require('../config/roles');
const { parsePagination }     = require('../utils/pagination');

async function getPendingProfiles(req, res) {
  try {
    const role = req.user.role;
    if (!VERIFY_ROLES.includes(role)) return res.status(403).json({ success: false, error: 'Access denied.' });

    const type  = req.query.type || 'all';
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20 });

    const pendingFilter = { verificationStatus: 'pending' };
    const popOpts       = { path: 'userId', select: 'fullName email role createdAt' };

    let results = [];

    if (type === 'talent' || type === 'all') {
      const docs = await TalentProfile.find(pendingFilter).populate(popOpts).sort({ createdAt: 1 }).lean();
      docs.forEach(d => { d.profileType = 'talent'; });
      results = results.concat(docs);
    }
    if (type === 'founder' || type === 'all') {
      const docs = await FounderProfile.find(pendingFilter).populate(popOpts).sort({ createdAt: 1 }).lean();
      docs.forEach(d => { d.profileType = 'founder'; });
      results = results.concat(docs);
    }
    if (type === 'mentor' || type === 'all') {
      const docs = await MentorProfile.find(pendingFilter).populate(popOpts).sort({ createdAt: 1 }).lean();
      docs.forEach(d => { d.profileType = 'mentor'; });
      results = results.concat(docs);
    }
    if (type === 'investor' || type === 'all') {
      const docs = await InvestorProfile.find(pendingFilter).populate(popOpts).sort({ createdAt: 1 }).lean();
      docs.forEach(d => { d.profileType = 'investor'; });
      results = results.concat(docs);
    }

    results.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const total   = results.length;
    const paged   = results.slice(skip, skip + limit);

    return res.status(200).json({ success: true, data: paged, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('[verificationController.getPendingProfiles]', err.message);
    return res.status(500).json({ success: false, error: 'Could not fetch pending profiles.' });
  }
}

async function getVerificationStats(req, res) {
  try {
    const role = req.user.role;
    if (!VERIFY_ROLES.includes(role)) return res.status(403).json({ success: false, error: 'Access denied.' });

    const statuses = ['pending','approved','rejected'];

    const makeCount = (Model) => Promise.all(
      statuses.map(s => Model.countDocuments({ verificationStatus: s }))
    ).then(([pending, approved, rejected]) => ({ pending, approved, rejected }));

    const [talent, founder, mentor, investor] = await Promise.all([
      makeCount(TalentProfile),
      makeCount(FounderProfile),
      makeCount(MentorProfile),
      makeCount(InvestorProfile)
    ]);

    return res.status(200).json({ success: true, stats: { talent, founder, mentor, investor } });
  } catch (err) {
    console.error('[verificationController.getVerificationStats]', err.message);
    return res.status(500).json({ success: false, error: 'Could not fetch stats.' });
  }
}

module.exports = { getPendingProfiles, getVerificationStats };
