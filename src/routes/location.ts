import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { UserLocationModel } from '../models/UserLocation';
import { IncidentModel } from '../models/Incident';
import { evaluateGeofences } from '../config/geofence';
import { GeofencingService } from '../services/geofencing';

export function createLocationRouter(geofencingService: GeofencingService) {
  const locationRouter = Router();

  // Get active user locations (for dashboard)
  locationRouter.get('/active', authMiddleware, async (req: AuthRequest, res) => {
    try {
      // Get locations from the last 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      const activeLocations = await UserLocationModel.find({
        updatedAt: { $gte: fiveMinutesAgo }
      })
      .populate('userId', 'email name')
      .sort({ updatedAt: -1 })
      .limit(100); // Limit to 100 most recent

      // Group by userId to get the most recent location per user
      const locationMap = new Map();
      activeLocations.forEach(loc => {
        const userId = loc.userId.toString();
        if (!locationMap.has(userId)) {
          locationMap.set(userId, {
            _id: loc._id,
            userId: userId,
            location: loc.location,
            speed: loc.speed,
            accuracy: loc.accuracy,
            timestamp: loc.updatedAt,
            user: loc.userId
          });
        }
      });

      const uniqueLocations = Array.from(locationMap.values());
      
      res.json(uniqueLocations);
    } catch (error) {
      console.error('Error fetching active locations:', error);
      res.status(500).json({ error: 'Failed to fetch active locations' });
    }
  });

  locationRouter.post('/', authMiddleware, async (req: AuthRequest, res) => {
    const { latitude, longitude, speed, accuracy } = req.body;
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({ error: 'latitude & longitude required' });
    }
    
    const userId = req.user!.id;
    const locationDoc = await UserLocationModel.create({
      userId,
      location: { type: 'Point', coordinates: [longitude, latitude] },
      speed, 
      accuracy
    });

    // Process location update with geofencing service
    await geofencingService.processLocationUpdate({
      userId,
      latitude,
      longitude,
      timestamp: new Date()
    });

    // Simple anomaly: speed > 120 km/h (converted from m/s if provided) or accuracy very low
    let anomaly: string | undefined;
    if (typeof speed === 'number' && speed > 33) { // ~120 km/h
      anomaly = 'unrealistic_speed';
    } else if (typeof accuracy === 'number' && accuracy > 100) {
      anomaly = 'low_gps_accuracy';
    }

    const geofenceHits = evaluateGeofences([longitude, latitude]);
    let incidentCreated;
    if (anomaly || geofenceHits.some(f => f.risk === 'high')) {
      const severity = anomaly ? 'high' : (geofenceHits.some(f=>f.risk==='high') ? 'medium' : 'low');
      incidentCreated = await IncidentModel.create({
        type: anomaly ? 'anomaly' : 'geofence',
        userId,
        severity,
        description: anomaly || `Entered ${geofenceHits.map(f=>f.name).join(', ')}`,
        location: { type: 'Point', coordinates: [longitude, latitude] }
      });
    }

    res.json({ saved: true, anomaly, geofences: geofenceHits, incident: incidentCreated });
  });

  return locationRouter;
}
