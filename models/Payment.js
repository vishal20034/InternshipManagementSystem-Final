const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true, index: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", index: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: "INR" },
  provider: { type: String, enum: ["paymentsetu", "razorpay", "manual", "upi"], required: true },
  purpose: { type: String, required: true },
  status: { type: String, enum: ["pending","success","failed","refunded","pending_verification"], default: "pending" },
  providerOrderId: { type: String },
  providerPaymentId: { type: String },
  webhookVerified: { type: Boolean, default: false },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model("Payment", PaymentSchema);
