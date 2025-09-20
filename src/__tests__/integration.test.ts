import request from 'supertest';
import express from 'express';
import { createPanicRouter, createPanicQueryRouter } from '../routes/panic';
import { PanicAlertModel } from '../models/PanicAlert';
import { UserModel } from '../models/User';
import jwt from 'jsonwebtoken';

// Set test environment
process.env.JWT_SECRET = 'test-secret-key-for-testing';

const mockIo = { emit: jest.fn() } as any;

describe('Panic Alert System Integration', () => {
  let app: express.Express;
  let userToken: string;
  let officerToken: string;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/panic', createPanicRouter(mockIo));
    app.use('/api/panic-alerts', createPanicQueryRouter());

    // Create test users
    const user = await UserModel.create({
      email: 'tourist@example.com',
      password: 'hashedpassword',
      name: 'Tourist User',
      role: 'tourist'
    });

    const officer = await UserModel.create({
      email: 'officer@example.com',
      password: 'hashedpassword', 
      name: 'Security Officer',
      role: 'officer'
    });

    userToken = jwt.sign(
      { sub: user._id.toString(), email: user.email, role: user.role },
      'test-secret-key-for-testing',
      { expiresIn: '1h' }
    );

    officerToken = jwt.sign(
      { sub: officer._id.toString(), email: officer.email, role: officer.role },
      'test-secret-key-for-testing',
      { expiresIn: '1h' }
    );

    jest.clearAllMocks();
  });

  it('should handle complete panic alert flow', async () => {
    // 1. Tourist sends panic alert
    const panicResponse = await request(app)
      .post('/api/panic')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        lat: 12.9716,
        lng: 77.5946,
        message: 'Emergency! Need immediate help!'
      })
      .expect(201);

    expect(panicResponse.body.status).toBe('ok');
    expect(panicResponse.body.alert.lat).toBe(12.9716);
    expect(panicResponse.body.alert.lng).toBe(77.5946);

    // Verify real-time alert was sent
    expect(mockIo.emit).toHaveBeenCalledWith('panic_alert', expect.objectContaining({
      lat: 12.9716,
      lng: 77.5946
    }));

    // 2. Officer checks recent alerts
    const alertsResponse = await request(app)
      .get('/api/panic-alerts')
      .set('Authorization', `Bearer ${officerToken}`)
      .expect(200);

    expect(alertsResponse.body.alerts).toHaveLength(1);
    const alertId = alertsResponse.body.alerts[0]._id;

    // 3. Officer searches for nearby alerts
    const nearbyResponse = await request(app)
      .get('/api/panic-alerts/near')
      .query({ lat: 12.9716, lng: 77.5946, radiusMeters: 1000 })
      .set('Authorization', `Bearer ${officerToken}`)
      .expect(200);

    expect(nearbyResponse.body.alerts).toHaveLength(1);

    // 4. Officer acknowledges the alert
    const ackResponse = await request(app)
      .post(`/api/panic-alerts/${alertId}/ack`)
      .set('Authorization', `Bearer ${officerToken}`)
      .expect(200);

    expect(ackResponse.body.alert.acknowledged).toBe(true);

    // 5. Verify alert is updated in database
    const updatedAlert = await PanicAlertModel.findById(alertId);
    expect(updatedAlert?.acknowledged).toBe(true);
    expect(updatedAlert?.acknowledgedBy).toBeTruthy();
  });

  it('should prevent panic alert spam with rate limiting', async () => {
    const panicData = { lat: 12.9716, lng: 77.5946 };

    // First alert should succeed
    await request(app)
      .post('/api/panic')
      .set('Authorization', `Bearer ${userToken}`)
      .send(panicData)
      .expect(201);

    // Second alert within 1 minute should be rate limited
    await request(app)
      .post('/api/panic')
      .set('Authorization', `Bearer ${userToken}`)
      .send(panicData)
      .expect(429);
  });

  it('should validate location coordinates', async () => {
    // Invalid latitude
    await request(app)
      .post('/api/panic')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ lat: 100, lng: 77.5946 })
      .expect(400);

    // Invalid longitude  
    await request(app)
      .post('/api/panic')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ lat: 12.9716, lng: 200 })
      .expect(400);
  });

  it('should enforce role-based access for acknowledgment', async () => {
    // Create an alert
    const alert = await PanicAlertModel.create({
      userId: 'user123',
      lat: 12.9716,
      lng: 77.5946,
      location: { type: 'Point', coordinates: [77.5946, 12.9716] }
    });

    // Tourist should not be able to acknowledge
    await request(app)
      .post(`/api/panic-alerts/${alert._id}/ack`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);

    // Officer should be able to acknowledge
    await request(app)
      .post(`/api/panic-alerts/${alert._id}/ack`)
      .set('Authorization', `Bearer ${officerToken}`)
      .expect(200);
  });
});