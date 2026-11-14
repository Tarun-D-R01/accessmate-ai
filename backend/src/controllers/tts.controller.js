import { elevenlabsService } from '../services/elevenlabs.service.js';
import { ApiError } from '../utils/ApiError.js';

export const ttsController = {
  /**
   * POST /api/tts & POST /api/assistant/tts
   * Ultra-low-latency Text-to-Speech using model_id: "eleven_flash_v2_5" (75ms latency)
   * Trims input text to the first 350 characters if longer.
   */
  async synthesize(req, res, next) {
    try {
      const { text, voiceId } = req.body;
      if (!text || !String(text).trim()) {
        throw new ApiError(400, 'Text is required for speech synthesis.');
      }

      const trimmedText = String(text).trim().slice(0, 350);
      const ttsResult = await elevenlabsService.textToSpeech({
        text: trimmedText,
        voiceId,
      });

      if (!ttsResult?.audioBase64) {
        throw new ApiError(503, 'Neural voice synthesis is not configured or unavailable.');
      }

      return res.status(200).json({
        success: true,
        audioBase64: ttsResult.audioBase64,
        mimeType: ttsResult.mimeType,
        model_id: 'eleven_flash_v2_5',
        provider: ttsResult.provider,
      });
    } catch (error) {
      next(error);
    }
  },
};
