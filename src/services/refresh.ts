import crypto from 'crypto';
import { RefreshTokenModel } from '../models/RefreshToken';

export async function createRefreshToken(userId: string) {
  const token = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
  await RefreshTokenModel.create({ userId, token, expiresAt });
  return token;
}

export async function verifyStoredRefresh(token: string) {
  const doc = await RefreshTokenModel.findOne({ token, revoked: false });
  if (!doc) throw new Error('Invalid');
  if (doc.expiresAt.getTime() < Date.now()) throw new Error('Expired');
  return doc.userId;
}

export async function rotateRefreshToken(oldToken: string) {
  const doc = await RefreshTokenModel.findOne({ token: oldToken, revoked: false });
  if (!doc) throw new Error('Invalid refresh');
  doc.revoked = true; await doc.save();
  return createRefreshToken(doc.userId);
}
