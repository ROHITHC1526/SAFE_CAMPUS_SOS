"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.prisma = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const client_1 = require("@prisma/client");
const path_1 = __importDefault(require("path"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const incident_routes_1 = __importDefault(require("./routes/incident.routes"));
const location_routes_1 = __importDefault(require("./routes/location.routes"));
const chat_routes_1 = __importDefault(require("./routes/chat.routes"));
const analytics_routes_1 = __importDefault(require("./routes/analytics.routes"));
const building_routes_1 = __importDefault(require("./routes/building.routes"));
const notification_routes_1 = __importDefault(require("./routes/notification.routes"));
const media_routes_1 = __importDefault(require("./routes/media.routes"));
const settings_routes_1 = __importDefault(require("./routes/settings.routes"));
const socket_1 = require("./socket");
const errorHandler_1 = require("./middleware/errorHandler");
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
exports.prisma = new client_1.PrismaClient();
// Socket.IO
exports.io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true,
    },
});
// Initialize Socket handlers
(0, socket_1.initializeSocket)(exports.io);
// Security Middleware
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
const allowedOrigins = [
    "http://localhost:5173",
    "https://safe-campus-sos.vercel.app"
];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin ||
            allowedOrigins.includes(origin) ||
            origin.endsWith(".vercel.app")) {
            callback(null, true);
        }
        else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));
// Rate Limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 100 : 10000,
    message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);
// Body Parsing
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Serve static uploads
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
// API Routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api/users', user_routes_1.default);
app.use('/api/incidents', incident_routes_1.default);
app.use('/api/locations', location_routes_1.default);
app.use('/api/chat', chat_routes_1.default);
app.use('/api/analytics', analytics_routes_1.default);
app.use('/api/buildings', building_routes_1.default);
app.use('/api/notifications', notification_routes_1.default);
app.use('/api/media', media_routes_1.default);
app.use('/api/settings', settings_routes_1.default);
// Health Check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'SafeCampus AI Backend' });
});
// Error Handler
app.use(errorHandler_1.errorHandler);
// Start Server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
    console.log(`🚀 SafeCampus AI Backend running on port ${PORT}`);
    console.log(`📡 Socket.IO ready`);
    console.log(`Server running on port ${PORT}`);
});
exports.default = app;
//# sourceMappingURL=server.js.map