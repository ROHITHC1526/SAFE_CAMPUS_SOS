"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const server_1 = require("../server");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Get settings
router.get('/', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), async (_req, res, next) => {
    try {
        const settings = await server_1.prisma.settings.findMany({ orderBy: { category: 'asc' } });
        const grouped = settings.reduce((acc, s) => {
            if (!acc[s.category])
                acc[s.category] = {};
            acc[s.category][s.key] = s.value;
            return acc;
        }, {});
        res.json({ success: true, data: grouped });
    }
    catch (error) {
        next(error);
    }
});
// Update setting
router.put('/', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), async (req, res, next) => {
    try {
        const { key, value, category = 'general' } = req.body;
        const setting = await server_1.prisma.settings.upsert({
            where: { key },
            update: { value },
            create: { key, value, category },
        });
        res.json({ success: true, data: setting });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=settings.routes.js.map