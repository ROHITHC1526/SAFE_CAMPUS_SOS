"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const server_1 = require("../server");
const errorHandler_1 = require("../middleware/errorHandler");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Register Student
router.post('/register', async (req, res, next) => {
    try {
        const { email, password, firstName, lastName, phone } = req.body;
        if (!email || !password || !firstName || !lastName) {
            throw new errorHandler_1.ApiError(400, 'All fields are required.');
        }
        const existingUser = await server_1.prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            throw new errorHandler_1.ApiError(409, 'User with this email already exists.');
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 12);
        const user = await server_1.prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                firstName,
                lastName,
                phone,
                role: 'STUDENT',
                isVerified: true,
            },
            select: { id: true, email: true, firstName: true, lastName: true, role: true },
        });
        const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: 604800 });
        await server_1.prisma.activityLog.create({
            data: { userId: user.id, action: 'REGISTER', details: 'New student registration' },
        });
        res.status(201).json({ success: true, data: { user, token } });
    }
    catch (error) {
        next(error);
    }
});
// Login
router.post('/login', async (req, res, next) => {
    try {
        const { email, password, role } = req.body;
        if (!email || !password) {
            throw new errorHandler_1.ApiError(400, 'Email and password are required.');
        }
        const user = await server_1.prisma.user.findUnique({ where: { email } });
        if (!user || !user.isActive) {
            throw new errorHandler_1.ApiError(401, 'Invalid credentials.');
        }
        if (role && user.role !== role) {
            throw new errorHandler_1.ApiError(401, 'Invalid credentials for this role.');
        }
        const isPasswordValid = await bcryptjs_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            throw new errorHandler_1.ApiError(401, 'Invalid credentials.');
        }
        await server_1.prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() },
        });
        const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: 604800 });
        await server_1.prisma.activityLog.create({
            data: { userId: user.id, action: 'LOGIN', details: `Login as ${user.role}` },
        });
        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    phone: user.phone,
                    avatar: user.avatar,
                },
                token,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
// Get Current User
router.get('/me', auth_1.authenticate, async (req, res, next) => {
    try {
        const user = await server_1.prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                avatar: true,
                role: true,
                isVerified: true,
                createdAt: true,
                medicalProfile: true,
                emergencyContacts: true,
                securityGuard: true,
            },
        });
        if (!user) {
            throw new errorHandler_1.ApiError(404, 'User not found.');
        }
        res.json({ success: true, data: user });
    }
    catch (error) {
        next(error);
    }
});
// Change Password
router.put('/change-password', auth_1.authenticate, async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await server_1.prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user)
            throw new errorHandler_1.ApiError(404, 'User not found.');
        const isValid = await bcryptjs_1.default.compare(currentPassword, user.password);
        if (!isValid)
            throw new errorHandler_1.ApiError(400, 'Current password is incorrect.');
        const hashed = await bcryptjs_1.default.hash(newPassword, 12);
        await server_1.prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
        res.json({ success: true, message: 'Password changed successfully.' });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=auth.routes.js.map