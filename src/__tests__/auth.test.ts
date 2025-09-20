import { authMiddleware } from '../middleware/auth';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

// Set test environment
process.env.JWT_SECRET = 'test-secret-key-for-testing';

describe('Auth Middleware', () => {
  it('should authenticate valid token', () => {
    const token = jwt.sign(
      { sub: 'user123', email: 'test@example.com', role: 'tourist' },
      'test-secret-key-for-testing',
      { expiresIn: '1h' }
    );

    const req = {
      headers: {
        authorization: `Bearer ${token}`
      }
    } as any;

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    } as any;

    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({
      id: 'user123',
      email: 'test@example.com',
      role: 'tourist'
    });
  });

  it('should reject missing token', () => {
    const req = { headers: {} } as any;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    } as any;
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing token' });
    expect(next).not.toHaveBeenCalled();
  });
});