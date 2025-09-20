import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { User } from '../types';
import { createRefreshToken, verifyStoredRefresh, rotateRefreshToken } from './refresh';

export function signToken(user: User) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, ENV.JWT_SECRET, { expiresIn: '1d' });
}

export function verifyToken(token: string) {
  return jwt.verify(token, ENV.JWT_SECRET) as { sub: string; email: string; role: string; iat: number; exp: number };
}

export async function signRefreshToken(userId: string) {
  return createRefreshToken(userId);
}

export async function verifyRefreshToken(token: string) {
  const userId = await verifyStoredRefresh(token);
  return { userId };
}

export async function rotateRefresh(oldToken: string) {
  return rotateRefreshToken(oldToken);
}
