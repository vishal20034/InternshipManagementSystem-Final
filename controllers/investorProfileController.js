'use strict';

const InvestorProfile = require('../models/InvestorProfile');
const { createProfileController } = require('./profileControllerFactory');

const controller = createProfileController({
  Model:          InvestorProfile,
  roleName:       'investor',
  sanitizeFields: ['fundName', 'bio', 'thesis', 'linkedinUrl', 'website', 'contactEmail'],
  visibleField:   'isVisible',
  buildDirFilter(query) {
    const filter = { verificationStatus: 'approved', isVisible: true };
    if (query.investorType)     filter.investorType    = query.investorType;
    if (query.stagePreference)  filter.stagePreference = { $in: [query.stagePreference] };
    if (query.sectorFocus)      filter.sectorFocus     = { $in: [query.sectorFocus] };
    if (query.minPortfolioSize) filter.portfolioSize   = { $gte: parseInt(query.minPortfolioSize, 10) };
    if (query.search) {
      filter.$or = [
        { fundName: { $regex: query.search.trim(), $options: 'i' } },
        { bio:      { $regex: query.search.trim(), $options: 'i' } },
      ];
    }
    return filter;
  },
  approvedType: 'investor_approved',
});

module.exports = {
  createOrUpdateProfile:   controller.createOrUpdateProfile,
  getMyProfile:            controller.getMyProfile,
  getInvestorDirectory:    controller.getDirectory,
  getInvestorProfile:      controller.getPublicProfile,
  updateVerificationStatus: controller.updateVerificationStatus,
};
