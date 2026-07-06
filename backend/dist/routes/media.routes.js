"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const server_1 = require("../server");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
// Ensure uploads directory exists
const uploadDir = path_1.default.join(__dirname, '../../uploads');
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path_1.default.extname(file.originalname));
    },
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|mp4|webm|mp3|wav|pdf|doc|docx/;
        const extname = allowedTypes.test(path_1.default.extname(file.originalname).toLowerCase());
        if (extname) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type'));
        }
    },
});
const router = (0, express_1.Router)();
// Upload media evidence
router.post('/upload/:incidentId', auth_1.authenticate, upload.single('file'), async (req, res, next) => {
    try {
        if (!req.file)
            throw new errorHandler_1.ApiError(400, 'No file provided.');
        const incidentId = req.params.incidentId;
        const { type = 'PHOTO', caption } = req.body;
        const media = await server_1.prisma.mediaEvidence.create({
            data: {
                incidentId,
                uploadedBy: req.user.id,
                type: type,
                url: `/uploads/${req.file.filename}`,
                fileName: req.file.originalname,
                fileSize: req.file.size,
                mimeType: req.file.mimetype,
                caption,
            },
        });
        res.status(201).json({ success: true, data: media });
    }
    catch (error) {
        next(error);
    }
});
// Get evidence for incident
router.get('/evidence/:incidentId', auth_1.authenticate, async (req, res, next) => {
    try {
        const incidentId = req.params.incidentId;
        const evidence = await server_1.prisma.mediaEvidence.findMany({
            where: { incidentId },
            include: { uploader: { select: { firstName: true, lastName: true } } },
            orderBy: { createdAt: 'desc' },
        });
        res.json({ success: true, data: evidence });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=media.routes.js.map