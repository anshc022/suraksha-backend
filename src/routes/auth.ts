import { Router } from 'express';
import { z } from 'zod';
import { signToken, signRefreshToken, verifyRefreshToken } from '../services/jwt';
import { User } from '../types';
import { UserModel } from '../models/User';
import bcrypt from 'bcrypt';
import { generateDID } from '../utils/did';

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

authRouter.post('/register', async (req, res) => {
  const parse = registerSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input', issues: parse.error.issues });
  const { email, password } = parse.data;
  const existing = await UserModel.findOne({ email });
  if (existing) return res.status(409).json({ error: 'Email already registered' });
  const passwordHash = await bcrypt.hash(password, 10);
  const did = generateDID(email);
  const created = await UserModel.create({ email, passwordHash, did });
  const user: User = { id: created.id, email: created.email, role: created.role };
  const token = signToken(user);
  const refresh = await signRefreshToken(user.id);
  res.status(201).json({ token, refreshToken: refresh, user: { ...user, did } });
});

authRouter.post('/login', async (req, res) => {
  const parse = loginSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input', issues: parse.error.issues });
  const { email, password } = parse.data;
  const userDoc = await UserModel.findOne({ email });
  if (!userDoc || !userDoc.passwordHash) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, userDoc.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const user: User = { id: userDoc.id, email: userDoc.email, role: userDoc.role };
  const token = signToken(user);
  const refresh = await signRefreshToken(user.id);
  res.json({ token, refreshToken: refresh, user });
});

authRouter.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' });
  try {
    const { userId } = await verifyRefreshToken(refreshToken);
    const userDoc = await UserModel.findById(userId);
    if (!userDoc) return res.status(401).json({ error: 'Invalid refresh' });
    const user: User = { id: userDoc.id, email: userDoc.email, role: userDoc.role };
    const token = signToken(user);
    const refresh = await signRefreshToken(user.id);
    res.json({ token, refreshToken: refresh, user });
  } catch {
    res.status(401).json({ error: 'Invalid refresh' });
  }
});

// Simple profile endpoint for dashboard to validate token
authRouter.get('/me', async (req, res) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });
  try {
    const { verifyToken } = await import('../services/jwt');
    const decoded = verifyToken(header.substring(7));
    const userDoc = await UserModel.findById(decoded.sub);
    if (!userDoc) return res.status(404).json({ error: 'User not found' });
    res.json({ id: userDoc.id, email: userDoc.email, role: userDoc.role, did: userDoc.did });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});
