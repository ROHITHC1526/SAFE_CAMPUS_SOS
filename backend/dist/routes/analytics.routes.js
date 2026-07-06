"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const server_1 = require("../server");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Dashboard statistics
router.get('/dashboard', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), async (_req, res, next) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const [totalStudents, totalGuards, totalIncidents, todaysSOS, pendingIncidents, resolvedIncidents, avgResponseTime,] = await Promise.all([
            server_1.prisma.user.count({ where: { role: 'STUDENT' } }),
            server_1.prisma.user.count({ where: { role: 'SECURITY' } }),
            server_1.prisma.incident.count(),
            server_1.prisma.incident.count({ where: { createdAt: { gte: today } } }),
            server_1.prisma.incident.count({ where: { status: { in: ['PENDING', 'ASSIGNED'] } } }),
            server_1.prisma.incident.count({ where: { status: 'RESOLVED' } }),
            server_1.prisma.incident.aggregate({ _avg: { responseTime: true }, where: { responseTime: { not: null } } }),
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
    }
    catch (error) {
        next(error);
    }
});
// Incident trends (last 30 days)
router.get('/trends', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), async (_req, res, next) => {
    try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const incidents = await server_1.prisma.incident.findMany({
            where: { createdAt: { gte: thirtyDaysAgo } },
            select: { createdAt: true, category: true, severity: true, status: true },
            orderBy: { createdAt: 'asc' },
        });
        // Group by date
        const dailyTrends = {};
        const categoryBreakdown = {};
        const severityBreakdown = {};
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
    }
    catch (error) {
        next(error);
    }
});
// Heatmap data
router.get('/heatmap', auth_1.authenticate, (0, auth_1.authorize)('ADMIN', 'SECURITY'), async (req, res, next) => {
    try {
        const { category } = req.query;
        const where = {};
        if (category)
            where.category = category;
        const data = await server_1.prisma.heatmapData.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 500,
        });
        res.json({ success: true, data });
    }
    catch (error) {
        next(error);
    }
});
// Guard performance
router.get('/guard-performance', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), async (_req, res, next) => {
    try {
        const guards = await server_1.prisma.securityGuard.findMany({
            include: {
                user: { select: { firstName: true, lastName: true } },
            },
            orderBy: { totalResolved: 'desc' },
        });
        res.json({ success: true, data: guards });
    }
    catch (error) {
        next(error);
    }
});
// Activity logs
router.get('/activity-logs', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), async (req, res, next) => {
    try {
        const { page = '1', limit = '50' } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const logs = await server_1.prisma.activityLog.findMany({
            skip,
            take: parseInt(limit),
            include: { user: { select: { firstName: true, lastName: true, email: true, role: true } } },
            orderBy: { createdAt: 'desc' },
        });
        res.json({ success: true, data: logs });
    }
    catch (error) {
        next(error);
    }
});
// Monthly report
router.get('/monthly-report', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), async (req, res, next) => {
    try {
        const { month, year } = req.query;
        const m = parseInt(month) || new Date().getMonth() + 1;
        const y = parseInt(year) || new Date().getFullYear();
        const startDate = new Date(y, m - 1, 1);
        const endDate = new Date(y, m, 0, 23, 59, 59);
        const [incidents, resolved, avgResponse] = await Promise.all([
            server_1.prisma.incident.count({ where: { createdAt: { gte: startDate, lte: endDate } } }),
            server_1.prisma.incident.count({ where: { createdAt: { gte: startDate, lte: endDate }, status: 'RESOLVED' } }),
            server_1.prisma.incident.aggregate({
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
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=analytics.routes.js.map