"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const server_1 = require("../server");
const server_2 = require("../server");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const ai_service_1 = require("../services/ai.service");
const router = (0, express_1.Router)();
// Create SOS / Incident
router.post('/sos', auth_1.authenticate, (0, auth_1.authorize)('STUDENT'), async (req, res, next) => {
    try {
        const { category, latitude, longitude, description, address } = req.body;
        if (!category || latitude === undefined || longitude === undefined) {
            throw new errorHandler_1.ApiError(400, 'Category and location are required.');
        }
        const threatScore = (0, ai_service_1.calculateThreatScore)(category, latitude, longitude);
        const isFake = await (0, ai_service_1.detectFakeSOS)(req.user.id, category);
        const severity = threatScore >= 80 ? 'CRITICAL' : threatScore >= 60 ? 'HIGH' : threatScore >= 40 ? 'MEDIUM' : 'LOW';
        const incident = await server_1.prisma.incident.create({
            data: {
                studentId: req.user.id,
                category,
                severity,
                title: `${category} Emergency - ${req.user.firstName} ${req.user.lastName}`,
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
        await server_1.prisma.incidentTimeline.create({
            data: { incidentId: incident.id, event: 'SOS_TRIGGERED', details: `SOS triggered by ${req.user.firstName} ${req.user.lastName}` },
        });
        const recommendedGuard = await (0, ai_service_1.recommendResponder)(latitude, longitude);
        if (recommendedGuard) {
            await server_1.prisma.responderAssignment.create({
                data: {
                    incidentId: incident.id,
                    responderId: recommendedGuard.userId,
                    distance: recommendedGuard.distance,
                    eta: Math.round(recommendedGuard.distance * 3),
                },
            });
            await server_1.prisma.incidentTimeline.create({
                data: { incidentId: incident.id, event: 'RESPONDER_ASSIGNED', details: `Responder auto-assigned` },
            });
            await server_1.prisma.incident.update({ where: { id: incident.id }, data: { status: 'ASSIGNED' } });
            server_2.io.to(`user_${recommendedGuard.userId}`).emit('sos:incoming', {
                incident,
                assignment: { distance: recommendedGuard.distance, eta: Math.round(recommendedGuard.distance * 3) },
            });
        }
        server_2.io.to('security_room').emit('sos:new', incident);
        server_2.io.to('admin_room').emit('sos:new', incident);
        const securityUsers = await server_1.prisma.user.findMany({ where: { role: 'SECURITY', isActive: true } });
        await server_1.prisma.notification.createMany({
            data: securityUsers.map(u => ({
                userId: u.id,
                type: 'SOS_ALERT',
                title: 'New SOS Alert!',
                message: `${incident.category} emergency from ${req.user.firstName} ${req.user.lastName}`,
                data: { incidentId: incident.id },
            })),
        });
        await server_1.prisma.heatmapData.create({
            data: { latitude, longitude, category, intensity: threatScore / 100 },
        });
        await server_1.prisma.activityLog.create({
            data: { userId: req.user.id, action: 'SOS_TRIGGERED', details: `${category} SOS triggered` },
        });
        res.status(201).json({ success: true, data: incident });
    }
    catch (error) {
        next(error);
    }
});
// Get all incidents
router.get('/', auth_1.authenticate, async (req, res, next) => {
    try {
        const status = req.query.status;
        const category = req.query.category;
        const severity = req.query.severity;
        const page = parseInt(req.query.page || '1');
        const limit = parseInt(req.query.limit || '20');
        const skip = (page - 1) * limit;
        const where = {};
        if (req.user.role === 'STUDENT')
            where.studentId = req.user.id;
        if (status)
            where.status = status;
        if (category)
            where.category = category;
        if (severity)
            where.severity = severity;
        const [incidents, total] = await Promise.all([
            server_1.prisma.incident.findMany({
                where,
                skip,
                take: limit,
                include: {
                    student: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatar: true } },
                    assignments: { include: { responder: { select: { id: true, firstName: true, lastName: true } } } },
                },
                orderBy: { createdAt: 'desc' },
            }),
            server_1.prisma.incident.count({ where }),
        ]);
        res.json({ success: true, data: { incidents, total, page } });
    }
    catch (error) {
        next(error);
    }
});
// Get single incident
router.get('/:id', auth_1.authenticate, async (req, res, next) => {
    try {
        const id = req.params.id;
        const incident = await server_1.prisma.incident.findUnique({
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
        if (!incident)
            throw new errorHandler_1.ApiError(404, 'Incident not found.');
        res.json({ success: true, data: incident });
    }
    catch (error) {
        next(error);
    }
});
// Update incident status
router.put('/:id/status', auth_1.authenticate, (0, auth_1.authorize)('SECURITY', 'ADMIN'), async (req, res, next) => {
    try {
        const { status, notes } = req.body;
        const id = req.params.id;
        const incident = await server_1.prisma.incident.findUnique({ where: { id } });
        if (!incident)
            throw new errorHandler_1.ApiError(404, 'Incident not found.');
        const updateData = { status };
        if (status === 'RESOLVED') {
            updateData.resolvedAt = new Date();
            updateData.responseTime = Math.round((Date.now() - incident.createdAt.getTime()) / 1000);
            updateData.summary = (0, ai_service_1.generateIncidentSummary)(incident);
            const assignment = await server_1.prisma.responderAssignment.findFirst({ where: { incidentId: id } });
            if (assignment) {
                await server_1.prisma.responderAssignment.update({ where: { id: assignment.id }, data: { completedAt: new Date() } });
                await server_1.prisma.securityGuard.updateMany({
                    where: { userId: assignment.responderId },
                    data: { totalResolved: { increment: 1 }, status: 'AVAILABLE' },
                });
            }
        }
        const updated = await server_1.prisma.incident.update({
            where: { id },
            data: updateData,
            include: { student: { select: { id: true, firstName: true, lastName: true } } },
        });
        const eventMap = {
            ASSIGNED: 'RESPONDER_ASSIGNED',
            IN_PROGRESS: 'RESPONDER_STARTED',
            ON_THE_WAY: 'RESPONDER_ON_WAY',
            REACHED: 'RESPONDER_ARRIVED',
            RESOLVED: 'INCIDENT_RESOLVED',
            CANCELLED: 'INCIDENT_CANCELLED',
        };
        await server_1.prisma.incidentTimeline.create({
            data: { incidentId: id, event: eventMap[status] || status, details: notes || `Status changed to ${status}` },
        });
        server_2.io.to(`user_${incident.studentId}`).emit('incident:updated', updated);
        server_2.io.to('admin_room').emit('incident:updated', updated);
        res.json({ success: true, data: updated });
    }
    catch (error) {
        next(error);
    }
});
// Accept incident
router.post('/:id/accept', auth_1.authenticate, (0, auth_1.authorize)('SECURITY'), async (req, res, next) => {
    try {
        const id = req.params.id;
        const incident = await server_1.prisma.incident.findUnique({ where: { id } });
        if (!incident)
            throw new errorHandler_1.ApiError(404, 'Incident not found.');
        let assignment = await server_1.prisma.responderAssignment.findFirst({
            where: { incidentId: id, responderId: req.user.id },
        });
        if (!assignment) {
            assignment = await server_1.prisma.responderAssignment.create({
                data: { incidentId: id, responderId: req.user.id, acceptedAt: new Date() },
            });
        }
        else {
            assignment = await server_1.prisma.responderAssignment.update({
                where: { id: assignment.id },
                data: { acceptedAt: new Date() },
            });
        }
        await server_1.prisma.incident.update({ where: { id }, data: { status: 'IN_PROGRESS' } });
        await server_1.prisma.securityGuard.updateMany({
            where: { userId: req.user.id },
            data: { status: 'ON_MISSION' },
        });
        await server_1.prisma.incidentTimeline.create({
            data: { incidentId: id, event: 'RESPONDER_ACCEPTED', details: `${req.user.firstName} ${req.user.lastName} accepted the incident` },
        });
        server_2.io.to(`user_${incident.studentId}`).emit('incident:accepted', { incidentId: id, responder: req.user });
        res.json({ success: true, message: 'Incident accepted.' });
    }
    catch (error) {
        next(error);
    }
});
// Get active incidents for security
router.get('/security/active', auth_1.authenticate, (0, auth_1.authorize)('SECURITY'), async (req, res, next) => {
    try {
        const assignments = await server_1.prisma.responderAssignment.findMany({
            where: {
                responderId: req.user.id,
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
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=incident.routes.js.map