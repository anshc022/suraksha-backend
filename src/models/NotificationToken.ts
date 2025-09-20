import { Schema, model } from 'mongoose';

const notificationTokenSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  token: { type: String, required: true },
  platform: { type: String, enum: ['ios', 'android', 'web'], required: true },
  isActive: { type: Boolean, default: true },
  lastUsed: { type: Date, default: Date.now },
}, { timestamps: true });

// Ensure unique token per user per platform
notificationTokenSchema.index({ userId: 1, token: 1 }, { unique: true });

export const NotificationTokenModel = model('NotificationToken', notificationTokenSchema);