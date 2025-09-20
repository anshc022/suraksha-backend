import { Schema, model, Document } from 'mongoose';

export interface UserLocationDoc extends Document {
  userId: string;
  location: { type: 'Point'; coordinates: [number, number] };
  speed?: number;
  accuracy?: number;
  anomaly?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const userLocationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  location: { type: { type: String, enum: ['Point'], required: true }, coordinates: { type: [Number], required: true, index: '2dsphere' } },
  speed: Number,
  accuracy: Number,
  anomaly: String
}, { timestamps: true });

export const UserLocationModel = model<UserLocationDoc>('UserLocation', userLocationSchema);
