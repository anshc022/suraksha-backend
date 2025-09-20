import { Schema, model, Document } from 'mongoose';

export interface SafeZone extends Document {
  _id: string;
  name: string;
  description?: string;
  center: {
    lat: number;
    lng: number;
  };
  radius: number; // in meters
  isActive: boolean;
  createdBy: string; // admin user ID
  createdAt: Date;
  updatedAt: Date;
  polygon?: Array<{
    lat: number;
    lng: number;
  }>; // For complex shapes (optional)
  alertThreshold: number; // seconds outside before alert
  emergencyContacts?: string[]; // specific contacts for this zone
}

const safeZoneSchema = new Schema<SafeZone>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  center: {
    lat: {
      type: Number,
      required: true,
      min: -90,
      max: 90
    },
    lng: {
      type: Number,
      required: true,
      min: -180,
      max: 180
    }
  },
  radius: {
    type: Number,
    required: true,
    min: 10, // minimum 10 meters
    max: 50000 // maximum 50km
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: String,
    required: true
  },
  alertThreshold: {
    type: Number,
    default: 30, // 30 seconds
    min: 10,
    max: 300
  },
  polygon: [{
    lat: {
      type: Number,
      min: -90,
      max: 90
    },
    lng: {
      type: Number,
      min: -180,
      max: 180
    }
  }],
  emergencyContacts: [String]
}, {
  timestamps: true
});

// Index for geospatial queries
safeZoneSchema.index({ "center": "2dsphere" });

export const SafeZoneModel = model<SafeZone>('SafeZone', safeZoneSchema);