import { PanicAlertModel } from '../models/PanicAlert';
import { IncidentModel } from '../models/Incident';
import { UserModel } from '../models/User';

describe('Model Tests', () => {
  let testUser: any;

  beforeEach(async () => {
    testUser = await UserModel.create({
      email: 'test@example.com',
      password: 'hashedpassword',
      name: 'Test User',
      role: 'tourist'
    });
  });

  describe('PanicAlert Model', () => {
    it('should create panic alert with valid data', async () => {
      const alertData = {
        userId: testUser._id,
        lat: 12.9716,
        lng: 77.5946,
        timestamp: new Date().toISOString(),
        message: 'Emergency help needed',
        location: { type: 'Point', coordinates: [77.5946, 12.9716] }
      };

      const alert = await PanicAlertModel.create(alertData);
      
      expect(alert).toBeTruthy();
      expect(alert.userId.toString()).toBe(testUser._id.toString());
      expect(alert.lat).toBe(alertData.lat);
      expect(alert.lng).toBe(alertData.lng);
      expect((alert as any).message).toBe(alertData.message);
      expect(alert.acknowledged).toBe(false);
      expect(alert.location?.type).toBe('Point');
      expect(alert.location?.coordinates).toEqual([77.5946, 12.9716]);
    });

    it('should require userId', async () => {
      const alertData = {
        lat: 12.9716,
        lng: 77.5946,
        timestamp: new Date().toISOString(),
        location: { type: 'Point', coordinates: [77.5946, 12.9716] }
      };

      await expect(PanicAlertModel.create(alertData)).rejects.toThrow();
    });

    it('should require lat and lng', async () => {
      const alertData = {
        userId: testUser._id,
        timestamp: new Date().toISOString(),
        location: { type: 'Point', coordinates: [77.5946, 12.9716] }
      };

      await expect(PanicAlertModel.create(alertData)).rejects.toThrow();
    });

    it('should validate latitude range', async () => {
      const alertData = {
        userId: testUser._id,
        lat: 91, // Invalid latitude
        lng: 77.5946,
        timestamp: new Date().toISOString(),
        location: { type: 'Point', coordinates: [77.5946, 91] }
      };

      await expect(PanicAlertModel.create(alertData)).rejects.toThrow();
    });

    it('should validate longitude range', async () => {
      const alertData = {
        userId: testUser._id,
        lat: 12.9716,
        lng: 181, // Invalid longitude
        timestamp: new Date().toISOString(),
        location: { type: 'Point', coordinates: [181, 12.9716] }
      };

      await expect(PanicAlertModel.create(alertData)).rejects.toThrow();
    });

    it('should set default values', async () => {
      const alertData = {
        userId: testUser._id,
        lat: 12.9716,
        lng: 77.5946,
        location: { type: 'Point', coordinates: [77.5946, 12.9716] }
      };

      const alert = await PanicAlertModel.create(alertData);
      
      expect(alert.acknowledged).toBe(false);
      expect((alert as any).createdAt).toBeInstanceOf(Date);
      expect((alert as any).updatedAt).toBeInstanceOf(Date);
    });

    it('should allow acknowledgment', async () => {
      const alert = await PanicAlertModel.create({
        userId: testUser._id,
        lat: 12.9716,
        lng: 77.5946,
        location: { type: 'Point', coordinates: [77.5946, 12.9716] }
      });

      const updated = await PanicAlertModel.findByIdAndUpdate(
        alert._id,
        { acknowledged: true, acknowledgedBy: testUser._id },
        { new: true }
      );

      expect(updated?.acknowledged).toBe(true);
      expect(updated?.acknowledgedBy?.toString()).toBe(testUser._id.toString());
    });
  });

  describe('Incident Model', () => {
    let panicAlert: any;

    beforeEach(async () => {
      panicAlert = await PanicAlertModel.create({
        userId: testUser._id,
        lat: 12.9716,
        lng: 77.5946,
        location: { type: 'Point', coordinates: [77.5946, 12.9716] }
      });
    });

    it('should create incident with valid data', async () => {
      const incidentData = {
        type: 'panic',
        userId: testUser._id,
        alertId: panicAlert._id,
        severity: 'critical',
        description: 'Emergency panic alert triggered',
        location: { type: 'Point', coordinates: [77.5946, 12.9716] }
      };

      const incident = await IncidentModel.create(incidentData);
      
      expect(incident).toBeTruthy();
      expect(incident.type).toBe('panic');
      expect(incident.severity).toBe('critical');
      expect(incident.userId.toString()).toBe(testUser._id.toString());
      expect(incident.alertId?.toString()).toBe(panicAlert._id.toString());
      expect(incident.description).toBe(incidentData.description);
    });

    it('should require type and severity', async () => {
      const incidentData = {
        userId: testUser._id,
        description: 'Test incident'
      };

      await expect(IncidentModel.create(incidentData)).rejects.toThrow();
    });

    it('should validate severity enum', async () => {
      const incidentData = {
        type: 'panic',
        userId: testUser._id,
        severity: 'invalid', // Invalid severity
        description: 'Test incident'
      };

      await expect(IncidentModel.create(incidentData)).rejects.toThrow();
    });

    it('should allow valid severities', async () => {
      const severities = ['low', 'medium', 'high', 'critical'];
      
      for (const severity of severities) {
        const incident = await IncidentModel.create({
          type: 'panic',
          userId: testUser._id,
          severity,
          description: `Test ${severity} incident`
        });
        
        expect(incident.severity).toBe(severity);
      }
    });

    it('should set default timestamps', async () => {
      const incident = await IncidentModel.create({
        type: 'panic',
        userId: testUser._id,
        severity: 'high',
        description: 'Test incident'
      });

      expect((incident as any).createdAt).toBeInstanceOf(Date);
      expect((incident as any).updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Geospatial Queries', () => {
    beforeEach(async () => {
      // Create alerts at different locations
      await PanicAlertModel.create({
        userId: testUser._id,
        lat: 12.9716, // Bangalore
        lng: 77.5946,
        location: { type: 'Point', coordinates: [77.5946, 12.9716] }
      });

      await PanicAlertModel.create({
        userId: testUser._id,
        lat: 13.0827, // Chennai (far away)
        lng: 80.2707,
        location: { type: 'Point', coordinates: [80.2707, 13.0827] }
      });

      await PanicAlertModel.create({
        userId: testUser._id,
        lat: 12.9800, // Close to Bangalore
        lng: 77.6000,
        location: { type: 'Point', coordinates: [77.6000, 12.9800] }
      });
    });

    it('should find nearby alerts using geospatial query', async () => {
      const bangaloreCenter = [77.5946, 12.9716];
      const radiusInKm = 10;
      const radiusInRadians = radiusInKm / 6378.1; // Earth radius in km

      const nearbyAlerts = await PanicAlertModel.find({
        location: {
          $geoWithin: {
            $centerSphere: [bangaloreCenter, radiusInRadians]
          }
        }
      });

      expect(nearbyAlerts).toHaveLength(2); // Should find 2 alerts in Bangalore area
    });

    it('should not find distant alerts', async () => {
      const chennaiCenter = [80.2707, 13.0827];
      const smallRadius = 5 / 6378.1; // 5km radius

      const nearbyAlerts = await PanicAlertModel.find({
        location: {
          $geoWithin: {
            $centerSphere: [chennaiCenter, smallRadius]
          }
        }
      });

      expect(nearbyAlerts).toHaveLength(1); // Should only find Chennai alert
    });
  });
});