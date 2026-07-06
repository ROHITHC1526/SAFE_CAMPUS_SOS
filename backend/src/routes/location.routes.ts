import { Router, Response, NextFunction } from 'express';
import { prisma } from '../server';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Update live location
router.post('/update', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { latitude, longitude, accuracy, speed, heading } = req.body;

    await prisma.liveLocation.create({
      data: { userId: req.user!.id, latitude, longitude, accuracy, speed, heading },
    });

    if (req.user!.role === 'SECURITY') {
      await prisma.securityGuard.updateMany({
        where: { userId: req.user!.id },
        data: { currentLat: latitude, currentLng: longitude },
      });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Get user's location history
router.get('/history/:userId', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.userId as string;
    const since = req.query.since as string | undefined;

    const locations = await prisma.liveLocation.findMany({
      where: {
        userId,
        ...(since && { timestamp: { gte: new Date(since) } }),
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    res.json({ success: true, data: locations });
  } catch (error) {
    next(error);
  }
});

// Get nearby security guards
router.get('/nearby-guards', authenticate, async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const guards = await prisma.securityGuard.findMany({
      where: { status: 'AVAILABLE', currentLat: { not: null } },
      include: { user: { select: { id: true, firstName: true, lastName: true, phone: true } } },
    });

    res.json({ success: true, data: guards });
  } catch (error) {
    next(error);
  }
});

export default router;
