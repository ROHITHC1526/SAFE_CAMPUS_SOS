"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const server_1 = require("../server");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Update live location
router.post('/update', auth_1.authenticate, async (req, res, next) => {
    try {
        const { latitude, longitude, accuracy, speed, heading } = req.body;
        await server_1.prisma.liveLocation.create({
            data: { userId: req.user.id, latitude, longitude, accuracy, speed, heading },
        });
        if (req.user.role === 'SECURITY') {
            await server_1.prisma.securityGuard.updateMany({
                where: { userId: req.user.id },
                data: { currentLat: latitude, currentLng: longitude },
            });
        }
        res.json({ success: true });
    }
    catch (error) {
        next(error);
    }
});
// Get user's location history
router.get('/history/:userId', auth_1.authenticate, async (req, res, next) => {
    try {
        const userId = req.params.userId;
        const since = req.query.since;
        const locations = await server_1.prisma.liveLocation.findMany({
            where: {
                userId,
                ...(since && { timestamp: { gte: new Date(since) } }),
            },
            orderBy: { timestamp: 'desc' },
            take: 100,
        });
        res.json({ success: true, data: locations });
    }
    catch (error) {
        next(error);
    }
});
// Get nearby security guards
router.get('/nearby-guards', auth_1.authenticate, async (_req, res, next) => {
    try {
        const guards = await server_1.prisma.securityGuard.findMany({
            where: { status: 'AVAILABLE', currentLat: { not: null } },
            include: { user: { select: { id: true, firstName: true, lastName: true, phone: true } } },
        });
        res.json({ success: true, data: guards });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=location.routes.js.map