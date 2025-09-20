import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { EmergencyContactModel } from '../models/EmergencyContact';
import { NotificationTokenModel } from '../models/NotificationToken';
import NotificationService from '../services/notificationService';

export const userRouter = Router();

const locationShareSchema = z.object({
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    timestamp: z.string(),
  }),
  message: z.string().optional(),
  contacts: z.array(z.object({
    id: z.string(),
    phone: z.string(),
    email: z.string().optional(),
  })).optional(),
});

const pushTokenSchema = z.object({
  token: z.string(),
  platform: z.enum(['ios', 'android', 'web']),
});

// Share location with emergency contacts
userRouter.post('/share-location', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const parse = locationShareSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        issues: parse.error.issues 
      });
    }

    const { location, message, contacts } = parse.data;
    const userId = req.user!.id;

    // Get emergency contacts if not provided
    let targetContacts = contacts;
    if (!targetContacts || targetContacts.length === 0) {
      const emergencyContacts = await EmergencyContactModel.find({ 
        userId, 
        isActive: true 
      });
      
      targetContacts = emergencyContacts.map(contact => ({
        id: contact._id.toString(),
        phone: contact.phone,
        email: contact.email || undefined,
      }));
    }

    if (!targetContacts || targetContacts.length === 0) {
      return res.status(400).json({ 
        error: 'No active emergency contacts found' 
      });
    }

    // Here you would integrate with SMS/Email service to send location
    // For now, we'll simulate sending to all contacts
    console.log(`Location shared with ${targetContacts.length} contacts:`, {
      location,
      message: message || 'Emergency location sharing',
      contacts: targetContacts.map(c => c.phone)
    });

    // You could also emit a socket event for real-time updates
    // io.emit('location_shared', { userId, location, timestamp: new Date() });

    // Send confirmation notification to user
    await NotificationService.sendLocationShareConfirmation(
      userId, 
      targetContacts.length
    );

    res.json({ 
      success: true,
      message: 'Location shared successfully',
      contactsNotified: targetContacts.length,
      location
    });
  } catch (error) {
    console.error('Error sharing location:', error);
    res.status(500).json({ error: 'Failed to share location' });
  }
});

// Register push notification token
userRouter.post('/push-token', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const parse = pushTokenSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        issues: parse.error.issues 
      });
    }

    const { token, platform } = parse.data;
    const userId = req.user!.id;

    // Deactivate old tokens for this user and platform
    await NotificationTokenModel.updateMany(
      { userId, platform },
      { isActive: false }
    );

    // Create or update token
    const notificationToken = await NotificationTokenModel.findOneAndUpdate(
      { userId, token },
      { 
        userId, 
        token, 
        platform, 
        isActive: true, 
        lastUsed: new Date() 
      },
      { upsert: true, new: true }
    );

    res.json({ 
      success: true,
      message: 'Push token registered successfully',
      tokenId: notificationToken._id
    });
  } catch (error) {
    console.error('Error registering push token:', error);
    res.status(500).json({ error: 'Failed to register push token' });
  }
});

// Get user profile
userRouter.get('/profile', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    // Get emergency contacts count
    const contactsCount = await EmergencyContactModel.countDocuments({ 
      userId, 
      isActive: true 
    });

    // Get push tokens count
    const pushTokensCount = await NotificationTokenModel.countDocuments({ 
      userId, 
      isActive: true 
    });

    res.json({
      user: {
        id: req.user!.id,
        email: req.user!.email,
        role: req.user!.role,
      },
      stats: {
        emergencyContacts: contactsCount,
        pushTokens: pushTokensCount,
      }
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Delete push notification token
userRouter.delete('/push-token/:token', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const token = req.params.token;
    const userId = req.user!.id;

    const result = await NotificationTokenModel.findOneAndUpdate(
      { userId, token },
      { isActive: false },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({ error: 'Push token not found' });
    }

    res.json({ 
      success: true,
      message: 'Push token deactivated successfully' 
    });
  } catch (error) {
    console.error('Error deactivating push token:', error);
    res.status(500).json({ error: 'Failed to deactivate push token' });
  }
});