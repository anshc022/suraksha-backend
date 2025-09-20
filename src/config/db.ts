import mongoose from 'mongoose';
import { ENV } from './env';

export async function connectDB() {
  if (mongoose.connection.readyState === 1) return;
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(ENV.MONGODB_URI, {
      autoIndex: true,
      serverSelectionTimeoutMS: 10000
    });
    console.log('MongoDB connected');
  } catch (err: any) {
    console.error('Mongo connection failed:', err.message);
    if (err.reason) console.error('Reason:', err.reason);
    throw err;
  }
}
