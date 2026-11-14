import { geminiService } from '../services/gemini.service.js';
import { elevenlabsService } from '../services/elevenlabs.service.js';
import { storageService } from '../services/storage.service.js';
import { ttsController } from './tts.controller.js';
import { ApiError } from '../utils/ApiError.js';

export const assistantController = {
  /**
   * POST /api/assistant/transcribe
   * Fast microphone Speech-to-Text
   */
  async transcribe(req, res, next) {
    try {
      const { audioBase64, audioMimeType = 'audio/webm', language = 'English' } = req.body;
      if (!audioBase64) {
        throw new ApiError(400, 'No audioBase64 payload provided for transcription.');
      }

      try {
        const sttResult = await elevenlabsService.speechToText({
          audioBase64,
          mimeType: audioMimeType,
          language,
        });
        if (sttResult?.text) {
          return res.status(200).json({
            success: true,
            text: sttResult.text,
            provider: sttResult.provider,
          });
        }
      } catch (sttErr) {
        console.warn('⚠️ [STT] Falling back to multimodal audio transcription:', sttErr.message);
      }

      const fallbackChat = await geminiService.chatWithAssistant({
        message: '',
        audioBase64,
        audioMimeType,
        document: null,
        language,
        history: [],
      });

      return res.status(200).json({
        success: true,
        text: fallbackChat.userTranscript || '',
        provider: 'gemini-3.8-flash-audio',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/assistant/tts
   * Delegates to ultra-low-latency ttsController.synthesize (eleven_flash_v2_5)
   */
  async speak(req, res, next) {
    return ttsController.synthesize(req, res, next);
  },

  /**
   * POST /api/assistant/chat
   * Fast Voice Assistant turn: returns AI text reply immediately without blocking on TTS or DB logging
   */
  async chat(req, res, next) {
    try {
      const {
        message = '',
        audioBase64 = null,
        audioMimeType = 'audio/webm',
        documentId,
        language = 'English',
        history = [],
      } = req.body;

      let document = null;
      if (documentId) {
        document = await storageService.getDocumentById(documentId, req.user._id);
      }

      let resolvedMessage = String(message || '').trim();
      let sttProvider = null;

      // 1. If microphone audio was sent without text, transcribe via STT or pass directly to multimodal model
      if (!resolvedMessage && audioBase64 && elevenlabsService.isConfigured()) {
        try {
          const stt = await elevenlabsService.speechToText({
            audioBase64,
            mimeType: audioMimeType,
            language,
          });
          if (stt?.text) {
            resolvedMessage = stt.text;
            sttProvider = stt.provider;
          }
        } catch (sttErr) {
          console.warn('⚠️ [STT] Falling back to multimodal audio:', sttErr.message);
        }
      }

      // 2. Generate grounded accessibility answer via gemini-3.8-flash (thinkingBudget: 0, maxOutputTokens: 250)
      const result = await geminiService.chatWithAssistant({
        message: resolvedMessage,
        audioBase64: resolvedMessage ? null : audioBase64,
        audioMimeType,
        document,
        language,
        history,
      });

      const questionLabel = result.userTranscript || resolvedMessage || 'Voice input';

      // 3. Fire-and-forget Activity logging so res.json returns immediately without waiting for MongoDB writes
      storageService
        .logActivity({
          userId: req.user._id,
          type: 'ASSISTANT_CHAT',
          title: document
            ? `Voice Assistant on "${document.title}"`
            : `Voice Assistant (${language})`,
          summary: `Q: ${questionLabel.slice(0, 60)}${
            questionLabel.length > 60 ? '...' : ''
          } — A: ${result.reply.slice(0, 120)}${result.reply.length > 120 ? '...' : ''}`,
          metadata: {
            documentId: document?._id || null,
            documentTitle: document?.title || null,
            language,
            aiMode: result.aiMode,
            sttProvider,
          },
        })
        .catch(console.error);

      return res.status(200).json({
        success: true,
        ...result,
        userTranscript: questionLabel,
        sttProvider,
      });
    } catch (error) {
      next(error);
    }
  },
};
