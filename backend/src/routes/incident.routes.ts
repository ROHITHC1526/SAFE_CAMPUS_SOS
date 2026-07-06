import { Router, Response, NextFunction } from 'express';
import { prisma } from '../server';
import { io } from '../server';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';
import { calculateThreatScore, detectFakeSOS, recommendResponder, generateIncidentSummary } from '../services/ai.service';

const router = Router();

// Create SOS / Incident
router.post('/sos', authenticate, authorize('STUDENT'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { category, latitude, longitude, description, address } = req.body;

    if (!category || latitude === undefined || longitude === undefined) {
      throw new ApiError(400, 'Category and location are required.');
    }

    const threatScore = calculateThreatScore(category, latitude, longitude);
    const isFake = await detectFakeSOS(req.user!.id, category);
    const severity = threatScore >= 80 ? 'CRITICAL' : threatScore >= 60 ? 'HIGH' : threatScore >= 40 ? 'MEDIUM' : 'LOW';

    const incident = await prisma.incident.create({
      data: {
        studentId: req.user!.id,
        category,
        severity,
        title: `${category} Emergency - ${req.user!.firstName} ${req.user!.lastName}`,
        description,
        latitude,
        longitude,
        address,
        aiThreatScore: threatScore,
        isFakeSOS: isFake,
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatar: true } },
      },
    });

    await prisma.incidentTimeline.create({
      data: { incidentId: incident.id, event: 'SOS_TRIGGERED', details: `SOS triggered by ${req.user!.firstName} ${req.user!.lastName}` },
    });

    const recommendedGuard = await recommendResponder(latitude, longitude);

    if (recommendedGuard) {
      await prisma.responderAssignment.create({
        data: {
          incidentId: incident.id,
          responderId: recommendedGuard.userId,
          distance: recommendedGuard.distance,
          eta: Math.round(recommendedGuard.distance * 3),
        },
      });

      await prisma.incidentTimeline.create({
        data: { incidentId: incident.id, event: 'RESPONDER_ASSIGNED', details: `Responder auto-assigned` },
      });

      await prisma.incident.update({ where: { id: incident.id }, data: { status: 'ASSIGNED' } });

      io.to(`user_${recommendedGuard.userId}`).emit('sos:incoming', {
        incident,
        assignment: { distance: recommendedGuard.distance, eta: Math.round(recommendedGuard.distance * 3) },
      });
    }

    io.to('security_room').emit('sos:new', incident);
    io.to('admin_room').emit('sos:new', incident);

    const securityUsers = await prisma.user.findMany({ where: { role: 'SECURITY', isActive: true } });
    await prisma.notification.createMany({
      data: securityUsers.map(u => ({
        userId: u.id,
        type: 'SOS_ALERT' as const,
        title: 'New SOS Alert!',
        message: `${incident.category} emergency from ${req.user!.firstName} ${req.user!.lastName}`,
        data: { incidentId: incident.id },
      })),
    });

    await prisma.heatmapData.create({
      data: { latitude, longitude, category, intensity: threatScore / 100 },
    });

    await prisma.activityLog.create({
      data: { userId: req.user!.id, action: 'SOS_TRIGGERED', details: `${category} SOS triggered` },
    });

    res.status(201).json({ success: true, data: incident });
  } catch (error) {
    next(error);
  }
});

// Get all incidents
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as string | undefined;
    const category = req.query.category as string | undefined;
    const severity = req.query.severity as string | undefined;
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '20');
    const skip = (page - 1) * limit;

    const where: any = {};
    if (req.user!.role === 'STUDENT') where.studentId = req.user!.id;
    if (status) where.status = status;
    if (category) where.category = category;
    if (severity) where.severity = severity;

    const [incidents, total] = await Promise.all([
      prisma.incident.findMany({
        where,
        skip,
        take: limit,
        include: {
          student: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatar: true } },
          assignments: { include: { responder: { select: { id: true, firstName: true, lastName: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.incident.count({ where }),
    ]);

    res.json({ success: true, data: { incidents, total, page } });
  } catch (error) {
    next(error);
  }
});

// Get single incident
router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const incident = await prisma.incident.findUnique({
      where: { id },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatar: true },
        },
        assignments: {
          include: { responder: { select: { id: true, firstName: true, lastName: true, phone: true } } },
        },
        timeline: { orderBy: { timestamp: 'asc' } },
        chatMessages: { orderBy: { createdAt: 'asc' }, take: 50 },
        mediaEvidence: true,
        callLogs: true,
      },
    });

    if (!incident) throw new ApiError(404, 'Incident not found.');
    res.json({ success: true, data: incident });
  } catch (error) {
    next(error);
  }
});

