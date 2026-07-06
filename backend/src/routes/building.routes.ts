import { Router, Response, NextFunction } from 'express';
import { prisma } from '../server';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';

const router = Router();

// Get all buildings
router.get('/', authenticate, async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const buildings = await prisma.campusBuilding.findMany({ orderBy: { name: 'asc' } });
    res.json({ success: true, data: buildings });
  } catch (error) {
    next(error);
  }
});

// Get safe zones
router.get('/safe-zones', authenticate, async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const zones = await prisma.safeZone.findMany({
      include: { building: true },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: zones });
  } catch (error) {
    next(error);
  }
});

// Create building (Admin)
router.post('/', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, code, latitude, longitude, type, floor, description } = req.body;
    if (!name || !code || !latitude || !longitude || !type) {
      throw new ApiError(400, 'Name, code, location, and type are required.');
    }

    const building = await prisma.campusBuilding.create({
      data: { name, code, latitude, longitude, type, floor, description },
    });
    res.status(201).json({ success: true, data: building });
  } catch (error) {
    next(error);
  }
});

// Create safe zone (Admin)
router.post('/safe-zones', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, latitude, longitude, radius, buildingId, description, hasCamera, hasGuard } = req.body;
    const zone = await prisma.safeZone.create({
      data: { name, latitude, longitude, radius, buildingId, description, hasCamera, hasGuard },
    });
    res.status(201).json({ success: true, data: zone });
  } catch (error) {
    next(error);
  }
});

// Get emergency types
router.get('/emergency-types', authenticate, async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const types = await prisma.emergencyType.findMany({ orderBy: { priority: 'asc' } });
    res.json({ success: true, data: types });
  } catch (error) {
    next(error);
  }
});

export default router;
