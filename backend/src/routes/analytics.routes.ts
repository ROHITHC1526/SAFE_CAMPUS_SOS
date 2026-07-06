import { Router, Response, NextFunction } from 'express';
import { prisma } from '../server';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

// Dashboard statistics
router.get('/dashboard', authenticate, authorize('ADMIN'), async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalStudents,
      totalGuards,
      totalIncidents,
      todaysSOS,
      pendingIncidents,
      resolvedIncidents,
      avgResponseTime,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.user.count({ where: { role: 'SECURITY' } }),
      prisma.incident.count(),
      prisma.incident.count({ where: { createdAt: { gte: today } } }),
      prisma.incident.count({ where: { status: { in: ['PENDING', 'ASSIGNED'] } } }),
      prisma.incident.count({ where: { status: 'RESOLVED' } }),
      prisma.incident.aggregate({ _avg: { responseTime: true }, where: { responseTime: { not: null } } }),
    ]);

    res.json({
      success: true,
      data: {
        totalStudents,
        totalGuards,
        totalIncidents,
        todaysSOS,
        pendingIncidents,
        resolvedIncidents,
        avgResponseTime: Math.round(avgResponseTime._avg.responseTime || 0),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Incident trends (last 30 days)
router.get('/trends', authenticate, authorize('ADMIN'), async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const incidents = await prisma.incident.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true, category: true, severity: true, status: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date
    const dailyTrends: Record<string, number> = {};
    const categoryBreakdown: Record<string, number> = {};
    const severityBreakdown: Record<string, number> = {};

    incidents.forEach(inc => {
      const date = inc.createdAt.toISOString().split('T')[0];
      dailyTrends[date] = (dailyTrends[date] || 0) + 1;
      categoryBreakdown[inc.category] = (categoryBreakdown[inc.category] || 0) + 1;
      severityBreakdown[inc.severity] = (severityBreakdown[inc.severity] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        dailyTrends: Object.entries(dailyTrends).map(([date, count]) => ({ date, count })),
        categoryBreakdown: Object.entries(categoryBreakdown).map(([category, count]) => ({ category, count })),
        severityBreakdown: Object.entries(severityBreakdown).map(([severity, count]) => ({ severity, count })),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Heatmap data
router.get('/heatmap', authenticate, authorize('ADMIN', 'SECURITY'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { category } = req.query;
    const where: any = {};
    if (category) where.category = category;

    const data = await prisma.heatmapData.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// Guard performance
router.get('/guard-performance', authenticate, authorize('ADMIN'), async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const guards = await prisma.securityGuard.findMany({
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
      orderBy: { totalResolved: 'desc' },
    });

    res.json({ success: true, data: guards });
  } catch (error) {
    next(error);
  }
});

// Activity logs
router.get('/activity-logs', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '50' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const logs = await prisma.activityLog.findMany({
      skip,
      take: parseInt(limit as string),
      include: { user: { select: { firstName: true, lastName: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
});

// Monthly report
router.get('/monthly-report', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { month, year } = req.query;
    const m = parseInt(month as string) || new Date().getMonth() + 1;
    const y = parseInt(year as string) || new Date().getFullYear();

    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0, 23, 59, 59);

    const [incidents, resolved, avgResponse] = await Promise.all([
      prisma.incident.count({ where: { createdAt: { gte: startDate, lte: endDate } } }),
      prisma.incident.count({ where: { createdAt: { gte: startDate, lte: endDate }, status: 'RESOLVED' } }),
      prisma.incident.aggregate({
        _avg: { responseTime: true },
        where: { createdAt: { gte: startDate, lte: endDate }, responseTime: { not: null } },
      }),
    ]);

    res.json({
      success: true,
      data: {
        month: m,
        year: y,
        totalIncidents: incidents,
        resolved,
        resolutionRate: incidents > 0 ? Math.round((resolved / incidents) * 100) : 0,
        avgResponseTime: Math.round(avgResponse._avg.responseTime || 0),
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
