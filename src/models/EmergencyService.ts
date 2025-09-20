import { Schema, model, Document } from 'mongoose';

export interface IEmergencyService extends Document {
  name: string;
  phoneNumber: string;
  serviceType: 'police' | 'hospital' | 'fire' | 'tourist_helpline' | 'other';
  address: string;
  city: string;
  state: string;
  isActive: boolean;
  availableHours: string;
  description?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const EmergencyServiceSchema = new Schema<IEmergencyService>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  phoneNumber: {
    type: String,
    required: true,
    trim: true
  },
  serviceType: {
    type: String,
    required: true,
    enum: ['police', 'hospital', 'fire', 'tourist_helpline', 'other'],
    default: 'other'
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  state: {
    type: String,
    required: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  availableHours: {
    type: String,
    default: '24/7'
  },
  description: {
    type: String,
    trim: true
  },
  coordinates: {
    latitude: {
      type: Number
    },
    longitude: {
      type: Number
    }
  }
}, {
  timestamps: true
});

// Index for location-based searches
EmergencyServiceSchema.index({ city: 1, state: 1, serviceType: 1 });
EmergencyServiceSchema.index({ coordinates: '2dsphere' });

export const EmergencyService = model<IEmergencyService>('EmergencyService', EmergencyServiceSchema);