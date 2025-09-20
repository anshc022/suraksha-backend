import request from 'supertest';
import { createApp, attachRealtime } from '../app';
import { connectDB } from '../config/db';
import { UserModel } from '../models/User';
import { EmergencyContactModel } from '../models/EmergencyContact';
import { NotificationTokenModel } from '../models/NotificationToken';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

describe('Emergency Contacts API', () => {
  let app: any;
  let server: any;
  let testUser: any;
  let authToken: string;

  beforeAll(async () => {
    await connectDB();
    app = createApp();
    const result = attachRealtime(app);
    server = result.server;
  });

  afterAll(async () => {
    await mongoose.connection.close();
    if (server) {
      server.close();
    }
  });

  beforeEach(async () => {
    // Clean up existing data
    await UserModel.deleteMany({});
    await EmergencyContactModel.deleteMany({});
    await NotificationTokenModel.deleteMany({});

    // Create test user
    testUser = await UserModel.create({
      email: 'test@example.com',
      passwordHash: 'hashedpassword',
      name: 'Test User',
      role: 'tourist',
      did: 'did:test:123'
    });

    // Generate auth token
    authToken = jwt.sign(
      { sub: testUser._id.toString(), email: testUser.email, role: testUser.role },
      process.env.JWT_SECRET || 'test-secret'
    );
  });

  describe('POST /api/emergency-contacts', () => {
    it('should create a new emergency contact', async () => {
      const contactData = {
        name: 'John Doe',
        phone: '+1234567890',
        email: 'john@example.com',
        relationship: 'Father',
        isPrimary: true,
        isActive: true
      };

      const response = await request(app)
        .post('/api/emergency-contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(contactData)
        .expect(201);

      expect(response.body.contact).toMatchObject({
        name: contactData.name,
        phone: contactData.phone,
        email: contactData.email,
        relationship: contactData.relationship,
        isPrimary: contactData.isPrimary,
        isActive: contactData.isActive
      });

      // Verify in database
      const contact = await EmergencyContactModel.findById(response.body.contact._id);
      expect(contact).toBeTruthy();
      expect(contact!.userId.toString()).toBe(testUser._id.toString());
    });

    it('should enforce contact limit', async () => {
      // Create 10 contacts (max limit)
      for (let i = 0; i < 10; i++) {
        await EmergencyContactModel.create({
          userId: testUser._id,
          name: `Contact ${i}`,
          phone: `+123456789${i}`,
          relationship: 'Friend',
          isPrimary: false,
          isActive: true
        });
      }

      const contactData = {
        name: 'Extra Contact',
        phone: '+1234567890',
        relationship: 'Friend'
      };

      const response = await request(app)
        .post('/api/emergency-contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(contactData)
        .expect(400);

      expect(response.body.error).toContain('Maximum emergency contacts limit');
    });

    it('should handle primary contact logic', async () => {
      // Create first primary contact
      const contact1Data = {
        name: 'Primary Contact 1',
        phone: '+1111111111',
        relationship: 'Mother',
        isPrimary: true
      };

      await request(app)
        .post('/api/emergency-contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(contact1Data)
        .expect(201);

      // Create second primary contact (should unset first)
      const contact2Data = {
        name: 'Primary Contact 2',
        phone: '+2222222222',
        relationship: 'Father',
        isPrimary: true
      };

      await request(app)
        .post('/api/emergency-contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(contact2Data)
        .expect(201);

      // Check that only one primary contact exists
      const primaryContacts = await EmergencyContactModel.find({
        userId: testUser._id,
        isPrimary: true
      });

      expect(primaryContacts).toHaveLength(1);
      expect(primaryContacts[0].name).toBe('Primary Contact 2');
    });
  });

  describe('GET /api/emergency-contacts', () => {
    beforeEach(async () => {
      // Create test contacts
      await EmergencyContactModel.create([
        {
          userId: testUser._id,
          name: 'Primary Contact',
          phone: '+1111111111',
          relationship: 'Mother',
          isPrimary: true,
          isActive: true
        },
        {
          userId: testUser._id,
          name: 'Secondary Contact',
          phone: '+2222222222',
          relationship: 'Father',
          isPrimary: false,
          isActive: true
        },
        {
          userId: testUser._id,
          name: 'Inactive Contact',
          phone: '+3333333333',
          relationship: 'Friend',
          isPrimary: false,
          isActive: false
        }
      ]);
    });

    it('should get all emergency contacts for user', async () => {
      const response = await request(app)
        .get('/api/emergency-contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.contacts).toHaveLength(3);
      
      // Should be sorted with primary first
      expect(response.body.contacts[0].isPrimary).toBe(true);
      expect(response.body.contacts[0].name).toBe('Primary Contact');
    });
  });

  describe('PUT /api/emergency-contacts/:id', () => {
    let contactId: string;

    beforeEach(async () => {
      const contact = await EmergencyContactModel.create({
        userId: testUser._id,
        name: 'Test Contact',
        phone: '+1234567890',
        relationship: 'Friend',
        isPrimary: false,
        isActive: true
      });
      contactId = contact._id.toString();
    });

    it('should update emergency contact', async () => {
      const updateData = {
        name: 'Updated Contact',
        isPrimary: true
      };

      const response = await request(app)
        .put(`/api/emergency-contacts/${contactId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.contact.name).toBe('Updated Contact');
      expect(response.body.contact.isPrimary).toBe(true);
    });

    it('should return 404 for non-existent contact', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      
      await request(app)
        .put(`/api/emergency-contacts/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated' })
        .expect(404);
    });
  });

  describe('DELETE /api/emergency-contacts/:id', () => {
    let contactId: string;

    beforeEach(async () => {
      const contact = await EmergencyContactModel.create({
        userId: testUser._id,
        name: 'Test Contact',
        phone: '+1234567890',
        relationship: 'Friend',
        isPrimary: false,
        isActive: true
      });
      contactId = contact._id.toString();
    });

    it('should delete emergency contact', async () => {
      await request(app)
        .delete(`/api/emergency-contacts/${contactId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify deletion
      const contact = await EmergencyContactModel.findById(contactId);
      expect(contact).toBeNull();
    });
  });

  describe('POST /api/emergency-contacts/:id/test', () => {
    let contactId: string;

    beforeEach(async () => {
      const contact = await EmergencyContactModel.create({
        userId: testUser._id,
        name: 'Test Contact',
        phone: '+1234567890',
        email: 'test@example.com',
        relationship: 'Friend',
        isPrimary: false,
        isActive: true
      });
      contactId = contact._id.toString();
    });

    it('should send test notification', async () => {
      const response = await request(app)
        .post(`/api/emergency-contacts/${contactId}/test`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toContain('Test notification sent successfully');
      expect(response.body.contact.name).toBe('Test Contact');
      expect(response.body.contact.phone).toBe('+1234567890');
    });
  });
});