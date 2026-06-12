'use strict';

const { ROLES } = require('../config/roles');
const { createDashboardController } = require('./dashboardFactory');

module.exports = createDashboardController(ROLES.FOUNDER, 'Founder OS coming soon');
