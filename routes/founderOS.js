'use strict';

const express         = require('express');
const path            = require('path');
const { requireRole } = require('../middleware/roleGuard');
const { ROLES }       = require('../config/roles');

const router = express.Router();

router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'founder-os.html'));
});

router.get('/stats', requireRole(ROLES.FOUNDER, ROLES.ADMIN), async (req, res) => {
  try {
    return res.status(200).json({
      success:      true,
      internships:  0,
      students:     0,
      revenue:      0,
      mentors:      0,
      applications: 0,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Could not fetch stats.' });
  }
});

module.exports = router;
