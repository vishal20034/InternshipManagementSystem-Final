'use strict';

const { validateTalentProfile } = require('../../middleware/validateTalentProfile');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('middleware/validateTalentProfile', () => {
  it('calls next() for a valid body', () => {
    const req = {
      body: {
        headline: 'Software Engineer',
        bio: 'I build things.',
        availability: 'immediately',
        visibility: 'public',
        skills: [{ level: 'beginner' }],
        openTo: ['internship', 'fulltime'],
        socialLinks: { linkedin: 'https://linkedin.com/in/test' },
      },
    };
    const res = mockRes();
    const next = jest.fn();

    validateTalentProfile(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('calls next() for an empty body (all fields optional)', () => {
    const req = { body: {} };
    const res = mockRes();
    const next = jest.fn();

    validateTalentProfile(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('rejects headline longer than 120 characters', () => {
    const req = { body: { headline: 'x'.repeat(121) } };
    const res = mockRes();
    const next = jest.fn();

    validateTalentProfile(req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        errors: expect.arrayContaining([
          expect.objectContaining({ field: 'headline' }),
        ]),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('allows headline of exactly 120 characters', () => {
    const req = { body: { headline: 'x'.repeat(120) } };
    const res = mockRes();
    const next = jest.fn();

    validateTalentProfile(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('rejects bio longer than 1000 characters', () => {
    const req = { body: { bio: 'a'.repeat(1001) } };
    const res = mockRes();
    const next = jest.fn();

    validateTalentProfile(req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    const body = res.json.mock.calls[0][0];
    expect(body.errors.some(e => e.field === 'bio')).toBe(true);
  });

  it('rejects invalid availability value', () => {
    const req = { body: { availability: 'next-year' } };
    const res = mockRes();
    const next = jest.fn();

    validateTalentProfile(req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    const body = res.json.mock.calls[0][0];
    expect(body.errors.some(e => e.field === 'availability')).toBe(true);
  });

  it('accepts all valid availability values', () => {
    for (const val of ['immediately', '2weeks', '1month', 'not-available']) {
      const req = { body: { availability: val } };
      const res = mockRes();
      const next = jest.fn();

      validateTalentProfile(req, res, next);

      expect(next).toHaveBeenCalled();
    }
  });

  it('rejects invalid visibility value', () => {
    const req = { body: { visibility: 'hidden' } };
    const res = mockRes();
    const next = jest.fn();

    validateTalentProfile(req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
  });

  it('accepts all valid visibility values', () => {
    for (const val of ['public', 'network', 'private']) {
      const req = { body: { visibility: val } };
      const res = mockRes();
      const next = jest.fn();

      validateTalentProfile(req, res, next);

      expect(next).toHaveBeenCalled();
    }
  });

  it('rejects invalid skill level', () => {
    const req = { body: { skills: [{ level: 'pro' }] } };
    const res = mockRes();
    const next = jest.fn();

    validateTalentProfile(req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    const body = res.json.mock.calls[0][0];
    expect(body.errors.some(e => e.field === 'skills[0].level')).toBe(true);
  });

  it('accepts all valid skill levels', () => {
    for (const level of ['beginner', 'intermediate', 'advanced', 'expert']) {
      const req = { body: { skills: [{ level }] } };
      const res = mockRes();
      const next = jest.fn();

      validateTalentProfile(req, res, next);

      expect(next).toHaveBeenCalled();
    }
  });

  it('rejects invalid openTo value', () => {
    const req = { body: { openTo: ['contract'] } };
    const res = mockRes();
    const next = jest.fn();

    validateTalentProfile(req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    const body = res.json.mock.calls[0][0];
    expect(body.errors.some(e => e.field === 'openTo[0]')).toBe(true);
  });

  it('accepts all valid openTo values', () => {
    const valid = ['internship', 'fulltime', 'parttime', 'freelance', 'mentorship', 'investment'];
    const req = { body: { openTo: valid } };
    const res = mockRes();
    const next = jest.fn();

    validateTalentProfile(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('rejects invalid social link URLs', () => {
    const req = { body: { socialLinks: { linkedin: 'not-a-url' } } };
    const res = mockRes();
    const next = jest.fn();

    validateTalentProfile(req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    const body = res.json.mock.calls[0][0];
    expect(body.errors.some(e => e.field === 'socialLinks.linkedin')).toBe(true);
  });

  it('accepts valid social link URLs', () => {
    const req = {
      body: {
        socialLinks: {
          linkedin: 'https://linkedin.com/in/user',
          github: 'https://github.com/user',
          twitter: 'http://twitter.com/user',
          website: 'https://example.com',
        },
      },
    };
    const res = mockRes();
    const next = jest.fn();

    validateTalentProfile(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('skips URL validation for empty social link fields', () => {
    const req = { body: { socialLinks: { linkedin: '', github: null } } };
    const res = mockRes();
    const next = jest.fn();

    validateTalentProfile(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('collects multiple errors at once', () => {
    const req = {
      body: {
        headline: 'x'.repeat(121),
        bio: 'b'.repeat(1001),
        availability: 'wrong',
        visibility: 'wrong',
      },
    };
    const res = mockRes();
    const next = jest.fn();

    validateTalentProfile(req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    const body = res.json.mock.calls[0][0];
    expect(body.errors.length).toBeGreaterThanOrEqual(4);
  });
});
