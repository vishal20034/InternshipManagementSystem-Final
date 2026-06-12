'use strict';

/**
 * @fileoverview Multi-role registration hub controller.
 * Routes new signups to appropriate existing flows.
 * Does NOT break or bypass the existing /register endpoint.
 */

const path          = require('path');
const bcrypt        = require('bcryptjs');
const EcosystemUser = require('../models/EcosystemUser');
const Student       = require('../models/Student');
const HR            = require('../models/HR');
const Coordinator   = require('../models/Coordinator');
const TalentProfile = require('../models/TalentProfile');
const { ALL_ROLES, ROLES } = require('../config/roles');

const SALT_ROUNDS     = 10;
const ECOSYSTEM_ROLES = [ROLES.FOUNDER, ROLES.MENTOR, ROLES.INVESTOR, ROLES.CONTRACTOR];

const ROLE_CONFIG = [
  {
    id: ROLES.STUDENT, label: 'Student',
    description: 'Join as an intern and kickstart your career', icon: '🎓',
    fields: [
      { name: 'collegeName', type: 'text',   label: 'College Name', placeholder: 'Your college', required: true },
      { name: 'domain',      type: 'select', label: 'Domain',        placeholder: 'Select domain', required: true,
        options: ['Web Development','Data Science','Machine Learning','Android','UI/UX','Digital Marketing'] },
      { name: 'tenure',      type: 'select', label: 'Tenure',        placeholder: 'Select tenure', required: true,
        options: ['1 month','3 months','6 months'] },
    ],
  },
  {
    id: ROLES.HR, label: 'HR',
    description: 'Manage internship programs for your company', icon: '💼',
    fields: [
      { name: 'company',     type: 'text', label: 'Company Name', placeholder: 'Your company',                 required: true },
      { name: 'designation', type: 'text', label: 'Designation',  placeholder: 'Job title',                   required: false },
      { name: 'linkedinUrl', type: 'url',  label: 'LinkedIn URL', placeholder: 'https://linkedin.com/in/...', required: false },
    ],
  },
  {
    id: ROLES.COORDINATOR, label: 'Coordinator',
    description: 'Coordinate interns across your department', icon: '🗂️',
    fields: [
      { name: 'department',  type: 'text', label: 'Department',  placeholder: 'Your department', required: true },
      { name: 'institution', type: 'text', label: 'Institution', placeholder: 'Your institution', required: false },
    ],
  },
  {
    id: ROLES.ADMIN, label: 'Admin',
    description: 'Platform administration access', icon: '⚙️', fields: [],
  },
  {
    id: ROLES.FOUNDER, label: 'Founder',
    description: 'Run your venture and hire top talent', icon: '🚀',
    fields: [
      { name: 'startupName', type: 'text',   label: 'Startup Name', placeholder: 'Your company name', required: true },
      { name: 'stage',       type: 'select', label: 'Stage',         placeholder: 'Select stage', required: false,
        options: ['Idea','Pre-seed','Seed','Series A','Series B+'] },
      { name: 'industry',    type: 'text',   label: 'Industry',      placeholder: 'e.g. FinTech', required: false },
      { name: 'website',     type: 'url',    label: 'Website',       placeholder: 'https://...', required: false },
    ],
  },
  {
    id: ROLES.MENTOR, label: 'Mentor',
    description: 'Guide founders and students with your expertise', icon: '🧑‍🏫',
    fields: [
      { name: 'expertiseAreas', type: 'text',   label: 'Areas of Expertise',  placeholder: 'e.g. Sales, Product', required: true },
      { name: 'yearsExp',       type: 'number', label: 'Years of Experience', placeholder: '5', required: false },
      { name: 'linkedinUrl',    type: 'url',    label: 'LinkedIn URL',         placeholder: 'https://linkedin.com/in/...', required: false },
    ],
  },
  {
    id: ROLES.INVESTOR, label: 'Investor',
    description: 'Discover and invest in promising startups', icon: '💰',
    fields: [
      { name: 'fundName',        type: 'text',   label: 'Fund / Firm Name',    placeholder: 'Your fund name',          required: false },
      { name: 'investmentStage', type: 'select', label: 'Investment Stage',    placeholder: 'Select stage', required: false,
        options: ['Pre-seed','Seed','Series A','Series B+','Growth'] },
      { name: 'sectors',         type: 'text',   label: 'Sectors of Interest', placeholder: 'e.g. FinTech, HealthTech', required: false },
    ],
  },
  {
    id: ROLES.CONTRACTOR, label: 'Contractor',
    description: 'Offer your skills as a freelance contractor', icon: '🔧',
    fields: [
      { name: 'skills',       type: 'text',   label: 'Key Skills',        placeholder: 'e.g. React, Node.js', required: true },
      { name: 'ratePerHour',  type: 'number', label: 'Rate per Hour (₹)', placeholder: '500',                 required: false },
      { name: 'availability', type: 'select', label: 'Availability',      placeholder: 'Select', required: false,
        options: ['Immediately','In 2 weeks','In 1 month'] },
    ],
  },
];

