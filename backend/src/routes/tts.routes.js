import { Router } from 'express';
import { ttsController } from '../controllers/tts.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/', requireAuth, ttsController.synthesize);

export default router;
