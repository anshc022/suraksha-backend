import { EmergencyService } from '../models/EmergencyService';
import { connectDB } from '../config/db';

const emergencyServicesData = [
  {
    name: 'Bhubaneswar Police Station',
    phoneNumber: '100',
    serviceType: 'police',
    address: 'Unit-I, Bhubaneswar, Khurda, Odisha',
    city: 'Bhubaneswar',
    state: 'Odisha',
    isActive: true,
    availableHours: '24/7',
    description: 'Main police station for emergency assistance in Bhubaneswar',
    coordinates: {
      latitude: 20.2961,
      longitude: 85.8245
    }
  },
  {
    name: 'All India Institute of Medical Sciences Bhubaneswar',
    phoneNumber: '108',
    serviceType: 'hospital',
    address: 'Sijua, Patrapada, Bhubaneswar, Odisha 751019',
    city: 'Bhubaneswar',
    state: 'Odisha',
    isActive: true,
    availableHours: '24/7',
    description: 'Premier medical institute and hospital in Bhubaneswar',
    coordinates: {
      latitude: 20.1809,
      longitude: 85.8313
    }
  },
  {
    name: 'Odisha Fire Service - Bhubaneswar',
    phoneNumber: '101',
    serviceType: 'fire',
    address: 'Fire Station Road, Unit-II, Bhubaneswar, Odisha',
    city: 'Bhubaneswar',
    state: 'Odisha',
    isActive: true,
    availableHours: '24/7',
    description: 'Fire emergency and rescue services for Bhubaneswar',
    coordinates: {
      latitude: 20.2700,
      longitude: 85.8400
    }
  },
  {
    name: 'Odisha Tourism Helpline',
    phoneNumber: '1363',
    serviceType: 'tourist_helpline',
    address: 'Tourism Bhawan, Museum Campus, Bhubaneswar, Odisha',
    city: 'Bhubaneswar',
    state: 'Odisha',
    isActive: true,
    availableHours: '24/7',
    description: 'Tourist assistance and information helpline for Odisha',
    coordinates: {
      latitude: 20.2644,
      longitude: 85.8342
    }
  }
];

export async function seedEmergencyServices() {
  try {
    console.log('Seeding emergency services...');
    
    // Clear existing emergency services
    await EmergencyService.deleteMany({});
    console.log('Cleared existing emergency services');

    // Insert new emergency services
    const services = await EmergencyService.insertMany(emergencyServicesData);
    console.log(`Created ${services.length} emergency services:`);
    
    services.forEach(service => {
      console.log(`- ${service.name} (${service.serviceType}): ${service.phoneNumber}`);
    });

    return services;
  } catch (error) {
    console.error('Error seeding emergency services:', error);
    throw error;
  }
}

// Run this script directly if called
if (require.main === module) {
  async function run() {
    try {
      await connectDB();
      await seedEmergencyServices();
      console.log('Emergency services seeded successfully!');
      process.exit(0);
    } catch (error) {
      console.error('Failed to seed emergency services:', error);
      process.exit(1);
    }
  }
  
  run();
}