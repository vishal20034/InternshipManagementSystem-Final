'use strict';

const { ROLES } = require('../config/roles');
const { createDashboardController } = require('./dashboardFactory');

module.exports = createDashboardController(ROLES.MENTOR, 'Mentor portal coming soon');
