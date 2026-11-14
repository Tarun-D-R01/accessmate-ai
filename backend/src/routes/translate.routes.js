import { Router } from 'express';
import { translateController } from '../controllers/translate.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { translateSchema } from '../utils/validators.js';

const router = Router();

router.post('/', requireAuth, validateBody(translateSchema), translateController.translate);

export default router;
