import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { validateBody } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimit.js';

const router = express.Router();

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['ADMIN', 'AGENT']).default('AGENT')
});

// Apply auth rate limiting
router.use(authLimiter);

// POST /auth/login
router.post('/login', validateBody(loginSchema), async (req, res) => {
  const { email, password } = req.validatedBody;

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      process.env.JWT_SECRET || 'super-secret-cognifyr-jwt-token-signing-key',
      { expiresIn: '24h' }
    );

    // Return user without passwordHash
    const { passwordHash, ...userWithoutPassword } = user;

    return res.status(200).json({
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error during login' });
  }
});

// POST /auth/register
router.post('/register', validateBody(registerSchema), async (req, res) => {
  const { email, password, name, role } = req.validatedBody;

  try {
    // In production, block registration if not authorized, or restrict to ADMIN only
    if (process.env.NODE_ENV === 'production') {
      // Check if there are already users; if yes, require authorization
      const userCount = await prisma.user.count();
      if (userCount > 0) {
        // Require auth header
        const authHeader = req.headers['authorization'];
        if (!authHeader) {
          return res.status(403).json({ error: 'Registration is closed in production' });
        }
        const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super-secret-cognifyr-jwt-token-signing-key');
          if (decoded.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Only admins can register new users in production' });
          }
        } catch (err) {
          return res.status(401).json({ error: 'Invalid token' });
        }
      }
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email address already registered' });
    }

    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
        name,
        role
      }
    });

    const { passwordHash: _, ...userWithoutPassword } = newUser;
    return res.status(201).json(userWithoutPassword);
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Internal server error during registration' });
  }
});

export default router;
