import { Schema, model, Document } from 'mongoose';

export interface IncidentDoc extends Document {
  type: string;
  userId: string;
  alertId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'acknowledged' | 'resolved';
  description?: string;
  location?: { type: 'Point'; coordinates: [number, number] };
}

const incidentSchema = new Schema({
  type: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  alertId: { type: Schema.Types.ObjectId, ref: 'PanicAlert' },
  severity: { type: String, enum: ['low','medium','high','critical'], default: 'medium' },
  status: { type: String, enum: ['open','acknowledged','resolved'], default: 'open' },
  description: String,
  location: { type: { type: String, enum: ['Point'] }, coordinates: { type: [Number], index: '2dsphere' } }
}, { timestamps: true });

export const IncidentModel = model<IncidentDoc>('Incident', incidentSchema);
