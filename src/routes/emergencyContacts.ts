import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { EmergencyContactModel } from '../models/EmergencyContact';
import { Types } from 'mongoose';

export const emergencyContactsRouter = Router();

const contactSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().min(10).max(15),
  email: z.string().email().optional(),
  relationship: z.string().min(1).max(50),
  isPrimary: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

const updateContactSchema = contactSchema.partial();

// Helper function to transform MongoDB document to API format
const transformContact = (contact: any) => {
  if (!contact) return null;
  const obj = contact.toObject ? contact.toObject() : contact;
  return {
    id: obj._id.toString(),
    name: obj.name,
    phone: obj.phone,
    email: obj.email,
    relationship: obj.relationship,
    isPrimary: obj.isPrimary,
    isActive: obj.isActive,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt
  };
};

// Get all emergency contacts for user
emergencyContactsRouter.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const contacts = await EmergencyContactModel.find({ 
      userId: req.user!.id 
    }).sort({ isPrimary: -1, createdAt: -1 });

    const transformedContacts = contacts.map(transformContact);
    res.json({ contacts: transformedContacts });
  } catch (error) {
    console.error('Error fetching emergency contacts:', error);
    res.status(500).json({ error: 'Failed to fetch emergency contacts' });
  }
});

// Add new emergency contact
emergencyContactsRouter.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const parse = contactSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        issues: parse.error.issues 
      });
    }

    const { name, phone, email, relationship, isPrimary, isActive } = parse.data;
    const userId = req.user!.id;

    // Check contact limit (max 10 contacts)
    const contactCount = await EmergencyContactModel.countDocuments({ userId });
    if (contactCount >= 10) {
      return res.status(400).json({ 
        error: 'Maximum emergency contacts limit (10) reached' 
      });
    }

    // If setting as primary, unset other primary contacts
    if (isPrimary) {
      await EmergencyContactModel.updateMany(
        { userId, isPrimary: true },
        { isPrimary: false }
      );
    }

    const contact = await EmergencyContactModel.create({
      userId,
      name,
      phone,
      email,
      relationship,
      isPrimary,
      isActive,
    });

    res.status(201).json({ contact: transformContact(contact) });
  } catch (error: any) {
    console.error('Error creating emergency contact:', error);
    if (error.code === 11000) {
      return res.status(400).json({ 
        error: 'Duplicate contact entry' 
      });
    }
    res.status(500).json({ error: 'Failed to create emergency contact' });
  }
});

// Update emergency contact
emergencyContactsRouter.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const contactId = req.params.id;
    if (!Types.ObjectId.isValid(contactId)) {
      return res.status(400).json({ error: 'Invalid contact ID' });
    }

    const parse = updateContactSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        issues: parse.error.issues 
      });
    }

    const userId = req.user!.id;
    const updates = parse.data;

    // If setting as primary, unset other primary contacts
    if (updates.isPrimary) {
      await EmergencyContactModel.updateMany(
        { userId, isPrimary: true, _id: { $ne: contactId } },
        { isPrimary: false }
      );
    }

    const contact = await EmergencyContactModel.findOneAndUpdate(
      { _id: contactId, userId },
      updates,
      { new: true }
    );

    if (!contact) {
      return res.status(404).json({ error: 'Emergency contact not found' });
    }

    res.json({ contact: transformContact(contact) });
  } catch (error) {
    console.error('Error updating emergency contact:', error);
    res.status(500).json({ error: 'Failed to update emergency contact' });
  }
});

// Delete emergency contact
emergencyContactsRouter.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const contactId = req.params.id;
    if (!Types.ObjectId.isValid(contactId)) {
      return res.status(400).json({ error: 'Invalid contact ID' });
    }

    const userId = req.user!.id;

    const contact = await EmergencyContactModel.findOneAndDelete({
      _id: contactId,
      userId
    });

    if (!contact) {
      return res.status(404).json({ error: 'Emergency contact not found' });
    }

    res.json({ message: 'Emergency contact deleted successfully' });
  } catch (error) {
    console.error('Error deleting emergency contact:', error);
    res.status(500).json({ error: 'Failed to delete emergency contact' });
  }
});

// Send test notification to contact
emergencyContactsRouter.post('/:id/test', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const contactId = req.params.id;
    if (!Types.ObjectId.isValid(contactId)) {
      return res.status(400).json({ error: 'Invalid contact ID' });
    }

    const userId = req.user!.id;

    const contact = await EmergencyContactModel.findOne({
      _id: contactId,
      userId
    });

    if (!contact) {
      return res.status(404).json({ error: 'Emergency contact not found' });
    }

    // Here you would integrate with SMS/Email service
    // For now, we'll just simulate success
    console.log(`Test notification sent to ${contact.name} (${contact.phone})`);

    res.json({ 
      message: 'Test notification sent successfully',
      contact: {
        name: contact.name,
        phone: contact.phone,
        email: contact.email
      }
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});