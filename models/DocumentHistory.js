const mongoose = require('mongoose');

const documentHistorySchema = new mongoose.Schema({
  studentName:    { type: String, required: true },
  employeeId:     { type: String, required: true },
  college:        { type: String },
  documentType:   { type: String, required: true },
  documentNumber: { type: String },
  sentOn:         { type: Date, default: Date.now },
  sentBy:         { type: String },
  method:         { type: String, enum: ['manual', 'automation'], default: 'manual' },
  emailStatus:    { type: String, default: 'sent' }
}, { timestamps: true });

module.exports = mongoose.model('DocumentHistory', documentHistorySchema);
