const Payment = require("../../models/Payment");

class PaymentService {
  async createOrder({ studentId, amount, currency = "INR", purpose, provider = "paymentsetu" }) {
    const orderId = `TEN-${Date.now()}-${Math.random().toString(36).substr(2,6).toUpperCase()}`;
    const payment = await Payment.create({ orderId, studentId, amount, currency, purpose, provider });
    return payment;
  }

  async updateStatus(orderId, status, providerData = {}) {
    return Payment.findOneAndUpdate(
      { orderId },
      { status, ...providerData, updatedAt: new Date() },
      { new: true }
    );
  }

  async getByOrderId(orderId) {
    return Payment.findOne({ orderId }).lean();
  }

  async listByStudent(studentId) {
    return Payment.find({ studentId }).sort({ createdAt: -1 }).lean();
  }
}

module.exports = new PaymentService();
