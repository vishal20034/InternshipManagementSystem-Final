const https = require("https");

// PaymentSetu integration provider
// API key must be set in PAYMENTSETU_API_KEY env var
class PaymentSetuProvider {
  constructor() {
    this.apiKey = process.env.PAYMENTSETU_API_KEY;
    this.baseUrl = "https://api.paymentsetu.com";
  }

  async initiatePayment({ orderId, amount, currency, redirectUrl, webhookUrl }) {
    if (!this.apiKey) throw new Error("PAYMENTSETU_API_KEY not configured");
    // Returns a payment initiation URL for the student to complete payment
    return {
      paymentUrl: `${this.baseUrl}/pay?order=${orderId}&amount=${amount}&key=${this.apiKey}`,
      orderId
    };
  }

  verifyWebhookSignature(payload, signature) {
    // TODO: implement HMAC verification using PAYMENTSETU_API_KEY
    return true;
  }
}

module.exports = new PaymentSetuProvider();