function getHub(req, res) {
  return res.sendFile(path.join(__dirname, '..', 'public', 'register-hub.html'));
}

function getRoleConfig(req, res) {
  return res.status(200).json({ success: true, roles: ROLE_CONFIG });
}

async function registerUser(req, res) {
  try {
    const { fullName, email, password, role, roleSpecificData = {} } = req.body;
    const name = fullName || req.body.name;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Full name must be at least 2 characters.' });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, error: 'Valid email is required.' });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters.' });
    }
    if (!role || !ALL_ROLES.includes(role)) {
      return res.status(400).json({ success: false, error: `role must be one of: ${ALL_ROLES.join(', ')}` });
    }

    const trimmedEmail = email.toLowerCase().trim();

    const [existingEco, existingStudent, existingHR, existingCoord] = await Promise.all([
      EcosystemUser.findOne({ email: trimmedEmail }),
      Student.findOne({ email: trimmedEmail }),
      HR.findOne({ email: trimmedEmail }),
      Coordinator.findOne({ email: trimmedEmail }),
    ]);

    if (existingEco || existingStudent || existingHR || existingCoord) {
      return res.status(409).json({ success: false, error: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    if (ECOSYSTEM_ROLES.includes(role)) {
      const user = await EcosystemUser.create({
        fullName: name.trim(),
        email:    trimmedEmail,
        password: hashedPassword,
        role,
      });
      await TalentProfile.create({ userId: user._id });
      return res.status(201).json({ success: true, message: `${role.charAt(0).toUpperCase() + role.slice(1)} account created.`, userId: user._id, role });
    }

    if (role === ROLES.STUDENT) {
      const student = await Student.create({
        name:        name.trim(),
        email:       trimmedEmail,
        password:    hashedPassword,
        domain:      roleSpecificData.domain || 'General',
        collegeName: roleSpecificData.collegeName || '',
        tenure:      roleSpecificData.tenure || '3 months',
        joiningDate: new Date(),
      });
      return res.status(201).json({ success: true, message: 'Student account created.', userId: student._id, role });
    }

    if (role === ROLES.HR) {
      const hr = await HR.create({ name: name.trim(), email: trimmedEmail, password: hashedPassword, username: trimmedEmail, role: ROLES.HR });
      return res.status(201).json({ success: true, message: 'HR account created.', userId: hr._id, role });
    }

    if (role === ROLES.COORDINATOR) {
      const coord = await Coordinator.create({ name: name.trim(), email: trimmedEmail, password: hashedPassword, username: trimmedEmail, department: roleSpecificData.department || '' });
      return res.status(201).json({ success: true, message: 'Coordinator account created.', userId: coord._id, role });
    }

    return res.status(400).json({ success: false, error: 'Admin registration is not self-service.' });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, error: 'An account with this email already exists.' });
    }
    return res.status(500).json({ success: false, error: 'Registration failed. Please try again.' });
  }
}

module.exports = { getHub, getRoleConfig, registerUser };
