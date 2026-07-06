"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const server_1 = require("../server");
const server_2 = require("../server");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Get chat messages for incident
router.get('/:incidentId', auth_1.authenticate, async (req, res, next) => {
    try {
        const incidentId = req.params.incidentId;
        const page = parseInt(req.query.page || '1');
        const limit = parseInt(req.query.limit || '50');
        const skip = (page - 1) * limit;
        const messages = await server_1.prisma.chatMessage.findMany({
            where: { incidentId },
            skip,
            take: limit,
            include: { sender: { select: { id: true, firstName: true, lastName: true, avatar: true, role: true } } },
            orderBy: { createdAt: 'asc' },
        });
        // Mark as read
        await server_1.prisma.chatMessage.updateMany({
            where: { incidentId, senderId: { not: req.user.id }, isRead: false },
            data: { isRead: true },
        });
        res.json({ success: true, data: messages });
    }
    catch (error) {
        next(error);
    }
});
// Send message
router.post('/:incidentId', auth_1.authenticate, async (req, res, next) => {
    try {
        const incidentId = req.params.incidentId;
        const { content, type = 'text', fileUrl } = req.body;
        const message = await server_1.prisma.chatMessage.create({
            data: { incidentId, senderId: req.user.id, content, type, fileUrl },
            include: { sender: { select: { id: true, firstName: true, lastName: true, avatar: true, role: true } } },
        });
        server_2.io.to(`incident_${incidentId}`).emit('chat:message', message);
        res.status(201).json({ success: true, data: message });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=chat.routes.js.map