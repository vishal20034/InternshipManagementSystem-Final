'use strict';

const mongoose = require('mongoose');

const documentHistorySchema = new mongoose.Schema(
  {
    studentName: {
      type: String,
      required: true,
      trim: true,
    },
    employeeId: {
      type: String,
      required: true,
      trim: true,
    },
    college: {
      type: String,
      required: true,
      trim: true,
    },
    documentType: {
      type: String,
      required: true,
      enum: ['Offer Letter', 'LOC', 'LOR', 'Certificate'],
    },
    documentNumber: {
      type: String,
      required: true,
      trim: true,
    },
    sentOn: {
      type: Date,
      default: Date.now,
    },
    sentBy: {
      type: String,
      required: true,
      trim: true,
    },
    method: {
      type: String,
      required: true,
      enum: ['manual', 'automation'],
    },
    emailStatus: {
      type: String,
      required: true,
      enum: ['sent', 'failed', 'pending'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

documentHistorySchema.statics.record = async function (params) {
  const entry = new this(params);
  return entry.save();
};

const DocumentHistory =
  mongoose.models.DocumentHistory ||
  mongoose.model('DocumentHistory', documentHistorySchema);

module.exports = DocumentHistory;
