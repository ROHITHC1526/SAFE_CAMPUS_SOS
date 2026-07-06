"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const server_1 = require("../server");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
// Get all buildings
router.get('/', auth_1.authenticate, async (_req, res, next) => {
    try {
        const buildings = await server_1.prisma.campusBuilding.findMany({ orderBy: { name: 'asc' } });
        res.json({ success: true, data: buildings });
    }
    catch (error) {
        next(error);
    }
});
// Get safe zones
router.get('/safe-zones', auth_1.authenticate, async (_req, res, next) => {
    try {
        const zones = await server_1.prisma.safeZone.findMany({
            include: { building: true },
            orderBy: { name: 'asc' },
        });
        res.json({ success: true, data: zones });
    }
    catch (error) {
        next(error);
    }
});
// Create building (Admin)
router.post('/', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), async (req, res, next) => {
    try {
        const { name, code, latitude, longitude, type, floor, description } = req.body;
        if (!name || !code || !latitude || !longitude || !type) {
            throw new errorHandler_1.ApiError(400, 'Name, code, location, and type are required.');
        }
        const building = await server_1.prisma.campusBuilding.create({
            data: { name, code, latitude, longitude, type, floor, description },
        });
        res.status(201).json({ success: true, data: building });
    }
    catch (error) {
        next(error);
    }
});
// Create safe zone (Admin)
router.post('/safe-zones', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), async (req, res, next) => {
    try {
        const { name, latitude, longitude, radius, buildingId, description, hasCamera, hasGuard } = req.body;
        const zone = await server_1.prisma.safeZone.create({
            data: { name, latitude, longitude, radius, buildingId, description, hasCamera, hasGuard },
        });
        res.status(201).json({ success: true, data: zone });
    }
    catch (error) {
        next(error);
    }
});
// Get emergency types
router.get('/emergency-types', auth_1.authenticate, async (_req, res, next) => {
    try {
        const types = await server_1.prisma.emergencyType.findMany({ orderBy: { priority: 'asc' } });
        res.json({ success: true, data: types });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=building.routes.js.map