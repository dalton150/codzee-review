import { afterEach, describe, expect, it, jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import authenticate from '../../src/middleware/authenticate.js';
const TEST_SECRET = 'test-only-secret-for-jwt-verification';

describe('Authentication middleware', () => {
    const originalSecret = process.env.JWT_SECRET;

    afterEach(() => {
        if (originalSecret === undefined) {
            delete process.env.JWT_SECRET;
        } else {
            process.env.JWT_SECRET = originalSecret;
        }
    });

    it('rejects requests without a Bearer token', () => {
        process.env.JWT_SECRET = TEST_SECRET;

        const req = {
            get: () => undefined,
        };
        const res = {
            status: jestStatusMock(),
            json: jestJsonMock(),
        };
        const next = jestNextMock();

        authenticate(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            error: {
                code: 'UNAUTHENTICATED',
                message: 'A valid Bearer token is required',
            },
        });
        expect(next).not.toHaveBeenCalled();
    });

    it('sets the authenticated identity from a verified token', () => {
        process.env.JWT_SECRET = TEST_SECRET;

        const token = jwt.sign(
            { sub: 'user-123' },
            TEST_SECRET,
            { algorithm: 'HS256', expiresIn: '5m' },
        );

        const req = {
            get: () => `Bearer ${token}`,
        };
        const res = {
            status: jestStatusMock(),
            json: jestJsonMock(),
        };
        const next = jestNextMock();

        authenticate(req, res, next);

        expect(req.user).toEqual({ id: 'user-123' });
        expect(next).toHaveBeenCalledTimes(1);
        expect(res.status).not.toHaveBeenCalled();
    });

    it('rejects a token signed with the wrong secret', () => {
        process.env.JWT_SECRET = TEST_SECRET;

        const token = jwt.sign(
            { sub: 'user-123' },
            'different-secret',
            { algorithm: 'HS256', expiresIn: '5m' },
        );

        const req = {
            get: () => `Bearer ${token}`,
        };
        const res = {
            status: jestStatusMock(),
            json: jestJsonMock(),
        };
        const next = jestNextMock();

        authenticate(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it('fails closed when JWT_SECRET is not configured', () => {
        delete process.env.JWT_SECRET;

        const req = {
            get: () => 'Bearer some-token',
        };
        const res = {
            status: jestStatusMock(),
            json: jestJsonMock(),
        };
        const next = jestNextMock();

        authenticate(req, res, next);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            error: {
                code: 'AUTHENTICATION_NOT_CONFIGURED',
                message: 'Authentication is not configured',
            },
        });
        expect(next).not.toHaveBeenCalled();
    });
});

function jestStatusMock() {
  return jest.fn(function (statusCode) {
    this.statusCode = statusCode;
    return this;
  });
}

function jestJsonMock() {
  return jest.fn(function (body) {
    this.body = body;
    return this;
  });
}

function jestNextMock() {
  return jest.fn();
}