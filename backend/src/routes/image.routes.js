import { Router } from 'express';
import { imageController } from '../controllers/image.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { uploadImageMiddleware } from '../middleware/upload.middleware.js';

const router = Router();

router.post(
  '/describe',
  requireAuth,
  uploadImageMiddleware.single('image'),
  imageController.describeImage
);

export default router;
