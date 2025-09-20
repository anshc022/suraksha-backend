import { Schema, model } from 'mongoose';

const emergencyContactSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String },
  relationship: { type: String, required: true },
  isPrimary: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Ensure only one primary contact per user
emergencyContactSchema.index({ userId: 1, isPrimary: 1 }, { 
  unique: true, 
  partialFilterExpression: { isPrimary: true } 
});

export const EmergencyContactModel = model('EmergencyContact', emergencyContactSchema);