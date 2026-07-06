"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const server_1 = require("../server");
const errorHandler_1 = require("./errorHandler");
const authenticate = async (req, _res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            throw new errorHandler_1.ApiError(401, 'Access denied. No token provided.');
        }
        const token = authHeader.split(' ')[1];
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'secret');
        const user = await server_1.prisma.user.findUnique({
            where: { id: decoded.id },
            select: { id: true, email: true, role: true, firstName: true, lastName: true, isActive: true },
        });
        if (!user || !user.isActive) {
            throw new errorHandler_1.ApiError(401, 'Invalid or expired token.');
        }
        req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
        };
        next();
    }
    catch (error) {
        if (error instanceof errorHandler_1.ApiError) {
            next(error);
        }
        else {
            next(new errorHandler_1.ApiError(401, 'Invalid or expired token.'));
        }
    }
};
exports.authenticate = authenticate;
const authorize = (...roles) => {
    return (req, _res, next) => {
        if (!req.user) {
            return next(new errorHandler_1.ApiError(401, 'Not authenticated.'));
        }
        if (!roles.includes(req.user.role)) {
            return next(new errorHandler_1.ApiError(403, 'Not authorized to access this resource.'));
        }
        next();
    };
};
exports.authorize = authorize;
//# sourceMappingURL=auth.js.map