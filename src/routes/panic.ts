import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { EmergencyContactModel } from '../models/EmergencyContact';
import NotificationService from '../services/notificationService';
// Local minimal role guard to avoid import resolution issue
function requireRole(...roles: string[]) {
  return (req: any, res: any, next: any) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}
import type { Server } from 'socket.io';
import { PanicAlertPayload } from '../types';
import { PanicAlertModel } from '../models/PanicAlert';
import { IncidentModel } from '../models/Incident';
import { testPanicSystem } from '../utils/panicTest';

export function createPanicRouter(io: Server) {
  const router = Router();

  const panicSchema = z.object({
    lat: z.number().min(-90).max(90, 'Latitude must be between -90 and 90'),
    lng: z.number().min(-180).max(180, 'Longitude must be between -180 and 180'),
    timestamp: z.string().optional(),
    message: z.string().optional().default('Emergency panic alert triggered')
  });

  // POST /api/panic - Send panic alert
  router.post('/', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const parse = panicSchema.safeParse(req.body);
      if (!parse.success) return res.status(400).json({ error: 'Invalid input', issues: parse.error.issues });
      
      const { lat, lng, message } = parse.data;
      
      // Check for recent panic alerts from the same user (rate limiting)
      const recentAlert = await PanicAlertModel.findOne({
        userId: req.user!.id,
        createdAt: { $gte: new Date(Date.now() - 60000) } // Within last minute
      });
      
      if (recentAlert) {
        return res.status(429).json({ 
          error: 'Rate limit exceeded. Please wait before sending another panic alert.' 
        });
      }
      
      const payload: PanicAlertPayload = {
        lat,
        lng,
        timestamp: parse.data.timestamp || new Date().toISOString(),
        userId: req.user!.id
      };
      
      // Persist to Mongo
      const alertDoc = await PanicAlertModel.create({
        userId: payload.userId,
        lat: payload.lat,
        lng: payload.lng,
        timestamp: payload.timestamp,
        message: message || 'Emergency panic alert triggered',
        location: { type: 'Point', coordinates: [payload.lng, payload.lat] }
      });
      
      // Emit real-time alert
      io.emit('panic_alert', payload);
      
      // Notify emergency contacts
      const emergencyContacts = await EmergencyContactModel.find({ 
        userId: req.user!.id, 
        isActive: true 
      });
      
      if (emergencyContacts.length > 0) {
        // Here you would integrate with SMS/Email service
        console.log(`Panic alert sent to ${emergencyContacts.length} emergency contacts:`, 
          emergencyContacts.map(c => ({ name: c.name, phone: c.phone })));
        
        // You could also emit a specific event for emergency contacts
        io.emit('emergency_alert', {
          userId: req.user!.id,
          location: { lat: payload.lat, lng: payload.lng },
          message: message || 'Emergency panic alert triggered',
          contactsNotified: emergencyContacts.length,
          timestamp: payload.timestamp
        });
      }

      // Send push notification to user
      await NotificationService.sendEmergencyAlert(
        req.user!.id, 
        'panic', 
        { lat: payload.lat, lng: payload.lng }
      );
      
      // Create incident record
      const incident = await IncidentModel.create({
        type: 'panic',
        userId: req.user!.id,
        alertId: alertDoc.id,
        severity: 'critical',
        description: message || 'Emergency panic alert triggered',
        location: { type: 'Point', coordinates: [payload.lng, payload.lat] }
      });
      
      // Emit incident update
      io.emit('incident', incident);
      
      res.status(201).json({ status: 'ok', alert: payload, incident });
      
    } catch (error) {
      console.error('Error creating panic alert:', error);
      res.status(500).json({ error: 'Failed to create panic alert' });
    }
  });
  
  // GET /api/panic/test - Test panic system
  router.get('/test', testPanicSystem);

  return router;
}

export function createPanicQueryRouter() {
  const router = Router();
  
  // GET /api/panic-alerts - Get recent alerts
  router.get('/', authMiddleware, async (_req: AuthRequest, res) => {
    try {
      const recent = await PanicAlertModel.find({}).sort({ createdAt: -1 }).limit(50).lean();
      res.json({ alerts: recent });
    } catch (error) {
      console.error('Error fetching panic alerts:', error);
      res.status(500).json({ error: 'Failed to fetch alerts' });
    }
  });
  
  // GET /api/panic-alerts/near - Get nearby alerts
  router.get('/near', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { lat, lng, radiusMeters = 1000 } = req.query as any;
      if (!lat || !lng) return res.status(400).json({ error: 'lat & lng required' });
      
      const radius = Number(radiusMeters) / 6378137; // radians earth radius
      const docs = await PanicAlertModel.find({
        location: { $geoWithin: { $centerSphere: [[Number(lng), Number(lat)], radius] } }
      }).limit(100).lean();
      
      res.json({ alerts: docs });
    } catch (error) {
      console.error('Error fetching nearby alerts:', error);
      res.status(500).json({ error: 'Failed to fetch nearby alerts' });
    }
  });
  
  // POST /api/panic-alerts/:id/ack - Acknowledge alert
  router.post('/:id/ack', authMiddleware, requireRole('officer','admin'), async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const updated = await PanicAlertModel.findByIdAndUpdate(
        id, 
        { acknowledged: true, acknowledgedBy: req.user!.id }, 
        { new: true }
      );
      
      if (!updated) return res.status(404).json({ error: 'Alert not found' });
      
      res.json({ alert: updated });
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      res.status(500).json({ error: 'Failed to acknowledge alert' });
    }
  });
  
  return router;
}
