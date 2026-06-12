'use strict';

const crypto = require('crypto');

// Mock the PaymentTransaction model before requiring the module
jest.mock('../../../models/PaymentTransaction', () => {
  const mockModel = {
    PAYMENT_STATUSES: {
      CREATED: 'CREATED',
      PENDING: 'PENDING',
      PAID: 'PAID',
      FAILED: 'FAILED',
      REFUNDED: 'REFUNDED',
    },
    findOne: jest.fn(),
    findById: jest.fn(),
  };
  return mockModel;
});

const { verifyWebhookSignature, webhookEmitter } = require('../../../services/payment/PaymentWebhookService');

describe('services/payment/PaymentWebhookService', () => {
  describe('verifyWebhookSignature', () => {
    const secret = 'test-secret-key';
    const rawBody = '{"event":"payment.captured","payload":{}}';

    function computeSignature(body, key) {
      return crypto.createHmac('sha256', key).update(body).digest('hex');
    }

    it('returns true for a valid HMAC-SHA256 signature', () => {
      const signature = computeSignature(rawBody, secret);
      const result = verifyWebhookSignature({ rawBody, signature, secret });
      expect(result).toBe(true);
    });

    it('returns false for an invalid signature', () => {
      const result = verifyWebhookSignature({
        rawBody,
        signature: 'deadbeef'.repeat(8),
        secret,
      });
      expect(result).toBe(false);
    });

    it('returns false when secret is missing', () => {
      expect(verifyWebhookSignature({ rawBody, signature: 'abc', secret: '' })).toBe(false);
      expect(verifyWebhookSignature({ rawBody, signature: 'abc', secret: null })).toBe(false);
    });

    it('returns false when signature is missing', () => {
      expect(verifyWebhookSignature({ rawBody, signature: '', secret })).toBe(false);
      expect(verifyWebhookSignature({ rawBody, signature: null, secret })).toBe(false);
    });

    it('returns false when rawBody is missing', () => {
      expect(verifyWebhookSignature({ rawBody: '', signature: 'abc', secret })).toBe(false);
      expect(verifyWebhookSignature({ rawBody: null, signature: 'abc', secret })).toBe(false);
    });

    it('works with a Buffer rawBody', () => {
      const bufBody = Buffer.from(rawBody, 'utf8');
      const signature = computeSignature(rawBody, secret);
      const result = verifyWebhookSignature({ rawBody: bufBody, signature, secret });
      expect(result).toBe(true);
    });

    it('returns false for signature with wrong length', () => {
      const result = verifyWebhookSignature({ rawBody, signature: 'short', secret });
      expect(result).toBe(false);
    });
  });

  describe('webhookEmitter', () => {
    it('is an EventEmitter instance', () => {
      const { EventEmitter } = require('events');
      expect(webhookEmitter).toBeInstanceOf(EventEmitter);
    });

    it('can emit and listen for webhook events', (done) => {
      const payload = { event: 'test', data: 123 };
      webhookEmitter.once('webhook', (received) => {
        expect(received).toEqual(payload);
        done();
      });
      webhookEmitter.emit('webhook', payload);
    });
  });
});
