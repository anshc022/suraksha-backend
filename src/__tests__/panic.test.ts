// Set test environment FIRST before any imports
process.env.JWT_SECRET = 'test-secret-key-for-testing';
process.env.NODE_ENV = 'test';

import request from 'supertest';
import express from 'express';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { createPanicRouter, createPanicQueryRouter } from '../routes/panic';
import { PanicAlertModel } from '../models/PanicAlert';
import { IncidentModel } from '../models/Incident';
import { UserModel } from '../models/User';
import jwt from 'jsonwebtoken';

// Mock Socket.io
const mockIo = {
  emit: jest.fn(),
} as any;

describe('Panic Routes', () => {
  let app: express.Express;
  let authToken: string;
  let testUser: any;

  beforeEach(async () => {
    // Create test app
    app = express();
    app.use(express.json());
    
    // Create test user
    testUser = await UserModel.create({
      email: 'test@example.com',
      password: 'hashedpassword',
      name: 'Test User',
      role: 'tourist'
    });

    // Create auth token
    authToken = jwt.sign(
      { sub: testUser._id.toString(), email: testUser.email, role: testUser.role },
      'test-secret-key-for-testing',
      { expiresIn: '1h' }
    );

    // Setup routes
    app.use('/api/panic', createPanicRouter(mockIo));
    app.use('/api/panic-alerts', createPanicQueryRouter());

    // Clear mock calls
    jest.clearAllMocks();
  });

  describe('POST /api/panic', () => {
    it('should create panic alert with valid data', async () => {
      const panicData = {
        lat: 12.9716,
        lng: 77.5946,
        message: 'Emergency help needed'
      };

      const response = await request(app)
        .post('/api/panic')
        .set('Authorization', `Bearer ${authToken}`)
        .send(panicData)
        .expect(201);

      expect(response.body.status).toBe('ok');
      expect(response.body.alert.lat).toBe(panicData.lat);
      expect(response.body.alert.lng).toBe(panicData.lng);
      expect(response.body.alert.userId).toBe(testUser._id.toString());

      // Check database
      const alert = await PanicAlertModel.findOne({ userId: testUser._id });
      expect(alert).toBeTruthy();
      expect(alert?.lat).toBe(panicData.lat);
      expect(alert?.lng).toBe(panicData.lng);

      // Check incident created
      const incident = await IncidentModel.findOne({ type: 'panic', userId: testUser._id });
      expect(incident).toBeTruthy();
      expect(incident?.severity).toBe('critical');

      // Check socket emission
      expect(mockIo.emit).toHaveBeenCalledWith('panic_alert', expect.objectContaining({
        lat: panicData.lat,
        lng: panicData.lng,
        userId: testUser._id.toString()
      }));
    });

    it('should reject invalid latitude', async () => {
      const response = await request(app)
        .post('/api/panic')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ lat: 91, lng: 77.5946 })
        .expect(400);

      expect(response.body.error).toBe('Invalid input');
    });

    it('should reject invalid longitude', async () => {
      const response = await request(app)
        .post('/api/panic')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ lat: 12.9716, lng: 181 })
        .expect(400);

      expect(response.body.error).toBe('Invalid input');
    });

    it('should enforce rate limiting', async () => {
      const panicData = { lat: 12.9716, lng: 77.5946 };

      // First request should succeed
      await request(app)
        .post('/api/panic')
        .set('Authorization', `Bearer ${authToken}`)
        .send(panicData)
        .expect(201);

      // Second request within 1 minute should fail
      const response = await request(app)
        .post('/api/panic')
        .set('Authorization', `Bearer ${authToken}`)
        .send(panicData)
        .expect(429);

      expect(response.body.error).toContain('Rate limit exceeded');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/panic')
        .send({ lat: 12.9716, lng: 77.5946 })
        .expect(401);

      expect(response.body.error).toBe('Missing token');
    });

    it('should reject invalid auth token', async () => {
      const response = await request(app)
        .post('/api/panic')
        .set('Authorization', 'Bearer invalid-token')
        .send({ lat: 12.9716, lng: 77.5946 })
        .expect(401);

      expect(response.body.error).toBe('Invalid token');
    });

    it('should handle missing coordinates', async () => {
      const response = await request(app)
        .post('/api/panic')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.error).toBe('Invalid input');
    });

    it('should auto-generate timestamp if not provided', async () => {
      const panicData = { lat: 12.9716, lng: 77.5946 };

      const response = await request(app)
        .post('/api/panic')
        .set('Authorization', `Bearer ${authToken}`)
        .send(panicData)
        .expect(201);

      expect(response.body.alert.timestamp).toBeTruthy();
      expect(new Date(response.body.alert.timestamp)).toBeInstanceOf(Date);
    });

    it('should use provided timestamp', async () => {
      const timestamp = '2025-09-16T10:30:00.000Z';
      const panicData = { lat: 12.9716, lng: 77.5946, timestamp };

      const response = await request(app)
        .post('/api/panic')
        .set('Authorization', `Bearer ${authToken}`)
        .send(panicData)
        .expect(201);

      expect(response.body.alert.timestamp).toBe(timestamp);
    });
  });

  describe('GET /api/panic-alerts', () => {
    beforeEach(async () => {
      // Create some test alerts
      await PanicAlertModel.create({
        userId: testUser._id,
        lat: 12.9716,
        lng: 77.5946,
        timestamp: new Date().toISOString(),
        message: 'Test alert 1',
        location: { type: 'Point', coordinates: [77.5946, 12.9716] }
      });

      await PanicAlertModel.create({
        userId: testUser._id,
        lat: 13.0827,
        lng: 80.2707,
        timestamp: new Date().toISOString(),
        message: 'Test alert 2',
        location: { type: 'Point', coordinates: [80.2707, 13.0827] }
      });
    });

    it('should fetch recent alerts', async () => {
      const response = await request(app)
        .get('/api/panic-alerts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.alerts).toHaveLength(2);
      expect(response.body.alerts[0]).toHaveProperty('lat');
      expect(response.body.alerts[0]).toHaveProperty('lng');
      expect(response.body.alerts[0]).toHaveProperty('message');
    });

    it('should require authentication for fetching alerts', async () => {
      await request(app)
        .get('/api/panic-alerts')
        .expect(401);
    });
  });

  describe('GET /api/panic-alerts/near', () => {
    beforeEach(async () => {
      // Create alerts at different locations
      await PanicAlertModel.create({
        userId: testUser._id,
        lat: 12.9716, // Bangalore
        lng: 77.5946,
        timestamp: new Date().toISOString(),
        location: { type: 'Point', coordinates: [77.5946, 12.9716] }
      });

      await PanicAlertModel.create({
        userId: testUser._id,
        lat: 13.0827, // Chennai
        lng: 80.2707,
        timestamp: new Date().toISOString(),
        location: { type: 'Point', coordinates: [80.2707, 13.0827] }
      });
    });

    it('should find nearby alerts', async () => {
      const response = await request(app)
        .get('/api/panic-alerts/near')
        .query({ lat: 12.9716, lng: 77.5946, radiusMeters: 1000 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.alerts).toHaveLength(1);
      expect(response.body.alerts[0].lat).toBe(12.9716);
    });

    it('should require lat and lng parameters', async () => {
      const response = await request(app)
        .get('/api/panic-alerts/near')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error).toBe('lat & lng required');
    });

    it('should use default radius if not provided', async () => {
      await request(app)
        .get('/api/panic-alerts/near')
        .query({ lat: 12.9716, lng: 77.5946 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });
  });

  describe('POST /api/panic-alerts/:id/ack', () => {
    let alertId: string;
    let officerToken: string;

    beforeEach(async () => {
      // Create an alert to acknowledge
      const alert = await PanicAlertModel.create({
        userId: testUser._id,
        lat: 12.9716,
        lng: 77.5946,
        timestamp: new Date().toISOString(),
        location: { type: 'Point', coordinates: [77.5946, 12.9716] }
      });
      alertId = alert._id.toString();

      // Create officer user
      const officer = await UserModel.create({
        email: 'officer@example.com',
        password: 'hashedpassword',
        name: 'Officer Test',
        role: 'officer'
      });

      officerToken = jwt.sign(
        { sub: officer._id.toString(), email: officer.email, role: officer.role },
        'test-secret-key-for-testing',
        { expiresIn: '1h' }
      );
    });

    it('should allow officer to acknowledge alert', async () => {
      const response = await request(app)
        .post(`/api/panic-alerts/${alertId}/ack`)
        .set('Authorization', `Bearer ${officerToken}`)
        .expect(200);

      expect(response.body.alert.acknowledged).toBe(true);
      expect(response.body.alert.acknowledgedBy).toBeTruthy();
    });

    it('should reject non-officer user', async () => {
      await request(app)
        .post(`/api/panic-alerts/${alertId}/ack`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
    });

    it('should handle non-existent alert', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      await request(app)
        .post(`/api/panic-alerts/${fakeId}/ack`)
        .set('Authorization', `Bearer ${officerToken}`)
        .expect(404);
    });
  });
});