import { Router, Response, NextFunction } from 'express';
import { prisma } from '../server';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

// Get settings
router.get('/', authenticate, authorize('ADMIN'), async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const settings = await prisma.settings.findMany({ orderBy: { category: 'asc' } });
    const grouped = settings.reduce((acc: Record<string, any>, s) => {
      if (!acc[s.category]) acc[s.category] = {};
      acc[s.category][s.key] = s.value;
      return acc;
    }, {});
    res.json({ success: true, data: grouped });
  } catch (error) {
    next(error);
  }
});

// Update setting
router.put('/', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { key, value, category = 'general' } = req.body;
    const setting = await prisma.settings.upsert({
      where: { key },
      update: { value },
      create: { key, value, category },
    });
    res.json({ success: true, data: setting });
  } catch (error) {
    next(error);
  }
});

export default router;
