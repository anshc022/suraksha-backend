import bcrypt from 'bcrypt';
import { connectDB } from '../config/db';
import { UserModel } from '../models/User';
import { generateDID } from '../utils/did';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const email = process.env.SEED_DASH_EMAIL || 'admin@suraksha.local';
  const password = process.env.SEED_DASH_PASSWORD || 'ChangeMe!123';
  const role = (process.env.SEED_DASH_ROLE as 'admin' | 'officer' | 'tourist') || 'admin';

  if (!email || !password) {
    console.error('SEED_DASH_EMAIL and SEED_DASH_PASSWORD are required');
    process.exit(1);
  }

  await connectDB();

  const existing = await UserModel.findOne({ email });
  const passwordHash = await bcrypt.hash(password, 10);

  if (existing) {
    existing.passwordHash = passwordHash;
    existing.role = role;
    if (!existing.did) existing.did = generateDID(email);
    await existing.save();
    console.log('Updated existing dashboard user:', email, 'role:', role);
  } else {
    const did = generateDID(email);
    await UserModel.create({ email, passwordHash, role, did });
    console.log('Created dashboard user:', email, 'role:', role);
  }

  console.log('You can now log in via /api/auth/login with:');
  console.log('  email   =', email);
  console.log('  password=', password);
}

main()
  .then(() => process.exit(0))
  .catch(err => { console.error(err); process.exit(1); });
