// Payment Configuration — PaymentSetu integration
// Set PAYMENT_ENABLED=true in environment to activate

module.exports = {
    PAYMENT_ENABLED: process.env.PAYMENT_ENABLED === 'true' || false,
    PAYMENTSETU_API_KEY: process.env.PAYMENTSETU_API_KEY || '',
    PAYMENTSETU_BASE_URL: 'https://paymentsetu.com/api',
    CERT_PRICES: {
        expert:      100,
        nano_degree: 1000,
        fellowship:  2500
    },
    CERT_PRICES_PAISE: {
        expert:      10000,
        nano_degree: 100000,
        fellowship:  250000
    }
};
