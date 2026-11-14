import { Router } from 'express';
import { documentController } from '../controllers/document.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { uploadDocumentMiddleware } from '../middleware/upload.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { askDocumentSchema } from '../utils/validators.js';

const router = Router();

router.use(requireAuth);

router.get('/', documentController.getDocuments);
router.post(
  '/analyze',
  uploadDocumentMiddleware.single('file'),
  documentController.analyzeDocument
);
router.post('/:id/ask', validateBody(askDocumentSchema), documentController.askDocument);
router.delete('/:id', documentController.deleteDocument);

export default router;
