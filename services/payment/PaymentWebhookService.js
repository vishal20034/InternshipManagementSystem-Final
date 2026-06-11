const PaymentService = require("./PaymentService");
const PaymentSetuProvider = require("./PaymentSetuProvider");

class PaymentWebhookService {
  async handlePaymentSetu(payload, signature) {
    const valid = PaymentSetuProvider.verifyWebhookSignature(payload, signature);
    if (!valid) throw new Error("Invalid webhook signature");
    const { orderId, status, paymentId } = payload;
    const dbStatus = status === "SUCCESS" ? "success" : "failed";
    await PaymentService.updateStatus(orderId, dbStatus, {
      providerPaymentId: paymentId,
      webhookVerified: true
    });
    return { processed: true, orderId, status: dbStatus };
  }
}

module.exports = new PaymentWebhookService();
