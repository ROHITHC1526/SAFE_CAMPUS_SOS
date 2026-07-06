import { Router, Response, NextFunction } from 'express';
import { prisma } from '../server';
import { io } from '../server';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Get chat messages for incident
router.get('/:incidentId', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const incidentId = req.params.incidentId as string;
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '50');
    const skip = (page - 1) * limit;

    const messages = await prisma.chatMessage.findMany({
      where: { incidentId },
      skip,
      take: limit,
      include: { sender: { select: { id: true, firstName: true, lastName: true, avatar: true, role: true } } },
      orderBy: { createdAt: 'asc' },
    });

    // Mark as read
    await prisma.chatMessage.updateMany({
      where: { incidentId, senderId: { not: req.user!.id }, isRead: false },
      data: { isRead: true },
    });

    res.json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
});

// Send message
router.post('/:incidentId', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const incidentId = req.params.incidentId as string;
    const { content, type = 'text', fileUrl } = req.body;

    const message = await prisma.chatMessage.create({
      data: { incidentId, senderId: req.user!.id, content, type, fileUrl },
      include: { sender: { select: { id: true, firstName: true, lastName: true, avatar: true, role: true } } },
    });

    io.to(`incident_${incidentId}`).emit('chat:message', message);

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    next(error);
  }
});

export default router;
