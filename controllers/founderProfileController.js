'use strict';

const FounderProfile = require('../models/FounderProfile');
const { createProfileController } = require('./profileControllerFactory');

const controller = createProfileController({
  Model:          FounderProfile,
  roleName:       'founder',
  sanitizeFields: ['startupName', 'tagline', 'description', 'website', 'pitchDeckUrl', 'logoUrl', 'location', 'rejectionReason'],
  buildDirFilter(query) {
    const filter = { verificationStatus: 'approved', isActive: true };
    if (query.industry)      filter.industry      = query.industry;
    if (query.stage)         filter.stage          = query.stage;
    if (query.fundingStatus) filter.fundingStatus  = query.fundingStatus;
    if (query.lookingFor)    filter.lookingFor     = { $in: [query.lookingFor] };
    if (query.search)        filter.startupName    = { $regex: query.search.trim(), $options: 'i' };
    return filter;
  },
  approvedType: 'founder_approved',
});

module.exports = {
  createOrUpdateProfile:   controller.createOrUpdateProfile,
  getMyProfile:            controller.getMyProfile,
  getFounderDirectory:     controller.getDirectory,
  getFounderProfile:       controller.getPublicProfile,
  updateVerificationStatus: controller.updateVerificationStatus,
};
