import { SafeZoneModel } from '../models/SafeZone';
import { UserLocationModel } from '../models/UserLocation';
import { PanicAlertModel } from '../models/PanicAlert';
import { Server } from 'socket.io';

interface LocationUpdate {
  userId: string;
  latitude: number;
  longitude: number;
  timestamp: Date;
}

interface UserSafetyStatus {
  userId: string;
  isInSafeZone: boolean;
  lastSafeZoneExit?: Date;
  alertSent: boolean;
  currentSafeZones: string[];
}

class GeofencingService {
  private userStatuses = new Map<string, UserSafetyStatus>();
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  async processLocationUpdate(locationUpdate: LocationUpdate): Promise<void> {
    const { userId, latitude, longitude, timestamp } = locationUpdate;

    try {
      // Find all active safe zones
      const safeZones = await SafeZoneModel.find({ isActive: true });

      // Check which safe zones the user is currently in
      const currentSafeZones: string[] = [];
      
      for (const zone of safeZones) {
        const distance = this.calculateDistance(
          latitude, 
          longitude, 
          zone.center.lat, 
          zone.center.lng
        );
        
        if (distance <= zone.radius) {
          currentSafeZones.push(zone._id.toString());
        }
      }

      // Get previous status
      const previousStatus = this.userStatuses.get(userId);
      const isCurrentlyInSafeZone = currentSafeZones.length > 0;

      // Create new status
      const newStatus: UserSafetyStatus = {
        userId,
        isInSafeZone: isCurrentlyInSafeZone,
        lastSafeZoneExit: previousStatus?.lastSafeZoneExit,
        alertSent: previousStatus?.alertSent || false,
        currentSafeZones
      };

      // Check if user just left all safe zones
      const wasInSafeZone = previousStatus?.isInSafeZone || false;
      const justLeftSafeZone = wasInSafeZone && !isCurrentlyInSafeZone;

      if (justLeftSafeZone) {
        newStatus.lastSafeZoneExit = timestamp;
        newStatus.alertSent = false;
        console.log(`User ${userId} left safe zone at ${timestamp}`);
      }

      // Check if user has been outside safe zones for too long
      if (!isCurrentlyInSafeZone && newStatus.lastSafeZoneExit && !newStatus.alertSent) {
        const timeOutside = timestamp.getTime() - newStatus.lastSafeZoneExit.getTime();
        const thresholdMs = this.getMinAlertThreshold(safeZones) * 1000; // Convert to milliseconds

        if (timeOutside >= thresholdMs) {
          await this.sendAutomaticEmergencyAlert(userId, latitude, longitude, timeOutside);
          newStatus.alertSent = true;
        }
      }

      // Update user status
      this.userStatuses.set(userId, newStatus);

      // Broadcast status update to dashboard
      this.io.emit('user-safety-status', {
        userId,
        isInSafeZone: isCurrentlyInSafeZone,
        currentSafeZones,
        lastUpdate: timestamp,
        alertSent: newStatus.alertSent
      });

    } catch (error) {
      console.error('Error processing location update:', error);
    }
  }

  private async sendAutomaticEmergencyAlert(
    userId: string,
    latitude: number,
    longitude: number,
    timeOutside: number
  ): Promise<void> {
    try {
      // Create automatic panic alert
      const panicAlert = new PanicAlertModel({
        userId,
        location: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        message: `AUTOMATIC ALERT: User has been outside safe zones for ${Math.round(timeOutside / 1000)} seconds`,
        isAutomatic: true,
        alertType: 'safe-zone-exit',
        timestamp: new Date()
      });

      await panicAlert.save();

      // Get user location for context
      const userLocation = await UserLocationModel.findOne({ userId }).sort({ timestamp: -1 });

      // Broadcast emergency alert
      this.io.emit('emergency-alert', {
        id: panicAlert._id,
        userId,
        location: { lat: latitude, lng: longitude },
        message: panicAlert.message,
        timestamp: panicAlert.timestamp,
        isAutomatic: true,
        alertType: 'safe-zone-exit',
        userLocation: userLocation ? {
          accuracy: userLocation.accuracy,
          speed: userLocation.speed,
          coordinates: userLocation.location.coordinates
        } : null
      });

      console.log(`Automatic emergency alert sent for user ${userId}`);

      // Also send to specific user if they're connected
      this.io.to(userId).emit('automatic-alert-sent', {
        message: 'Emergency alert sent automatically - you have been outside safe zones for too long',
        alertId: panicAlert._id
      });

    } catch (error) {
      console.error('Error sending automatic emergency alert:', error);
    }
  }

  private getMinAlertThreshold(safeZones: any[]): number {
    if (safeZones.length === 0) return 300; // Default 5 minutes
    return Math.min(...safeZones.map(zone => zone.alertThreshold));
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Get current safety status for all users
  getUserSafetyStatuses(): Map<string, UserSafetyStatus> {
    return this.userStatuses;
  }

  // Get safety status for specific user
  getUserSafetyStatus(userId: string): UserSafetyStatus | undefined {
    return this.userStatuses.get(userId);
  }

  // Reset alert status for user (e.g., when they return to safe zone)
  resetUserAlertStatus(userId: string): void {
    const status = this.userStatuses.get(userId);
    if (status) {
      status.alertSent = false;
      this.userStatuses.set(userId, status);
    }
  }
}

export { GeofencingService, UserSafetyStatus, LocationUpdate };