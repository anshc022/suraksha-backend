import { Schema, model } from 'mongoose';

const refreshTokenSchema = new Schema({
  userId: { type: String, index: true, required: true },
  token: { type: String, unique: true, required: true },
  expiresAt: { type: Date, required: true },
  revoked: { type: Boolean, default: false }
}, { timestamps: true });

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshTokenModel = model('RefreshToken', refreshTokenSchema);
