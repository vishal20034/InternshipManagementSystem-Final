"use strict";

const express      = require('express');
const router       = express.Router();
const crypto       = require('crypto');
const https        = require('https');
const Payment      = require('../../models/Payment');
const Student      = require('../../models/Student');
const Notification = require('../../models/Notification');

// Read dynamically per-request so env var changes take effect without restart
function getApiKey()  { return process.env.PAYMENTSETU_API_KEY || ''; }
function getSiteUrl() {
  if (process.env.BASE_URL)          return process.env.BASE_URL.replace(/\/$/, '');
  if (process.env.REPLIT_DEV_DOMAIN) return 'https://' + process.env.REPLIT_DEV_DOMAIN;
  return 'https://virtualinternships.entrepreneurshipnetwork.net';
}

// PaymentSetu HTTP helper — sends both X-API-Key and Authorization Bearer
function callPaymentSetuAPI(path, method, body) {
  return new Promise((resolve, reject) => {
    const apiKey = getApiKey();
    if (!apiKey) return reject(new Error('PAYMENTSETU_API_KEY is not configured'));

    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'paymentsetu.com',
      path:     '/api' + path,
      method:   method || 'GET',
      headers: {
        'X-API-Key':     apiKey,
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type':  'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      },
      timeout: 15000
    };

    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', chunk => { raw += chunk; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch(e) { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    if (data) req.write(data);
    req.end();
  });
}

function sanitizeMobile(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  const last10 = digits.slice(-10);
  return last10.length === 10 ? last10 : '';
}

