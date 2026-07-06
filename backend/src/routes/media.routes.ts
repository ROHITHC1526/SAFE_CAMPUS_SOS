import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../server';
import { authenticate, AuthRequest } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|webm|mp3|wav|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    if (extname) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

const router = Router();

// Upload media evidence
router.post('/upload/:incidentId', authenticate, upload.single('file'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) throw new ApiError(400, 'No file provided.');

    const incidentId = req.params.incidentId as string;
    const { type = 'PHOTO', caption } = req.body;

    const media = await prisma.mediaEvidence.create({
      data: {
        incidentId,
        uploadedBy: req.user!.id,
        type: type as any,
        url: `/uploads/${req.file.filename}`,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        caption,
      },
    });

    res.status(201).json({ success: true, data: media });
  } catch (error) {
    next(error);
  }
});

// Get evidence for incident
router.get('/evidence/:incidentId', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const incidentId = req.params.incidentId as string;
    const evidence = await prisma.mediaEvidence.findMany({
      where: { incidentId },
      include: { uploader: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: evidence });
  } catch (error) {
    next(error);
  }
});

export default router;
