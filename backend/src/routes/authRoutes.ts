import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma.js';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { UserRole, ApprovalStatus } from '../types/index.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'capacity_connect_default_secret_key';

// 1. Signup
router.post('/signup', async (req, res): Promise<void> => {
  try {
    const { email, password, fullName, requestedRole, jobDesignation, department, qualifications, skills } = req.body;

    if (!email || !password || !fullName) {
      res.status(400).json({ error: 'Email, password, and full name are required.' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(400).json({ error: 'User with this email already exists.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const validRequestedRole = Object.values(UserRole).includes(requestedRole)
      ? requestedRole
      : UserRole.TRAINEE;

    // Create user and profile
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: validRequestedRole,
        requestedRole: validRequestedRole,
        approvalStatus: ApprovalStatus.PENDING,
        profile: {
          create: {
            fullName,
            jobDesignation: jobDesignation || 'Scientific Assistant',
            department: department || 'Regional Meteorological Centre',
            qualifications: JSON.stringify(qualifications || ['B.Sc / M.Sc Meteorology']),
            skills: JSON.stringify(skills || ['Surface Observations']),
          },
        },
      },
      include: { profile: true },
    });

    // Also mirror directly to Supabase User and Profile tables if Supabase is configured
    if (isSupabaseConfigured) {
      try {
        await supabase.from('User').upsert({
          id: user.id,
          email: user.email,
          passwordHash: user.passwordHash,
          role: user.role,
          requestedRole: user.requestedRole,
          approvalStatus: user.approvalStatus,
        }, { onConflict: 'email' });

        if (user.profile) {
          await supabase.from('Profile').upsert({
            id: user.profile.id,
            userId: user.id,
            fullName: user.profile.fullName,
            jobDesignation: user.profile.jobDesignation,
            department: user.profile.department,
            qualifications: user.profile.qualifications,
            skills: user.profile.skills,
          }, { onConflict: 'id' });
        }
      } catch (supaErr: any) {
        console.warn('[Supabase Sync Warning]:', supaErr?.message || supaErr);
      }
    }

    res.status(201).json({
      message: 'Registration successful. Account is pending administrative approval.',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        approvalStatus: user.approvalStatus,
        profile: user.profile,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// 2. Login
router.post('/login', async (req, res): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        approvalStatus: user.approvalStatus,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        approvalStatus: user.approvalStatus,
        profile: user.profile,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// 3. Forgot Password
router.post('/forgot-password', async (req, res): Promise<void> => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Return success for security obfuscation
      res.json({ message: 'If that email exists in our records, a password reset link has been dispatched.' });
      return;
    }

    const resetToken = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const resetUrl = `${clientUrl}/reset-password?token=${resetToken}`;

    console.log(`[Brevo SMTP Mock] Password reset link for ${email}: ${resetUrl}`);

    res.json({
      message: 'Password reset link sent successfully.',
      resetToken, // Provided in development for instantaneous testing
      resetUrl,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Reset Password
router.post('/reset-password', async (req, res): Promise<void> => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      res.status(400).json({ error: 'Token and new password are required.' });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: decoded.userId },
      data: { passwordHash },
    });

    res.json({ message: 'Password updated successfully. You may now log in with your new credentials.' });
  } catch (error: any) {
    res.status(400).json({ error: 'Invalid or expired password reset token.' });
  }
});

// 5. Current User Info
router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { profile: true },
    });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        approvalStatus: user.approvalStatus,
        profile: user.profile,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Update Profile
router.put('/profile', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { fullName, jobDesignation, department, yearsExperience, languagePref, voiceOptIn, proctoringOptIn } = req.body;

    const profile = await prisma.profile.update({
      where: { userId: req.user!.userId },
      data: {
        fullName,
        jobDesignation,
        department,
        yearsExperience: yearsExperience !== undefined ? Number(yearsExperience) : undefined,
        languagePref,
        voiceOptIn,
        proctoringOptIn,
      },
    });

    res.json({ message: 'Profile updated successfully', profile });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