// POST /api/v2/payment/create-order
router.post('/create-order', async (req, res) => {
  try {
    const employeeId = req.headers['x-employee-id'];
    if (!employeeId) return res.status(401).json({ success: false, message: 'Unauthorised' });

    const apiKey = getApiKey();
    if (!apiKey) {
      return res.status(503).json({ success: false, message: 'Payment gateway is not configured. Please contact support.' });
    }

    const student = await Student.findOne({ employeeId });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const amount = parseFloat(req.body.amount);
    if (!amount || amount < 1) return res.status(400).json({ success: false, message: 'Invalid amount (minimum ₹1)' });

    const invoiceRef  = req.body.invoiceRef  || ('INV-' + employeeId + '-' + Date.now());
    const description = req.body.description || '';
    const amountPaisa = Math.round(amount * 100);
    const orderId     = 'PAY-' + employeeId + '-' + Date.now();
    const redirectUrl = getSiteUrl() + '/payment-return.html?orderId=' + orderId;
    const mobile      = sanitizeMobile(student.phone || student.mobile || '');

    console.log('[PAYMENT] Creating order for', employeeId, '| amount:', amount, '| redirect:', redirectUrl);

    let apiRes;
    try {
      apiRes = await callPaymentSetuAPI('/create_order', 'POST', {
        order_id:        orderId,
        amount:          String(amountPaisa),
        redirect_url:    redirectUrl,
        customer_name:   student.name   || '',
        customer_email:  student.email  || '',
        customer_mobile: mobile
      });
    } catch (netErr) {
      console.error('[PAYMENT] Network error calling PaymentSetu:', netErr.message);
      return res.status(502).json({ success: false, message: 'Payment gateway unreachable. Please try again.' });
    }

    const apiBody = apiRes.body;
    console.log('[PAYMENT] PaymentSetu response (HTTP ' + apiRes.status + '):', JSON.stringify(apiBody));

    if (apiBody && apiBody.status === true && apiBody.payment_url) {
      const payment = new Payment({
        orderId,
        invoiceRef,
        studentId:      student._id,
        employeeId,
        amount:         amount,
        provider:       'paymentsetu',
        purpose:        description || 'Internship Payment',
        amountRupees:   amount,
        amountPaisa,
        status:         'pending',
        paymentUrl:     apiBody.payment_url,
        customerName:   student.name   || '',
        customerEmail:  student.email  || '',
        customerMobile: mobile,
        description
      });
      await payment.save();
      return res.json({ success: true, paymentUrl: apiBody.payment_url, orderId });
    }

    if (apiBody && apiBody.error_code === 'ALREADY_PAID') {
      const existing = await Payment.findOne({ orderId, status: 'success' });
      if (existing) return res.json({ success: true, alreadyPaid: true, orderId: existing.orderId, txnUtr: existing.txnUtr });
      return res.status(409).json({ success: false, message: 'This order was already paid.' });
    }
    if (apiBody && apiBody.error_code === 'CREDIT_EXHAUSTED') {
      return res.status(503).json({ success: false, message: 'Payment credits exhausted. Please contact support.' });
    }

    const msgLower = (apiBody && (apiBody.msg || apiBody.message || '')).toLowerCase();
    if (msgLower.includes('token') || msgLower.includes('api key') || msgLower.includes('auth')) {
      console.error('[PAYMENT] API key rejected by PaymentSetu:', apiBody);
      return res.status(502).json({ success: false, message: 'Payment gateway authentication failed. Please contact support.' });
    }

    console.error('[PAYMENT] Unexpected API response:', apiBody);
    return res.status(502).json({ success: false, message: 'Payment gateway returned an unexpected response. Please try again.' });

  } catch (err) {
    console.error('[PAYMENT] create-order error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// POST /api/v2/payment/webhook
router.post('/webhook',
  express.raw({ type: '*/*' }),
  async (req, res) => {
    const rawBody   = req.body instanceof Buffer ? req.body.toString('utf8') : JSON.stringify(req.body);
    const signature = req.headers['x-paymentsetu-signature'] || '';
    const timestamp = req.headers['x-paymentsetu-timestamp'] || '';

    if (signature && timestamp) {
      const apiKey   = getApiKey();
      const expected = crypto.createHmac('sha256', apiKey).update(timestamp + '.' + rawBody).digest('hex');
      try {
        if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
          console.warn('[PAYMENT WEBHOOK] Invalid signature');
          return res.status(401).send('Invalid signature');
        }
      } catch (_) {
        console.warn('[PAYMENT WEBHOOK] Signature comparison failed');
        return res.status(401).send('Invalid signature');
      }
    }

    let data;
    try { data = JSON.parse(rawBody); } catch (e) {
      console.error('[PAYMENT WEBHOOK] Invalid JSON body');
      return res.status(200).send('OK');
    }

    const { order_id, status, txn_utr, txn_time, customer_upi_id } = data;
    console.log('[PAYMENT WEBHOOK] order_id:', order_id, '| status:', status, '| utr:', txn_utr);

    if (status !== 'success') return res.status(200).send('OK - not success');

    try {
      const payment = await Payment.findOne({ orderId: order_id });
      if (!payment) {
        console.warn('[PAYMENT WEBHOOK] No payment record for orderId:', order_id);
        return res.status(200).send('OK - not found');
      }
      if (payment.status === 'success') {
        console.log('[PAYMENT WEBHOOK] Already processed, skipping');
        return res.status(200).send('OK - duplicate');
      }

      payment.status         = 'success';
      payment.txnUtr         = txn_utr;
      payment.txnTime        = txn_time;
      payment.customerUpiId  = customer_upi_id;
      payment.webhookPayload = data;
      payment.updatedAt      = new Date();
      await payment.save();

      try {
        await new Notification({
          title:            '💳 Payment Successful!',
          message:          `Payment of ₹${payment.amountRupees} confirmed. UTR: ${txn_utr}`,
          type:             'success',
          from:             'System',
          targetType:       'student',
          targetEmployeeId: payment.employeeId
        }).save();
      } catch (_) {}

      console.log('[PAYMENT WEBHOOK] Marked success for orderId:', order_id);
    } catch (err) {
      console.error('[PAYMENT WEBHOOK] DB error:', err.message);
    }
    return res.status(200).send('OK');
  }
);

// GET /api/v2/payment/status/:orderId
router.get('/status/:orderId', async (req, res) => {
  try {
    const employeeId = req.headers['x-employee-id'];
    if (!employeeId) return res.status(401).json({ success: false, message: 'Unauthorised' });

    const payment = await Payment.findOne({ orderId: req.params.orderId });
    if (!payment)                         return res.status(404).json({ success: false, message: 'Payment not found' });
    if (payment.employeeId !== employeeId) return res.status(403).json({ success: false, message: 'Forbidden' });

    if (payment.status === 'pending') {
      try {
        console.log('[PAYMENT STATUS CHECK] Actively checking with PaymentSetu for orderId:', payment.orderId);
        const apiRes = await callPaymentSetuAPI('/check_status?order_id=' + payment.orderId, 'GET', null);
        console.log('[PAYMENT STATUS CHECK] PaymentSetu response:', apiRes ? apiRes.body : 'No response');
        if (apiRes && apiRes.body) {
          const body = apiRes.body;
          const isSuccess = 
            (body.status === 'success') || 
            (body.data && body.data.status === 'success') || 
            (body.order && body.order.status === 'success') ||
            (body.status === true && body.data && body.data.status === 'success');
            
          if (isSuccess) {
            const utr = (body.data && body.data.txn_utr) || body.txn_utr || 'API_POLL_' + Date.now();
            const txnTime = (body.data && body.data.txn_time) || body.txn_time || new Date().toISOString();
            const upiId = (body.data && body.data.customer_upi_id) || body.customer_upi_id || '';
            
            payment.status = 'success';
            payment.txnUtr = utr;
            payment.txnTime = txnTime;
            payment.customerUpiId = upiId;
            await payment.save();
            console.log('[PAYMENT STATUS CHECK] Payment updated to success via active polling!');

            try {
              await new Notification({
                title:            '💳 Payment Successful!',
                message:          `Payment of ₹${payment.amountRupees} confirmed. UTR: ${payment.txnUtr}`,
                type:             'success',
                from:             'System',
                targetType:       'student',
                targetEmployeeId: payment.employeeId
              }).save();
            } catch (_) {}
          }
        }
      } catch (checkErr) {
        console.error('[PAYMENT STATUS CHECK] Active verification failed:', checkErr.message);
      }
    }

    return res.json({
      success:      true,
      status:       payment.status,
      amountRupees: payment.amountRupees,
      txnUtr:       payment.txnUtr,
      txnTime:      payment.txnTime,
      createdAt:    payment.createdAt
    });
  } catch (err) {
    console.error('[PAYMENT] status error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/v2/payment/utr-confirm
router.post('/utr-confirm', async (req, res) => {
  try {
    const employeeId = req.headers['x-employee-id'];
    if (!employeeId) return res.status(401).json({ success: false, message: 'Unauthorised' });

    const { utr, amount, description } = req.body;
    if (!utr || String(utr).trim().length < 6) {
      return res.status(400).json({ success: false, message: 'Invalid UTR' });
    }

    const student = await Student.findOne({ employeeId });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const orderId = 'UPIPAY-' + employeeId + '-' + Date.now();
    const cleanAmount = parseFloat(amount) || 0;

    const payment = new Payment({
      orderId,
      invoiceRef:     'UTR-' + String(utr).trim(),
      studentId:      student._id,
      employeeId,
      amount:         cleanAmount,
      provider:       'manual',
      purpose:        description || 'Direct UPI Payment',
      amountRupees:   cleanAmount,
      amountPaisa:    Math.round(cleanAmount * 100),
      status:         'pending_verification',
      txnUtr:         String(utr).trim(),
      customerName:   student.name  || '',
      customerEmail:  student.email || '',
      description:    description   || 'Direct UPI Payment',
      paymentUrl:     ''
    });
    await payment.save();

    try {
      await new Notification({
        title:            '💳 Payment Confirmation Received',
        message:          `Student ${employeeId} submitted UTR ${utr} for ₹${amount}. Please verify.`,
        type:             'info',
        from:             'System',
        targetType:       'hr'
      }).save();
    } catch (_) {}

    console.log('[PAYMENT] UTR confirm submitted by', employeeId, '| UTR:', utr, '| amount:', amount);
    return res.json({ success: true, message: 'Payment confirmation received. Our team will verify shortly.' });
  } catch (err) {
    console.error('[PAYMENT] utr-confirm error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/v2/payment/my-payments
router.get('/my-payments', async (req, res) => {
  try {
    const employeeId = req.headers['x-employee-id'];
    if (!employeeId) return res.status(401).json({ success: false, message: 'Unauthorised' });

    const payments = await Payment.find({ employeeId }).sort({ createdAt: -1 });
    return res.json({ success: true, payments });
  } catch (err) {
    console.error('[PAYMENT] my-payments error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/v2/payment/check-credits
router.get('/check-credits', async (req, res) => {
  try {
    const auth       = req.headers.authorization || '';
    const employeeId = req.headers['x-employee-id'];
    if (!employeeId && !auth.startsWith('Bearer hr_')) {
      return res.status(401).json({ success: false, message: 'Unauthorised' });
    }

    let apiRes;
    try { apiRes = await callPaymentSetuAPI('/check_credits', 'GET', null); }
    catch (netErr) { return res.status(502).json({ success: false, message: 'Gateway unreachable' }); }

    const body    = apiRes.body;
    const credits = body && body.credits ? body.credits : body;
    const warning = credits && credits.remaining_credits < 10
      ? 'Warning: fewer than 10 payment credits remaining.'
      : null;
    return res.json({ success: true, credits, warning });
  } catch (err) {
    console.error('[PAYMENT] check-credits error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/v2/payment/hr-all-payments
router.get('/hr-all-payments', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer hr_')) {
      return res.status(403).json({ success: false, message: 'HR access required' });
    }
    const payments = await Payment.find({}).sort({ createdAt: -1 })
      .populate('studentId', 'name email employeeId domain');
    return res.json({ success: true, total: payments.length, payments });
  } catch (err) {
    console.error('[PAYMENT] hr-all-payments error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
