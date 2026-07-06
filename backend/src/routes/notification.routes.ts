import { Router, Response, NextFunction } from 'express';
import { prisma } from '../server';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Get notifications
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '20');
    const unreadOnly = req.query.unreadOnly as string;
    const skip = (page - 1) * limit;

    const where: any = { userId: req.user!.id };
    if (unreadOnly === 'true') where.isRead = false;

    const [notifications, total, unread] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId: req.user!.id, isRead: false } }),
    ]);

    res.json({ success: true, data: { notifications, total, unread } });
  } catch (error) {
    next(error);
  }
});

// Mark as read
router.put('/:id/read', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Mark all as read
router.put('/read-all', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, isRead: false },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Register device token
router.post('/device-token', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { token, platform } = req.body;

    await prisma.deviceToken.upsert({
      where: { token },
      update: { userId: req.user!.id, platform },
      create: { userId: req.user!.id, token, platform },
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
