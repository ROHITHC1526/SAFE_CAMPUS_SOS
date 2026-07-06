import { Router, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../server';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';

const router = Router();

// Get all users (Admin only)
router.get('/', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { role, search, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = {};
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        select: {
          id: true, email: true, firstName: true, lastName: true,
          phone: true, avatar: true, role: true, isActive: true,
          isVerified: true, lastLogin: true, createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ success: true, data: { users, total, page: parseInt(page as string), limit: parseInt(limit as string) } });
  } catch (error) {
    next(error);
  }
});

// Get user profile
router.get('/profile', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        medicalProfile: true,
        emergencyContacts: true,
        securityGuard: true,
      },
    });
    if (!user) throw new ApiError(404, 'User not found.');

    const { password: _, ...userData } = user;
    res.json({ success: true, data: userData });
  } catch (error) {
    next(error);
  }
});

// Update profile
router.put('/profile', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { firstName, lastName, phone, avatar } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { firstName, lastName, phone, avatar },
      select: { id: true, email: true, firstName: true, lastName: true, phone: true, avatar: true, role: true },
    });
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

// Medical Profile
router.put('/medical-profile', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { bloodGroup, allergies, diseases, medications, emergencyNotes } = req.body;
    const profile = await prisma.medicalProfile.upsert({
      where: { userId: req.user!.id },
      update: { bloodGroup, allergies, diseases, medications, emergencyNotes },
      create: { userId: req.user!.id, bloodGroup, allergies, diseases, medications, emergencyNotes },
    });
    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
});

// Emergency Contacts CRUD
router.get('/emergency-contacts', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const contacts = await prisma.emergencyContact.findMany({ where: { userId: req.user!.id }, orderBy: { isPrimary: 'desc' } });
    res.json({ success: true, data: contacts });
  } catch (error) {
    next(error);
  }
});

router.post('/emergency-contacts', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, phone, email, relation, isPrimary } = req.body;
    if (!name || !phone || !relation) throw new ApiError(400, 'Name, phone, and relation are required.');

    if (isPrimary) {
      await prisma.emergencyContact.updateMany({ where: { userId: req.user!.id }, data: { isPrimary: false } });
    }

    const contact = await prisma.emergencyContact.create({
      data: { userId: req.user!.id, name, phone, email, relation, isPrimary: isPrimary || false },
    });
    res.status(201).json({ success: true, data: contact });
  } catch (error) {
    next(error);
  }
});

router.put('/emergency-contacts/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { name, phone, email, relation, isPrimary } = req.body;

    const existing = await prisma.emergencyContact.findFirst({ where: { id, userId: req.user!.id } });
    if (!existing) throw new ApiError(404, 'Contact not found.');

    if (isPrimary) {
      await prisma.emergencyContact.updateMany({ where: { userId: req.user!.id }, data: { isPrimary: false } });
    }

    const contact = await prisma.emergencyContact.update({
      where: { id },
      data: { name, phone, email, relation, isPrimary },
    });
    res.json({ success: true, data: contact });
  } catch (error) {
    next(error);
  }
});

router.delete('/emergency-contacts/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.emergencyContact.findFirst({ where: { id, userId: req.user!.id } });
    if (!existing) throw new ApiError(404, 'Contact not found.');

    await prisma.emergencyContact.delete({ where: { id } });
    res.json({ success: true, message: 'Contact deleted.' });
  } catch (error) {
    next(error);
  }
});

// Admin: Create security guard or admin
router.post('/create', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { email, password, firstName, lastName, phone, role, badgeNumber, specialization, shift, zone } = req.body;

    if (!email || !password || !firstName || !lastName || !role) {
      throw new ApiError(400, 'All fields are required.');
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new ApiError(409, 'User already exists.');

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, password: hashed, firstName, lastName, phone, role, isVerified: true },
    });

    if (role === 'SECURITY' && badgeNumber) {
      await prisma.securityGuard.create({
        data: {
          userId: user.id,
          badgeNumber,
          specialization: specialization || [],
          shift,
          zone,
        },
      });
    }

    res.status(201).json({ success: true, data: { id: user.id, email: user.email, role: user.role } });
  } catch (error) {
    next(error);
  }
});

// Admin: Toggle user active status
router.put('/:id/toggle-active', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new ApiError(404, 'User not found.');

    const updated = await prisma.user.update({ where: { id }, data: { isActive: !user.isActive } });
    res.json({ success: true, data: { id: updated.id, isActive: updated.isActive } });
  } catch (error) {
    next(error);
  }
});

// Get security guards
router.get('/security-guards', authenticate, authorize('ADMIN', 'SECURITY'), async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const guards = await prisma.securityGuard.findMany({
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatar: true } } },
    });
    res.json({ success: true, data: guards });
  } catch (error) {
    next(error);
  }
});

export default router;
