import { geminiService } from '../services/gemini.service.js';
import { storageService } from '../services/storage.service.js';

// Lightweight in-memory translation cache keyed by `${targetLanguage}:${text.trim()}`
const translationCache = new Map();

export const translateController = {
  async translate(req, res) {
    try {
      const {
        text,
        targetLanguage,
        sourceLanguage = 'Auto-detect',
        simplifyBeforeTranslate = false,
        tone,
        mode,
      } = req.body;

      const shouldSimplify =
        Boolean(simplifyBeforeTranslate) ||
        mode === 'simplified' ||
        tone === 'plain-language' ||
        tone === 'simple';

      const cacheKey = `${targetLanguage}:${shouldSimplify}:${text.trim()}`;
      if (translationCache.has(cacheKey)) {
        const cachedResult = translationCache.get(cacheKey);

        // Fire-and-forget Activity logging
        storageService
          .logActivity({
            userId: req.user._id,
            type: 'TRANSLATE',
            title: `Translated to ${targetLanguage}`,
            summary:
              cachedResult.translatedText.slice(0, 160) +
              (cachedResult.translatedText.length > 160 ? '...' : ''),
            metadata: {
              targetLanguage,
              detectedSourceLanguage: cachedResult.detectedSourceLanguage,
              simplifyBeforeTranslate: shouldSimplify,
              cached: true,
              aiMode: cachedResult.aiMode,
            },
          })
          .catch(console.error);

        return res.status(200).json({
          success: true,
          cached: true,
          translation: cachedResult,
        });
      }

      const rawResult = await geminiService.translateText({
        text,
        targetLanguage,
        sourceLanguage,
        simplifyBeforeTranslate: shouldSimplify,
        tone,
        mode,
      });

      const { _enrichmentPromise, ...result } = rawResult;

      if (translationCache.size > 500) {
        const oldestKey = translationCache.keys().next().value;
        translationCache.delete(oldestKey);
      }
      translationCache.set(cacheKey, result);

      if (_enrichmentPromise) {
        _enrichmentPromise
          .then((enriched) => {
            if (enriched && enriched.translatedText) {
              translationCache.set(cacheKey, enriched);
            }
          })
          .catch(() => {});
      }

      // Fire-and-forget Activity logging so res.json returns immediately without waiting for MongoDB writes
      storageService
        .logActivity({
          userId: req.user._id,
          type: 'TRANSLATE',
          title: `Translated to ${targetLanguage}`,
          summary:
            result.translatedText.slice(0, 160) +
            (result.translatedText.length > 160 ? '...' : ''),
          metadata: {
            targetLanguage,
            detectedSourceLanguage: result.detectedSourceLanguage,
            simplifyBeforeTranslate: shouldSimplify,
            tone: tone || (shouldSimplify ? 'plain-language' : 'accurate'),
            mode: mode || (shouldSimplify ? 'simplified' : 'standard'),
            cached: false,
            aiMode: result.aiMode,
          },
        })
        .catch(console.error);

      return res.status(200).json({
        success: true,
        cached: false,
        translation: result,
      });
    } catch (error) {
      console.error('❌ [translateController.translate] Error:', error);
      const statusCode = error.statusCode || error.status || 500;
      const rawMessage = error.message || 'Failed to translate text.';
      return res.status(statusCode).json({
        success: false,
        message: rawMessage,
        error: {
          statusCode,
        },
      });
    }
  },
};
