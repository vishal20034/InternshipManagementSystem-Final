'use strict';

const MentorProfile = require('../models/MentorProfile');
const { createProfileController } = require('./profileControllerFactory');

const controller = createProfileController({
  Model:          MentorProfile,
  roleName:       'mentor',
  sanitizeFields: ['headline', 'bio', 'linkedinUrl', 'twitterUrl', 'website', 'rejectionReason'],
  dirSort:        { rating: -1, reviewCount: -1 },
  buildDirFilter(query) {
    const filter = { verificationStatus: 'approved' };
    if (query.availability) filter.availability        = query.availability;
    if (query.sessionType)  filter.sessionType         = { $in: [query.sessionType] };
    if (query.industry)     filter.industries          = { $in: [query.industry] };
    if (query.expertise)    filter['expertise.area']   = { $regex: query.expertise.trim(), $options: 'i' };
    if (query.minRating)    filter.rating              = { $gte: parseFloat(query.minRating) };
    if (query.search) {
      filter.$or = [
        { headline: { $regex: query.search.trim(), $options: 'i' } },
        { bio:      { $regex: query.search.trim(), $options: 'i' } },
      ];
    }
    return filter;
  },
  approvedType: 'mentor_approved',
});

module.exports = {
  createOrUpdateProfile:   controller.createOrUpdateProfile,
  getMyProfile:            controller.getMyProfile,
  getMentorDirectory:      controller.getDirectory,
  getMentorProfile:        controller.getPublicProfile,
  updateVerificationStatus: controller.updateVerificationStatus,
};
