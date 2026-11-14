import { Router } from 'express';
import { assistantController } from '../controllers/assistant.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import { assistantChatSchema } from '../utils/validators.js';

const router = Router();

router.post('/transcribe', requireAuth, assistantController.transcribe);
router.post('/tts', requireAuth, assistantController.speak);
router.post(
  '/chat',
  requireAuth,
  validateBody(assistantChatSchema),
  assistantController.chat
);

export default router;
