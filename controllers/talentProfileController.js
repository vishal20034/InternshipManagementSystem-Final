'use strict';

/**
 * @fileoverview TalentProfile CRUD, search, and verification controller.
 */

const TalentProfile   = require('../models/TalentProfile');
const { VERIFY_ROLES } = require('../config/roles');
const { trimFields }   = require('../utils/sanitize');
const { parsePagination, paginatedResponse } = require('../utils/pagination');

/**
 * Sanitize string fields by trimming whitespace.
 * @param {object} body
 * @returns {object}
 */
function sanitizeBody(body) {
  return trimFields(body, ['headline', 'bio']);
}

/**
 * POST /api/talent/profile
 * Upsert talent profile for the authenticated user.
 */
async function createOrUpdate(req, res) {
  try {
    const userId = req.user._id;
    const data   = sanitizeBody(req.body);

    const existing = await TalentProfile.findOne({ userId });
    let profile;
    let statusCode;

    if (existing) {
      Object.assign(existing, data);
      profile    = await existing.save();
      statusCode = 200;
    } else {
      profile    = await TalentProfile.create({ ...data, userId });
      statusCode = 201;
    }

    return res.status(statusCode).json({ success: true, profile });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, error: 'Profile already exists.' });
    }
    return res.status(500).json({ success: false, error: 'Could not save profile.' });
  }
}

/**
 * GET /api/talent/profile/me
 * Return the authenticated user's own profile.
 */
async function getMyProfile(req, res) {
  try {
    const profile = await TalentProfile.findOne({ userId: req.user._id })
      .populate('userId', 'name email role');

    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profile not found. Create one first.' });
    }

    return res.status(200).json({ success: true, profile });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Could not fetch profile.' });
  }
}

/**
 * GET /api/talent/profile/:userId
 * Return a public profile (visibility = 'public').
 */
async function getPublicProfile(req, res) {
  try {
    const profile = await TalentProfile.findOne({
      userId:     req.params.userId,
      visibility: 'public',
    }).select('-verifiedBy -__v');

    if (!profile) {
      return res.status(404).json({ success: false, error: 'Public profile not found.' });
    }

    return res.status(200).json({ success: true, profile });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Could not fetch profile.' });
  }
}

/**
 * GET /api/talent/search
 * Paginated search of public talent profiles.
 * Query params: skills, availability, openTo, page, limit
 */
async function searchTalents(req, res) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = { visibility: 'public' };

    if (req.query.availability) {
      filter.availability = req.query.availability;
    }
    if (req.query.openTo) {
      filter.openTo = { $in: [req.query.openTo] };
    }
    if (req.query.skills) {
      const skillArr = req.query.skills.split(',').map((s) => s.trim()).filter(Boolean);
      if (skillArr.length > 0) {
        filter['skills.name'] = { $in: skillArr.map((s) => new RegExp(s, 'i')) };
      }
    }

    const [profiles, total] = await Promise.all([
      TalentProfile.find(filter)
        .select('userId headline skills availability openTo profileScore isVerified')
        .skip(skip)
        .limit(limit)
        .lean(),
      TalentProfile.countDocuments(filter),
    ]);

    return res.status(200).json({ ...paginatedResponse({ page, limit, total, data: profiles }), profiles });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Search failed.' });
  }
}

/**
 * PATCH /api/talent/profile/:userId/verify
 * Mark a talent profile as verified. Restricted to admin, hr, coordinator.
 */
async function verifyProfile(req, res) {
  try {
    const { role } = req.user;

    if (!VERIFY_ROLES.includes(role)) {
      return res.status(403).json({ success: false, error: 'Only admin, HR, or coordinator can verify profiles.' });
    }

    const profile = await TalentProfile.findOne({ userId: req.params.userId });

    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profile not found.' });
    }

    profile.isVerified  = true;
    profile.verifiedBy  = req.user._id;
    await profile.save();

    return res.status(200).json({ success: true, message: 'Profile verified.', profile });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Could not verify profile.' });
  }
}

module.exports = { createOrUpdate, getMyProfile, getPublicProfile, searchTalents, verifyProfile };
