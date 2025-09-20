import express from 'express';
import { EmergencyService } from '../models/EmergencyService';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/authorize';

const router = express.Router();

// Get all emergency services
router.get('/', async (req, res) => {
  try {
    const { city, state, serviceType, active } = req.query;
    
    // Build filter object
    const filter: any = {};
    if (city) filter.city = new RegExp(city as string, 'i');
    if (state) filter.state = new RegExp(state as string, 'i');
    if (serviceType) filter.serviceType = serviceType;
    if (active !== undefined) filter.isActive = active === 'true';

    const services = await EmergencyService.find(filter)
      .sort({ serviceType: 1, name: 1 })
      .select('-__v');

    // Transform _id to id for frontend consistency
    const transformedServices = services.map(service => ({
      id: service._id,
      name: service.name,
      phoneNumber: service.phoneNumber,
      serviceType: service.serviceType,
      address: service.address,
      city: service.city,
      state: service.state,
      isActive: service.isActive,
      availableHours: service.availableHours,
      description: service.description,
      coordinates: service.coordinates,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt
    }));

    res.json({
      success: true,
      message: 'Emergency services retrieved successfully',
      data: {
        services: transformedServices
      }
    });
  } catch (error) {
    console.error('Error fetching emergency services:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch emergency services'
    });
  }
});

// Get emergency service by ID
router.get('/:id', async (req, res) => {
  try {
    const service = await EmergencyService.findById(req.params.id).select('-__v');
    
    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Emergency service not found'
      });
    }

    // Transform for frontend
    const transformedService = {
      id: service._id,
      name: service.name,
      phoneNumber: service.phoneNumber,
      serviceType: service.serviceType,
      address: service.address,
      city: service.city,
      state: service.state,
      isActive: service.isActive,
      availableHours: service.availableHours,
      description: service.description,
      coordinates: service.coordinates,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt
    };

    res.json({
      success: true,
      message: 'Emergency service retrieved successfully',
      data: {
        service: transformedService
      }
    });
  } catch (error) {
    console.error('Error fetching emergency service:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch emergency service'
    });
  }
});

// Create new emergency service (admin only)
router.post('/', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const {
      name,
      phoneNumber,
      serviceType,
      address,
      city,
      state,
      availableHours,
      description,
      coordinates
    } = req.body;

    // Validate required fields
    if (!name || !phoneNumber || !serviceType || !address || !city || !state) {
      return res.status(400).json({
        success: false,
        error: 'Name, phone number, service type, address, city, and state are required'
      });
    }

    const service = new EmergencyService({
      name,
      phoneNumber,
      serviceType,
      address,
      city,
      state,
      availableHours: availableHours || '24/7',
      description,
      coordinates
    });

    await service.save();

    // Transform for frontend
    const transformedService = {
      id: service._id,
      name: service.name,
      phoneNumber: service.phoneNumber,
      serviceType: service.serviceType,
      address: service.address,
      city: service.city,
      state: service.state,
      isActive: service.isActive,
      availableHours: service.availableHours,
      description: service.description,
      coordinates: service.coordinates,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt
    };

    res.status(201).json({
      success: true,
      message: 'Emergency service created successfully',
      data: {
        service: transformedService
      }
    });
  } catch (error) {
    console.error('Error creating emergency service:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create emergency service'
    });
  }
});

// Update emergency service (admin only)
router.put('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const {
      name,
      phoneNumber,
      serviceType,
      address,
      city,
      state,
      isActive,
      availableHours,
      description,
      coordinates
    } = req.body;

    const service = await EmergencyService.findByIdAndUpdate(
      req.params.id,
      {
        ...(name && { name }),
        ...(phoneNumber && { phoneNumber }),
        ...(serviceType && { serviceType }),
        ...(address && { address }),
        ...(city && { city }),
        ...(state && { state }),
        ...(isActive !== undefined && { isActive }),
        ...(availableHours && { availableHours }),
        ...(description !== undefined && { description }),
        ...(coordinates && { coordinates })
      },
      { new: true, runValidators: true }
    ).select('-__v');

    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Emergency service not found'
      });
    }

    // Transform for frontend
    const transformedService = {
      id: service._id,
      name: service.name,
      phoneNumber: service.phoneNumber,
      serviceType: service.serviceType,
      address: service.address,
      city: service.city,
      state: service.state,
      isActive: service.isActive,
      availableHours: service.availableHours,
      description: service.description,
      coordinates: service.coordinates,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt
    };

    res.json({
      success: true,
      message: 'Emergency service updated successfully',
      data: {
        service: transformedService
      }
    });
  } catch (error) {
    console.error('Error updating emergency service:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update emergency service'
    });
  }
});

// Delete emergency service (admin only)
router.delete('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const service = await EmergencyService.findByIdAndDelete(req.params.id);

    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Emergency service not found'
      });
    }

    res.json({
      success: true,
      message: 'Emergency service deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting emergency service:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete emergency service'
    });
  }
});

// Get nearby emergency services (based on coordinates)
router.get('/nearby/:latitude/:longitude', async (req, res) => {
  try {
    const { latitude, longitude } = req.params;
    const { serviceType, maxDistance = 50000 } = req.query; // Default 50km radius

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid coordinates'
      });
    }

    const filter: any = {
      isActive: true,
      coordinates: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          $maxDistance: parseInt(maxDistance as string)
        }
      }
    };

    if (serviceType) {
      filter.serviceType = serviceType;
    }

    const services = await EmergencyService.find(filter)
      .limit(20)
      .select('-__v');

    // Transform for frontend
    const transformedServices = services.map(service => ({
      id: service._id,
      name: service.name,
      phoneNumber: service.phoneNumber,
      serviceType: service.serviceType,
      address: service.address,
      city: service.city,
      state: service.state,
      isActive: service.isActive,
      availableHours: service.availableHours,
      description: service.description,
      coordinates: service.coordinates,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt
    }));

    res.json({
      success: true,
      message: 'Nearby emergency services retrieved successfully',
      data: {
        services: transformedServices,
        location: { latitude: lat, longitude: lng },
        radius: maxDistance
      }
    });
  } catch (error) {
    console.error('Error fetching nearby emergency services:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch nearby emergency services'
    });
  }
});

export default router;