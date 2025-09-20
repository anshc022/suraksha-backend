import { Router, Response } from 'express';
import { SafeZoneModel, SafeZone } from '../models/SafeZone';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/authorize';
import { Server } from 'socket.io';

export function createSafeZoneRouter(io: Server) {
  const router = Router();

  // Get all safe zones
  router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const safeZones = await SafeZoneModel.find({ isActive: true }).sort({ createdAt: -1 });
      res.json({ safeZones });
    } catch (error) {
      console.error('Error fetching safe zones:', error);
      res.status(500).json({ error: 'Failed to fetch safe zones' });
    }
  });

  // Get safe zones near a location
  router.get('/near', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { lat, lng, radius = 10000 } = req.query;
      
      if (!lat || !lng) {
        return res.status(400).json({ error: 'Latitude and longitude are required' });
      }

      const safeZones = await SafeZoneModel.find({
        isActive: true,
        center: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [parseFloat(lng as string), parseFloat(lat as string)]
            },
            $maxDistance: parseInt(radius as string)
          }
        }
      });

      res.json({ safeZones });
    } catch (error) {
      console.error('Error fetching nearby safe zones:', error);
      res.status(500).json({ error: 'Failed to fetch nearby safe zones' });
    }
  });

  // Create a new safe zone (admin only)
  router.post('/', authMiddleware, requireRole('admin'), async (req: AuthRequest, res: Response) => {
    try {
      const { name, description, center, radius, alertThreshold, polygon, emergencyContacts } = req.body;

      if (!name || !center || !radius) {
        return res.status(400).json({ error: 'Name, center, and radius are required' });
      }

      const safeZone = new SafeZoneModel({
        name,
        description,
        center,
        radius,
        alertThreshold: alertThreshold || 30,
        polygon,
        emergencyContacts,
        createdBy: req.user!.id
      });

      await safeZone.save();

      // Broadcast new safe zone to all connected clients
      io.emit('safe-zone-created', safeZone);

      res.status(201).json({ safeZone });
    } catch (error) {
      console.error('Error creating safe zone:', error);
      res.status(500).json({ error: 'Failed to create safe zone' });
    }
  });

  // Update safe zone (admin only)
  router.put('/:id', authMiddleware, requireRole('admin'), async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const safeZone = await SafeZoneModel.findByIdAndUpdate(
        id,
        updates,
        { new: true, runValidators: true }
      );

      if (!safeZone) {
        return res.status(404).json({ error: 'Safe zone not found' });
      }

      // Broadcast update to all connected clients
      io.emit('safe-zone-updated', safeZone);

      res.json({ safeZone });
    } catch (error) {
      console.error('Error updating safe zone:', error);
      res.status(500).json({ error: 'Failed to update safe zone' });
    }
  });

  // Delete safe zone (admin only)
  router.delete('/:id', authMiddleware, requireRole('admin'), async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const safeZone = await SafeZoneModel.findByIdAndUpdate(
        id,
        { isActive: false },
        { new: true }
      );

      if (!safeZone) {
        return res.status(404).json({ error: 'Safe zone not found' });
      }

      // Broadcast deletion to all connected clients
      io.emit('safe-zone-deleted', { id });

      res.json({ message: 'Safe zone deleted successfully' });
    } catch (error) {
      console.error('Error deleting safe zone:', error);
      res.status(500).json({ error: 'Failed to delete safe zone' });
    }
  });

  // Check if user is within safe zones
  router.post('/check', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { lat, lng } = req.body;

      if (!lat || !lng) {
        return res.status(400).json({ error: 'Latitude and longitude are required' });
      }

      const safeZones = await SafeZoneModel.find({ isActive: true });
      const withinZones: SafeZone[] = [];

      for (const zone of safeZones) {
        const distance = calculateDistance(lat, lng, zone.center.lat, zone.center.lng);
        if (distance <= zone.radius) {
          withinZones.push(zone);
        }
      }

      res.json({ 
        withinSafeZone: withinZones.length > 0,
        safeZones: withinZones,
        location: { lat, lng }
      });
    } catch (error) {
      console.error('Error checking safe zones:', error);
      res.status(500).json({ error: 'Failed to check safe zones' });
    }
  });

  return router;
}

// Helper function to calculate distance between two points
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
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