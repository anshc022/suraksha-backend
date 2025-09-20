import { NotificationTokenModel } from '../models/NotificationToken';

export interface PushNotification {
  title: string;
  body: string;
  data?: Record<string, any>;
  priority?: 'high' | 'normal';
}

export class NotificationService {
  /**
   * Send push notification to user's devices
   */
  static async sendToUser(userId: string, notification: PushNotification): Promise<boolean> {
    try {
      // Get all active tokens for user
      const tokens = await NotificationTokenModel.find({ 
        userId, 
        isActive: true 
      });

      if (tokens.length === 0) {
        console.log(`No active push tokens found for user ${userId}`);
        return false;
      }

      // Here you would integrate with Expo Push API or Firebase FCM
      // For now, we'll simulate sending notifications
      console.log(`Sending push notification to ${tokens.length} devices:`, {
        userId,
        notification,
        tokens: tokens.map(t => ({ platform: t.platform, token: t.token.substring(0, 20) + '...' }))
      });

      // Update last used timestamp
      await NotificationTokenModel.updateMany(
        { userId, isActive: true },
        { lastUsed: new Date() }
      );

      return true;
    } catch (error) {
      console.error('Error sending push notification:', error);
      return false;
    }
  }

  /**
   * Send emergency notification
   */
  static async sendEmergencyAlert(
    userId: string, 
    alertType: 'panic' | 'sos', 
    location?: { lat: number; lng: number }
  ): Promise<boolean> {
    const notification: PushNotification = {
      title: alertType === 'panic' ? '🆘 PANIC ALERT' : '🚨 SOS EMERGENCY',
      body: alertType === 'panic' 
        ? 'Emergency panic alert activated. Help is on the way.'
        : 'SOS emergency alert sent. Emergency services notified.',
      data: {
        type: 'emergency',
        alertType,
        location,
        timestamp: new Date().toISOString(),
      },
      priority: 'high',
    };

    return await this.sendToUser(userId, notification);
  }

  /**
   * Send incident notification
   */
  static async sendIncidentAlert(
    userId: string,
    incident: {
      type: string;
      severity: string;
      location: { lat: number; lng: number };
      distance?: number;
    }
  ): Promise<boolean> {
    const notification: PushNotification = {
      title: '⚠️ Safety Alert',
      body: `${incident.type} (${incident.severity}) reported ${
        incident.distance ? `${Math.round(incident.distance)}m away` : 'nearby'
      }. Stay alert!`,
      data: {
        type: 'incident',
        incident,
        timestamp: new Date().toISOString(),
      },
      priority: 'high',
    };

    return await this.sendToUser(userId, notification);
  }

  /**
   * Send location sharing confirmation
   */
  static async sendLocationShareConfirmation(
    userId: string,
    contactsNotified: number
  ): Promise<boolean> {
    const notification: PushNotification = {
      title: '📍 Location Shared',
      body: `Your location has been shared with ${contactsNotified} emergency contact${contactsNotified !== 1 ? 's' : ''}`,
      data: {
        type: 'location_share',
        contactsNotified,
        timestamp: new Date().toISOString(),
      },
      priority: 'normal',
    };

    return await this.sendToUser(userId, notification);
  }

  /**
   * Cleanup inactive tokens
   */
  static async cleanupInactiveTokens(): Promise<void> {
    try {
      // Remove tokens that haven't been used in 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await NotificationTokenModel.deleteMany({
        lastUsed: { $lt: thirtyDaysAgo },
        isActive: false
      });

      console.log(`Cleaned up ${result.deletedCount} inactive notification tokens`);
    } catch (error) {
      console.error('Error cleaning up notification tokens:', error);
    }
  }
}

export default NotificationService;