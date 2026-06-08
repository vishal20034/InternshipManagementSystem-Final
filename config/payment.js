// NEW FEATURE: Payment Skeleton — PAYMENT_ENABLED=false by default
// Set PAYMENT_ENABLED=true in .env to activate everything with zero code changes.

module.exports = {
    PAYMENT_ENABLED: process.env.PAYMENT_ENABLED === 'true' || false,
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || '',
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || '',
    CERT_PRICES: {
        expert: 100,
        nano_degree: 1000,
        fellowship: 2500
    }
};

// All payment execution wrapped like this:
// async function claimCertificate(studentId, certType) {
//   const config = require('./payment');
//   if (!config.PAYMENT_ENABLED) {
//     return { status: 'payment_disabled', message: 'Payment coming soon. You will be notified by email.' }
//   }
//   // Full Razorpay payment code runs ONLY when flag is true
// }