// Update incident status
router.put('/:id/status', authenticate, authorize('SECURITY', 'ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, notes } = req.body;
    const id = req.params.id as string;

    const incident = await prisma.incident.findUnique({ where: { id } });
    if (!incident) throw new ApiError(404, 'Incident not found.');

    const updateData: any = { status };
    if (status === 'RESOLVED') {
      updateData.resolvedAt = new Date();
      updateData.responseTime = Math.round((Date.now() - incident.createdAt.getTime()) / 1000);
      updateData.summary = generateIncidentSummary(incident);

      const assignment = await prisma.responderAssignment.findFirst({ where: { incidentId: id } });
      if (assignment) {
        await prisma.responderAssignment.update({ where: { id: assignment.id }, data: { completedAt: new Date() } });
        await prisma.securityGuard.updateMany({
          where: { userId: assignment.responderId },
          data: { totalResolved: { increment: 1 }, status: 'AVAILABLE' },
        });
      }
    }

    const updated = await prisma.incident.update({
      where: { id },
      data: updateData,
      include: { student: { select: { id: true, firstName: true, lastName: true } } },
    });

    const eventMap: Record<string, string> = {
      ASSIGNED: 'RESPONDER_ASSIGNED',
      IN_PROGRESS: 'RESPONDER_STARTED',
      ON_THE_WAY: 'RESPONDER_ON_WAY',
      REACHED: 'RESPONDER_ARRIVED',
      RESOLVED: 'INCIDENT_RESOLVED',
      CANCELLED: 'INCIDENT_CANCELLED',
    };

    await prisma.incidentTimeline.create({
      data: { incidentId: id, event: eventMap[status] || status, details: notes || `Status changed to ${status}` },
    });

    io.to(`user_${incident.studentId}`).emit('incident:updated', updated);
    io.to('admin_room').emit('incident:updated', updated);

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// Accept incident
router.post('/:id/accept', authenticate, authorize('SECURITY'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    const incident = await prisma.incident.findUnique({ where: { id } });
    if (!incident) throw new ApiError(404, 'Incident not found.');

    let assignment = await prisma.responderAssignment.findFirst({
      where: { incidentId: id, responderId: req.user!.id },
    });

    if (!assignment) {
      assignment = await prisma.responderAssignment.create({
        data: { incidentId: id, responderId: req.user!.id, acceptedAt: new Date() },
      });
    } else {
      assignment = await prisma.responderAssignment.update({
        where: { id: assignment.id },
        data: { acceptedAt: new Date() },
      });
    }

    await prisma.incident.update({ where: { id }, data: { status: 'IN_PROGRESS' } });

    await prisma.securityGuard.updateMany({
      where: { userId: req.user!.id },
      data: { status: 'ON_MISSION' },
    });

    await prisma.incidentTimeline.create({
      data: { incidentId: id, event: 'RESPONDER_ACCEPTED', details: `${req.user!.firstName} ${req.user!.lastName} accepted the incident` },
    });

    io.to(`user_${incident.studentId}`).emit('incident:accepted', { incidentId: id, responder: req.user });

    res.json({ success: true, message: 'Incident accepted.' });
  } catch (error) {
    next(error);
  }
});

// Get active incidents for security
router.get('/security/active', authenticate, authorize('SECURITY'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const assignments = await prisma.responderAssignment.findMany({
      where: {
        responderId: req.user!.id,
        completedAt: null,
      },
      include: {
        incident: {
          include: {
            student: { select: { id: true, firstName: true, lastName: true, phone: true, avatar: true } },
          },
        },
      },
    });

    res.json({ success: true, data: assignments });
  } catch (error) {
    next(error);
  }
});

export default router;
