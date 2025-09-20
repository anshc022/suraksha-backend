import express from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health';
import { authRouter } from './routes/auth';
import { createPanicRouter, createPanicQueryRouter } from './routes/panic';
import { createLocationRouter } from './routes/location';
import { incidentsRouter } from './routes/incidents';
import { emergencyContactsRouter } from './routes/emergencyContacts';
import emergencyServicesRouter from './routes/emergencyServices';
import { userRouter } from './routes/user';
import { createSafeZoneRouter } from './routes/safeZones';
import { aiRouter } from './routes/ai';
import { GeofencingService } from './services/geofencing';
import { Server } from 'socket.io';
import http from 'http';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/user', userRouter);
  app.use('/api/emergency-contacts', emergencyContactsRouter);
  app.use('/api/emergency-services', emergencyServicesRouter);
  app.use('/api/ai', aiRouter);

  app.use('/api/incidents', incidentsRouter);
  // Location and panic routes will be attached when socket is ready
  return app;
}

export function attachRealtime(app: express.Express) {
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: '*'} });

  // Initialize geofencing service
  const geofencingService = new GeofencingService(io);

  // Routes that need io or geofencing service
  app.use('/api/panic', createPanicRouter(io));
  app.use('/api/location', createLocationRouter(geofencingService));
  app.use('/api/safe-zones', createSafeZoneRouter(io));
  
  // Panic alerts query routes
  app.use('/api/panic-alerts', createPanicQueryRouter());

  io.on('connection', socket => {
    // Basic connection log
    socket.emit('welcome', { message: 'Connected to Suraksha Realtime' });
  });

  return { server, io };
}
