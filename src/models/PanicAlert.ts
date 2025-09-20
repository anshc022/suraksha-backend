import { Schema, model } from 'mongoose';

const panicAlertSchema = new Schema({
  userId: { type: String, required: true, index: true },
  location: { type: { type: String, enum: ['Point'], default: 'Point' }, coordinates: { type: [Number], required: true, index: '2dsphere' } },
  lat: { type: Number, required: true, min: -90, max: 90 },
  lng: { type: Number, required: true, min: -180, max: 180 },
  timestamp: { type: Date, default: () => new Date(), index: true },
  message: { type: String, default: 'Emergency panic alert triggered' },
  acknowledged: { type: Boolean, default: false },
  acknowledgedBy: { type: String },
  isAutomatic: { type: Boolean, default: false },
  alertType: { type: String, enum: ['manual', 'safe-zone-exit', 'emergency'], default: 'manual' }
}, { timestamps: true });

panicAlertSchema.index({ createdAt: -1 });

export const PanicAlertModel = model('PanicAlert', panicAlertSchema);
