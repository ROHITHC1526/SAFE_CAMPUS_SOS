"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const server_1 = require("../server");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Get notifications
router.get('/', auth_1.authenticate, async (req, res, next) => {
    try {
        const page = parseInt(req.query.page || '1');
        const limit = parseInt(req.query.limit || '20');
        const unreadOnly = req.query.unreadOnly;
        const skip = (page - 1) * limit;
        const where = { userId: req.user.id };
        if (unreadOnly === 'true')
            where.isRead = false;
        const [notifications, total, unread] = await Promise.all([
            server_1.prisma.notification.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            server_1.prisma.notification.count({ where }),
            server_1.prisma.notification.count({ where: { userId: req.user.id, isRead: false } }),
        ]);
        res.json({ success: true, data: { notifications, total, unread } });
    }
    catch (error) {
        next(error);
    }
});
// Mark as read
router.put('/:id/read', auth_1.authenticate, async (req, res, next) => {
    try {
        const id = req.params.id;
        await server_1.prisma.notification.update({
            where: { id },
            data: { isRead: true },
        });
        res.json({ success: true });
    }
    catch (error) {
        next(error);
    }
});
// Mark all as read
router.put('/read-all', auth_1.authenticate, async (req, res, next) => {
    try {
        await server_1.prisma.notification.updateMany({
            where: { userId: req.user.id, isRead: false },
            data: { isRead: true },
        });
        res.json({ success: true });
    }
    catch (error) {
        next(error);
    }
});
// Register device token
router.post('/device-token', auth_1.authenticate, async (req, res, next) => {
    try {
        const { token, platform } = req.body;
        await server_1.prisma.deviceToken.upsert({
            where: { token },
            update: { userId: req.user.id, platform },
            create: { userId: req.user.id, token, platform },
        });
        res.json({ success: true });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=notification.routes.js.map