import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 4000,
  JWT_SECRET: process.env.JWT_SECRET || 'insecure_dev_secret',
  // Default now points to provided Atlas cluster (recommend moving to .env for security)
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb+srv://suraksha:Ankita1477@suraksha.l0l98tg.mongodb.net/suraksha?retryWrites=true&w=majority&appName=suraksha'
};
