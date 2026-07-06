"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const server_1 = require("../server");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
// Get all users (Admin only)
router.get('/', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), async (req, res, next) => {
    try {
        const { role, search, page = '1', limit = '20' } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const where = {};
        if (role)
            where.role = role;
        if (search) {
            where.OR = [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ];
        }
        const [users, total] = await Promise.all([
            server_1.prisma.user.findMany({
                where,
                skip,
                take: parseInt(limit),
                select: {
                    id: true, email: true, firstName: true, lastName: true,
                    phone: true, avatar: true, role: true, isActive: true,
                    isVerified: true, lastLogin: true, createdAt: true,
                },
                orderBy: { createdAt: 'desc' },
            }),
            server_1.prisma.user.count({ where }),
        ]);
        res.json({ success: true, data: { users, total, page: parseInt(page), limit: parseInt(limit) } });
    }
    catch (error) {
        next(error);
    }
});
// Get user profile
router.get('/profile', auth_1.authenticate, async (req, res, next) => {
    try {
        const user = await server_1.prisma.user.findUnique({
            where: { id: req.user.id },
            include: {
                medicalProfile: true,
                emergencyContacts: true,
                securityGuard: true,
            },
        });
        if (!user)
            throw new errorHandler_1.ApiError(404, 'User not found.');
        const { password: _, ...userData } = user;
        res.json({ success: true, data: userData });
    }
    catch (error) {
        next(error);
    }
});
// Update profile
router.put('/profile', auth_1.authenticate, async (req, res, next) => {
    try {
        const { firstName, lastName, phone, avatar } = req.body;
        const user = await server_1.prisma.user.update({
            where: { id: req.user.id },
            data: { firstName, lastName, phone, avatar },
            select: { id: true, email: true, firstName: true, lastName: true, phone: true, avatar: true, role: true },
        });
        res.json({ success: true, data: user });
    }
    catch (error) {
        next(error);
    }
});
// Medical Profile
router.put('/medical-profile', auth_1.authenticate, async (req, res, next) => {
    try {
        const { bloodGroup, allergies, diseases, medications, emergencyNotes } = req.body;
        const profile = await server_1.prisma.medicalProfile.upsert({
            where: { userId: req.user.id },
            update: { bloodGroup, allergies, diseases, medications, emergencyNotes },
            create: { userId: req.user.id, bloodGroup, allergies, diseases, medications, emergencyNotes },
        });
        res.json({ success: true, data: profile });
    }
    catch (error) {
        next(error);
    }
});
// Emergency Contacts CRUD
router.get('/emergency-contacts', auth_1.authenticate, async (req, res, next) => {
    try {
        const contacts = await server_1.prisma.emergencyContact.findMany({ where: { userId: req.user.id }, orderBy: { isPrimary: 'desc' } });
        res.json({ success: true, data: contacts });
    }
    catch (error) {
        next(error);
    }
});
router.post('/emergency-contacts', auth_1.authenticate, async (req, res, next) => {
    try {
        const { name, phone, email, relation, isPrimary } = req.body;
        if (!name || !phone || !relation)
            throw new errorHandler_1.ApiError(400, 'Name, phone, and relation are required.');
        if (isPrimary) {
            await server_1.prisma.emergencyContact.updateMany({ where: { userId: req.user.id }, data: { isPrimary: false } });
        }
        const contact = await server_1.prisma.emergencyContact.create({
            data: { userId: req.user.id, name, phone, email, relation, isPrimary: isPrimary || false },
        });
        res.status(201).json({ success: true, data: contact });
    }
    catch (error) {
        next(error);
    }
});
router.put('/emergency-contacts/:id', auth_1.authenticate, async (req, res, next) => {
    try {
        const id = req.params.id;
        const { name, phone, email, relation, isPrimary } = req.body;
        const existing = await server_1.prisma.emergencyContact.findFirst({ where: { id, userId: req.user.id } });
        if (!existing)
            throw new errorHandler_1.ApiError(404, 'Contact not found.');
        if (isPrimary) {
            await server_1.prisma.emergencyContact.updateMany({ where: { userId: req.user.id }, data: { isPrimary: false } });
        }
        const contact = await server_1.prisma.emergencyContact.update({
            where: { id },
            data: { name, phone, email, relation, isPrimary },
        });
        res.json({ success: true, data: contact });
    }
    catch (error) {
        next(error);
    }
});
router.delete('/emergency-contacts/:id', auth_1.authenticate, async (req, res, next) => {
    try {
        const id = req.params.id;
        const existing = await server_1.prisma.emergencyContact.findFirst({ where: { id, userId: req.user.id } });
        if (!existing)
            throw new errorHandler_1.ApiError(404, 'Contact not found.');
        await server_1.prisma.emergencyContact.delete({ where: { id } });
        res.json({ success: true, message: 'Contact deleted.' });
    }
    catch (error) {
        next(error);
    }
});
// Admin: Create security guard or admin
router.post('/create', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), async (req, res, next) => {
    try {
        const { email, password, firstName, lastName, phone, role, badgeNumber, specialization, shift, zone } = req.body;
        if (!email || !password || !firstName || !lastName || !role) {
            throw new errorHandler_1.ApiError(400, 'All fields are required.');
        }
        const existing = await server_1.prisma.user.findUnique({ where: { email } });
        if (existing)
            throw new errorHandler_1.ApiError(409, 'User already exists.');
        const hashed = await bcryptjs_1.default.hash(password, 12);
        const user = await server_1.prisma.user.create({
            data: { email, password: hashed, firstName, lastName, phone, role, isVerified: true },
        });
        if (role === 'SECURITY' && badgeNumber) {
            await server_1.prisma.securityGuard.create({
                data: {
                    userId: user.id,
                    badgeNumber,
                    specialization: specialization || [],
                    shift,
                    zone,
                },
            });
        }
        res.status(201).json({ success: true, data: { id: user.id, email: user.email, role: user.role } });
    }
    catch (error) {
        next(error);
    }
});
// Admin: Toggle user active status
router.put('/:id/toggle-active', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), async (req, res, next) => {
    try {
        const id = req.params.id;
        const user = await server_1.prisma.user.findUnique({ where: { id } });
        if (!user)
            throw new errorHandler_1.ApiError(404, 'User not found.');
        const updated = await server_1.prisma.user.update({ where: { id }, data: { isActive: !user.isActive } });
        res.json({ success: true, data: { id: updated.id, isActive: updated.isActive } });
    }
    catch (error) {
        next(error);
    }
});
// Get security guards
router.get('/security-guards', auth_1.authenticate, (0, auth_1.authorize)('ADMIN', 'SECURITY'), async (_req, res, next) => {
    try {
        const guards = await server_1.prisma.securityGuard.findMany({
            include: { user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatar: true } } },
        });
        res.json({ success: true, data: guards });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=user.routes.js.map