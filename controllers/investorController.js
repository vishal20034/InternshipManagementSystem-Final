'use strict';

const { ROLES } = require('../config/roles');
const { createDashboardController } = require('./dashboardFactory');

module.exports = createDashboardController(ROLES.INVESTOR, 'Investor portal coming soon');
