'use strict';

const { requireRole, attachEcosystemUser } = require('../../middleware/roleGuard');
const { ROLES } = require('../../config/roles');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('middleware/roleGuard', () => {
  describe('requireRole', () => {
    it('throws when called with zero arguments', () => {
      expect(() => requireRole()).toThrow('at least one role');
    });

    it('returns a function (middleware)', () => {
      expect(typeof requireRole(ROLES.ADMIN)).toBe('function');
    });

    it('responds 401 when req.user is missing', () => {
      const mw = requireRole(ROLES.ADMIN);
      const req = {};
      const res = mockRes();
      const next = jest.fn();

      mw(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: 'Authentication required.' })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('responds 403 when user role is not in the allowed list', () => {
      const mw = requireRole(ROLES.ADMIN, ROLES.HR);
      const req = { user: { role: ROLES.STUDENT } };
      const res = mockRes();
      const next = jest.fn();

      mw(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          yourRole: ROLES.STUDENT,
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next() when the user role matches one of the allowed roles', () => {
      const mw = requireRole(ROLES.ADMIN, ROLES.FOUNDER);
      const req = { user: { role: ROLES.FOUNDER } };
      const res = mockRes();
      const next = jest.fn();

      mw(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('works with a single allowed role', () => {
      const mw = requireRole(ROLES.COORDINATOR);
      const req = { user: { role: ROLES.COORDINATOR } };
      const res = mockRes();
      const next = jest.fn();

      mw(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('attachEcosystemUser', () => {
    it('attaches user from x-ecosystem-user-id header', () => {
      const req = {
        headers: { 'x-ecosystem-user-id': 'user123', 'x-ecosystem-user-role': 'mentor' },
      };
      const res = mockRes();
      const next = jest.fn();

      attachEcosystemUser(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.user._id).toBe('user123');
      expect(req.user.role).toBe('mentor');
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('defaults role to FOUNDER when x-ecosystem-user-role header is absent', () => {
      const req = {
        headers: { 'x-ecosystem-user-id': 'user456' },
      };
      const res = mockRes();
      const next = jest.fn();

      attachEcosystemUser(req, res, next);

      expect(req.user.role).toBe(ROLES.FOUNDER);
    });

    it('falls back to session ecosystemUserId', () => {
      const req = {
        headers: {},
        session: { ecosystemUserId: 'sess-user' },
      };
      const res = mockRes();
      const next = jest.fn();

      attachEcosystemUser(req, res, next);

      expect(req.user._id).toBe('sess-user');
      expect(next).toHaveBeenCalled();
    });

    it('does not overwrite an existing req.user', () => {
      const existingUser = { _id: 'existing', role: 'admin' };
      const req = {
        headers: { 'x-ecosystem-user-id': 'new-id' },
        user: existingUser,
      };
      const res = mockRes();
      const next = jest.fn();

      attachEcosystemUser(req, res, next);

      expect(req.user).toBe(existingUser);
    });

    it('calls next without setting user when no id is available', () => {
      const req = { headers: {} };
      const res = mockRes();
      const next = jest.fn();

      attachEcosystemUser(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });
  });
});
