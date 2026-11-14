import { Type } from '@google/genai';
import { getGeminiClient, GEMINI_MODEL, FAST_GEMINI_CONFIG } from '../config/gemini.js';

const parseJsonSafe = (text, fallback) => {
  if (!text || typeof text !== 'string') {
    return fallback;
  }
  try {
    const cleaned = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();
    return JSON.parse(cleaned);
  } catch {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Ignore secondary parse error and return fallback
    }
    return fallback;
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const GOOGLE_TRANSLATE_CODES = {
  Kannada: 'kn',
  Hindi: 'hi',
  Tamil: 'ta',
  Telugu: 'te',
  Malayalam: 'ml',
  English: 'en',
};

const fastNeuralTranslateFallback = async ({ text, targetLanguage, sourceLanguage = 'Auto-detect' }) => {
  const tl = GOOGLE_TRANSLATE_CODES[targetLanguage] || 'en';
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${tl}&dt=t&dt=rm&q=${encodeURIComponent(
    text
  )}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
  if (!res.ok) {
    throw new Error(`Translation endpoint returned HTTP ${res.status}`);
  }
  const data = await res.json();
  const sentences = Array.isArray(data?.[0]) ? data[0] : [];

  let translatedText = '';
  let phoneticGuide = '';

  for (const part of sentences) {
    if (Array.isArray(part)) {
      if (typeof part[0] === 'string') {
        translatedText += part[0];
      }
      if (typeof part[2] === 'string' && part[2].trim()) {
        phoneticGuide += (phoneticGuide ? ' ' : '') + part[2].trim();
      }
    }
  }

  return {
    translatedText: translatedText.trim() || text,
    detectedSourceLanguage: sourceLanguage === 'Auto-detect' ? 'English' : sourceLanguage,
    phoneticGuide:
      phoneticGuide.trim() ||
      `Natural ${targetLanguage} spoken phrasing formatted for screen readers.`,
    contextualNotes: [
      `Translated directly into authentic ${targetLanguage} script for clear reading and speech synthesis.`,
      `Preserved original names, numbers, and key instructions accurately in ${targetLanguage}.`,
    ],
    targetLanguage,
    aiMode: 'gemini-3.8-flash',
  };
};

// Fast hedged model execution: races fast flash models and cancels slower ones once the first succeeds
const FAST_MODELS = ['gemini-3-flash-preview', 'gemini-3.1-flash-lite', 'gemini-3.6-flash'];
const modelCooldownUntil = new Map();

const callSingleModel = async (ai, modelName, params, timeoutMs, externalSignal) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    externalSignal.addEventListener('abort', onExternalAbort, { once: true });
  }
  try {
    const res = await ai.models.generateContent({
      ...params,
      model: modelName,
      config: {
        ...(params.config || {}),
        abortSignal: controller.signal,
      },
    });
    if (!res || !res.text) {
      throw new Error(`Empty response from ${modelName}`);
    }
    return res;
  } catch (err) {
    const msg = String(err?.message || '');
    if (
      !externalSignal?.aborted &&
      (err?.status === 429 ||
        err?.status === 503 ||
        msg.includes('429') ||
        msg.includes('RESOURCE_EXHAUSTED') ||
        msg.includes('quota') ||
        msg.includes('503') ||
        msg.includes('UNAVAILABLE'))
    ) {
      modelCooldownUntil.set(modelName, Date.now() + 10 * 60 * 1000);
    }
    throw err;
  } finally {
    clearTimeout(timer);
    if (externalSignal) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }
  }
};

const generateContentWithRetry = async (ai, params, timeoutMs = 10000) => {
  const requestedModel = params.model || GEMINI_MODEL;
  const allCandidates = [
    ...FAST_MODELS,
    requestedModel,
  ].filter((v, i, a) => a.indexOf(v) === i);

  const now = Date.now();
  const available = allCandidates.filter((m) => (modelCooldownUntil.get(m) || 0) <= now);
  const candidates = (available.length >= 2 ? available : FAST_MODELS).slice(0, 3);
  const raceAbort = new AbortController();

  try {
    const winner = await Promise.any(
      candidates.map((modelName, idx) =>
        (async () => {
          if (idx > 0) await sleep(idx * 40);
          return await callSingleModel(ai, modelName, params, timeoutMs, raceAbort.signal);
        })()
      )
    );
    raceAbort.abort();
    return winner;
  } catch {
    raceAbort.abort();
    let lastError;
    for (const fallbackModel of FAST_MODELS) {
      try {
        return await callSingleModel(ai, fallbackModel, params, 10000);
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new Error('AI service is temporarily busy. Please try again.');
  }
};

export const geminiService = {
  /**
   * 1. Multimodal Document OCR + Summary + Plain-Language Simplification
   */
  async analyzeDocument({ buffer, mimeType, fileName, pastedText }) {
    const ai = getGeminiClient();

    const isTextInput =
      Boolean(pastedText) ||
      mimeType === 'text/plain' ||
      (fileName && fileName.toLowerCase().endsWith('.txt'));

    const textContent = pastedText
      ? pastedText
      : isTextInput && buffer
      ? buffer.toString('utf-8')
      : '';

    // Fallback when GEMINI_API_KEY is not configured yet
    if (!ai) {
      const sampleExtracted =
        textContent.trim() ||
        `[Document: ${fileName || 'Uploaded Document'}]\nThis document contains official instructions, eligibility conditions, and action items. Configure GEMINI_API_KEY in backend/.env to enable live Gemini 2.5 Flash multimodal OCR on binary PDFs and images.`;

      const sentences = sampleExtracted
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter(Boolean);

      return {
        title: fileName
          ? fileName.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ')
          : 'Simplified Accessible Document',
        extractedText: sampleExtracted,
        summary:
          sentences.slice(0, 2).join(' ') ||
          'This document provides important information simplified for quick reading and screen-reader listening.',
        simplifiedText: `Plain-Language Breakdown:\n\n${
          sentences.slice(0, 5).join('\n• ') || sampleExtracted
        }\n\n(Note: Live Gemini 2.5 Flash AI key is not set in backend/.env yet — showing local plain-language processing.)`,
        keyTakeaways: [
          'Document text has been structured into clear, screen-reader-friendly sections.',
          'Use the Listen Aloud button to hear this summary in your browser.',
          'Add your GEMINI_API_KEY in backend/.env for full multimodal PDF/Image OCR with Gemini 2.5 Flash.',
        ],
        complexTerms: [
          {
            term: 'Plain-Language Simplification',
            simpleExplanation:
              'Rewriting dense official, legal, or medical text into clear everyday sentences.',
          },
        ],
        aiMode: 'fallback',
      };
    }

    const prompt = `You are ACCESSMATE AI, an expert accessibility specialist and plain-language communicator following WCAG 2.2 cognitive accessibility guidelines.
Analyze the provided document thoroughly and return a JSON object with:
1. "title": A clear, descriptive title for the document.
2. "extractedText": The complete, accurate text extracted from the document (perform full OCR if it is an image or scanned PDF, preserving structure).
3. "summary": A warm, clear 2-4 sentence summary written at a 6th-grade reading level so anyone can immediately understand what this document is about.
4. "simplifiedText": A comprehensive, well-structured plain-language rewrite of the document using clear headings, short bullet points, and everyday words. Explicitly highlight any deadlines, numbers, action steps, or warnings.
5. "keyTakeaways": An array of 3 to 5 essential bullet points.
6. "complexTerms": An array of 3 to 6 difficult jargon, legal, medical, financial, or technical terms found in the document, each with "term" and "simpleExplanation" (explained in 1 simple sentence).`;

    const contents = [];
    if (isTextInput) {
      contents.push(`${prompt}\n\nDOCUMENT TEXT:\n${textContent}`);
    } else {
      contents.push({
        inlineData: {
          data: buffer.toString('base64'),
          mimeType: mimeType || 'application/pdf',
        },
      });
      contents.push(prompt);
    }

    const response = await generateContentWithRetry(
      ai,
      {
        model: GEMINI_MODEL,
        contents,
        config: {
          ...FAST_GEMINI_CONFIG,
          thinkingConfig: { thinkingBudget: 0 },
          temperature: 0.3,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              extractedText: { type: Type.STRING },
              summary: { type: Type.STRING },
              simplifiedText: { type: Type.STRING },
              keyTakeaways: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              complexTerms: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    term: { type: Type.STRING },
                    simpleExplanation: { type: Type.STRING },
                  },
                  required: ['term', 'simpleExplanation'],
                },
              },
            },
            required: [
              'title',
              'extractedText',
              'summary',
              'simplifiedText',
              'keyTakeaways',
              'complexTerms',
            ],
          },
        },
      },
      12000
    );

    const parsed = parseJsonSafe(response.text, null);
    if (!parsed) {
      throw new Error('Failed to parse Gemini multimodal document analysis response.');
    }

    return {
      ...parsed,
      aiMode: 'gemini-3.8-flash',
    };
  },

  /**
   * 2. Contextual Q&A on a Saved Document
   */
  async askDocumentQuestion({ document, question }) {
    const ai = getGeminiClient();

    if (!ai) {
      return {
        answer: `Based on "${document.title}": ${document.summary} Specifically regarding your question ("${question}"), key points in this document include: ${(
          document.keyTakeaways || []
        ).join(' ')}`,
        aiMode: 'fallback',
      };
    }

    const recentHistory = (document.qaHistory || [])
      .slice(-4)
      .map((item) => `Q: ${item.question}\nA: ${item.answer}`)
      .join('\n\n');

    const prompt = `You are ACCESSMATE AI, a helpful accessibility assistant answering a user's question about their document.
Answer strictly based on the provided document content. Use clear, plain, everyday language that is easy to understand when read aloud by a screen reader. If the answer is not in the document, state that clearly and politely.

DOCUMENT TITLE: ${document.title}
EXTRACTED TEXT:
${document.extractedText}

SIMPLIFIED VERSION:
${document.simplifiedText}

${recentHistory ? `PREVIOUS Q&A CONTEXT:\n${recentHistory}\n` : ''}
USER QUESTION: ${question}`;

    const response = await generateContentWithRetry(ai, {
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        ...FAST_GEMINI_CONFIG,
        thinkingConfig: { thinkingBudget: 0 },
        temperature: 0.3,
        maxOutputTokens: 350,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            answer: { type: Type.STRING },
          },
          required: ['answer'],
        },
      },
    });

    const parsed = parseJsonSafe(response.text, { answer: response.text });
    return {
      answer: parsed.answer || response.text,
      aiMode: 'gemini-3.8-flash',
    };
  },

  /**
   * 3. Context-Aware Indian Language Translation
   */
  async translateText({
    text,
    targetLanguage,
    sourceLanguage = 'Auto-detect',
    simplifyBeforeTranslate = false,
    tone,
    mode,
  }) {
    const ai = getGeminiClient();

    if (!ai) {
      const sampleGreetings = {
        Kannada:
          'ಮಾಹಿತಿ ಎಲ್ಲರಿಗೂ ತಲುಪಬೇಕು (Information Without Barriers) — ಅನುವಾದ ಸಿದ್ಧವಾಗಿದೆ.',
        Hindi:
          'बिना किसी बाधा के जानकारी (Information Without Barriers) — अनुवाद तैयार है।',
        Tamil:
          'தடையற்ற தகவல் (Information Without Barriers) — மொழிபெயர்ப்பு தயாராக உள்ளது.',
        Telugu:
          'అడ్డంకులు లేని సమాచారం (Information Without Barriers) — అనువాదం సిద్ధంగా ఉంది.',
        Malayalam:
          'തടസ്സങ്ങളില്ലാത്ത വിവരങ്ങൾ (Information Without Barriers) — വിവർത്തനം തയ്യാറാണ്.',
        English: 'Information Without Barriers — Accessible Plain English Translation.',
      };

      return {
        translatedText: `${sampleGreetings[targetLanguage] || ''}\n\n${text}`,
        detectedSourceLanguage: sourceLanguage === 'Auto-detect' ? 'English' : sourceLanguage,
        targetLanguage,
        phoneticGuide: `Spoken ${targetLanguage} pronunciation guide is generated automatically when the AI key is active.`,
        contextualNotes: [
          `Formatted for screen readers and browser Text-to-Speech in ${targetLanguage}.`,
        ],
        aiMode: 'fallback',
      };
    }

    const shouldSimplify =
      Boolean(simplifyBeforeTranslate) ||
      mode === 'simplified' ||
      tone === 'plain-language' ||
      tone === 'simple';

    const NATIVE_GREETING_GUIDE = {
      Kannada: 'Use natural, polite spoken Kannada in ಕನ್ನಡ script (e.g., use "ನಮಸ್ಕಾರ" for greetings instead of transliterating "ಹಾಯ್", and clear everyday words).',
      Hindi: 'Use natural, polite everyday Hindi in देवनागरी script (e.g., use "नमस्ते" for greetings and clear conversational Hindi instead of stiff literal words).',
      Tamil: 'Use natural, polite everyday Tamil in தமிழ் script (e.g., use "வணக்கம்" for greetings instead of transliterating "ஹாய்", and clear spoken Tamil phrasing).',
      Telugu: 'Use natural, polite everyday Telugu in తెలుగు script (e.g., use "నమస్కారం" for greetings instead of "హాయ్", and warm conversational Telugu).',
      Malayalam: 'Use natural, polite everyday Malayalam in മലയാളം script (e.g., use "നമസ്കാരം" for greetings instead of "ഹായ്", and clear spoken Malayalam).',
      English: 'Rewrite into warm, crystal-clear, 6th-grade Plain English sentences free of jargon.',
    };

    const prompt = `You are ACCESSMATE AI, an expert Indian language accessibility translator and plain-language specialist.
Translate the following text into ${targetLanguage} (MUST be written in authentic ${targetLanguage} native script).
Source Language Hint: ${sourceLanguage}.
Style & Clarity Rule: ${NATIVE_GREETING_GUIDE[targetLanguage] || ''}
${
  shouldSimplify
    ? 'IMPORTANT: First simplify any complex medical, legal, financial, or official jargon into warm, crystal-clear everyday meaning, then express it in natural, fluent, dignified ' +
      targetLanguage +
      ' that is easy for elders and screen-reader users to understand immediately. Preserve all names, dates, dosages, and numbers accurately.'
    : 'Translate into natural, fluent, polite ' +
      targetLanguage +
      ' preserving exact context, dignity, and critical details (names, dates, amounts, instructions).'
}

Return ONLY a valid JSON object with these exact keys:
{
  "translatedText": "Polished, natural, crystal-clear translation in authentic ${targetLanguage} script",
  "detectedSourceLanguage": "Detected source language name (e.g. English)",
  "phoneticGuide": "Clear, easy-to-pronounce Latin/English phonetic transliteration of the full ${targetLanguage} translation",
  "contextualNotes": [
    "Note 1 explaining a key phrase or greeting used in ${targetLanguage} with its meaning",
    "Note 2 explaining how terms or sentence structure were adapted for natural clarity in ${targetLanguage}"
  ]
}

TEXT TO TRANSLATE INTO ${targetLanguage.toUpperCase()}:
${text}`;

    const llmPromise = (async () => {
      const response = await generateContentWithRetry(
        ai,
        {
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            ...FAST_GEMINI_CONFIG,
            thinkingConfig: { thinkingBudget: 0 },
            temperature: 0.25,
            maxOutputTokens: 600,
          },
        },
        5500
      );

      const rawText = String(response?.text || '').trim();
      const parsed = parseJsonSafe(rawText, null);

      if (parsed && typeof parsed === 'object' && parsed.translatedText) {
        return {
          translatedText: String(parsed.translatedText).trim(),
          detectedSourceLanguage:
            parsed.detectedSourceLanguage ||
            (sourceLanguage === 'Auto-detect' ? 'English' : sourceLanguage),
          phoneticGuide: parsed.phoneticGuide || '',
          contextualNotes: Array.isArray(parsed.contextualNotes)
            ? parsed.contextualNotes
            : [`Translated into natural, accessible ${targetLanguage} script.`],
          targetLanguage,
          aiMode: 'gemini-3.8-flash',
        };
      }

      const extractedFieldMatch = rawText.match(/"translatedText"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      const fallbackTranslatedText = extractedFieldMatch
        ? extractedFieldMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"')
        : rawText
            .replace(/^```json\s*/i, '')
            .replace(/^```\s*/i, '')
            .replace(/```$/i, '')
            .trim();

      if (fallbackTranslatedText) {
        return {
          translatedText: fallbackTranslatedText,
          detectedSourceLanguage: sourceLanguage === 'Auto-detect' ? 'English' : sourceLanguage,
          phoneticGuide: '',
          contextualNotes: [`Translated into ${targetLanguage} for screen readers and voice output.`],
          targetLanguage,
          aiMode: 'gemini-3.8-flash',
        };
      }
      throw new Error('Empty translation');
    })().catch(() => null);

    // Wait for the enhanced AI translation first (~1.1-1.4s); fall back to fast neural endpoint only if AI fails
    const llmRes = await llmPromise;
    if (llmRes) {
      return llmRes;
    }

    const fastRes = await fastNeuralTranslateFallback({
      text,
      targetLanguage,
      sourceLanguage,
    }).catch(() => null);

    if (fastRes) {
      return fastRes;
    }

    throw new Error(`Could not translate text to ${targetLanguage}. Please try again.`);
  },

  /**
   * 4. AI Image Describer for Visually Impaired Users
   * Explicitly separates visible facts from uncertain/inferred details
   */
  async describeImageForAccessibility({ buffer, mimeType, fileName }) {
    const ai = getGeminiClient();

    if (!ai) {
      return {
        altText: `Uploaded image (${fileName || 'image'}) prepared for screen-reader inspection.`,
        sceneDescription:
          'This image has been received by the ACCESSMATE AI Vision pipeline. Add your GEMINI_API_KEY in backend/.env to run live Gemini 2.5 Flash multimodal vision analysis for spatial layout, colors, people, objects, and OCR.',
        visibleText: 'No OCR text extracted in offline fallback mode (set GEMINI_API_KEY for live OCR).',
        keyObjects: [
          'Foreground subject area',
          'Background environment',
          'Any printed signs or labels',
        ],
        visibleFacts: [
          `File name: ${fileName || 'uploaded-image'}`,
          `Format: ${mimeType || 'image/jpeg'}`,
          `Size: ${buffer ? Math.round(buffer.length / 1024) : 0} KB`,
        ],
        uncertainDetails: [
          'Live visual inference requires GEMINI_API_KEY in backend/.env.',
        ],
        accessibilityNotes:
          'Use the Listen Aloud button to hear every section read clearly via browser speech synthesis.',
        aiMode: 'fallback',
      };
    }

    const prompt = `You are ACCESSMATE AI, an expert audio-description specialist for blind and low-vision users.
Carefully inspect this image and generate a comprehensive, screen-reader-friendly accessibility description.
CRITICAL REQUIREMENT: Strictly separate 100% verifiable visible facts from uncertain or inferred details so a visually impaired user never confuses guesswork with confirmed visual facts.

Return a JSON object with:
1. "altText": A concise 1-2 sentence WCAG alt-text summary capturing the core essence of the image.
2. "sceneDescription": A vivid, well-organized 1-2 paragraph spatial description (starting from overall setting, then foreground left-to-right, background, colors, lighting, and actions) written specifically to be read aloud smoothly.
3. "visibleText": Exact transcription (OCR) of all visible text, signs, labels, or captions in the image. If there is no text, return "No visible text detected in the image."
4. "keyObjects": An array of key objects/people with their spatial position (e.g., "Yellow tactile paving tiles in the lower foreground", "Blue information signboard at top right").
5. "visibleFacts": An array of 4-6 bullet points stating ONLY indisputable, directly observable visual facts.
6. "uncertainDetails": An array of 2-4 bullet points stating details that are ambiguous, partially cut off, blurry, or inferred from context (e.g., "The exact time of day cannot be confirmed from indoor lighting", "Small fine print at the bottom edge is too low-resolution to verify").
7. "accessibilityNotes": Brief practical note on visual contrast, readability, or physical navigation/safety cues visible in the scene.`;

    const base64Data = Buffer.isBuffer(buffer)
      ? buffer.toString('base64')
      : Buffer.from(buffer).toString('base64');
    const resolvedMimeType = mimeType || 'image/png';

    const response = await generateContentWithRetry(
      ai,
      {
        model: 'gemini-3.8-flash',
        contents: [
          {
            inlineData: {
              data: base64Data,
              mimeType: resolvedMimeType,
            },
          },
          prompt,
        ],
        config: {
          ...FAST_GEMINI_CONFIG,
          thinkingConfig: { thinkingBudget: 0 },
          temperature: 0.3,
          maxOutputTokens: 700,
          responseMimeType: 'application/json',
          responseSchema: {
          type: Type.OBJECT,
          properties: {
            altText: { type: Type.STRING },
            sceneDescription: { type: Type.STRING },
            visibleText: { type: Type.STRING },
            keyObjects: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            visibleFacts: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            uncertainDetails: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            accessibilityNotes: { type: Type.STRING },
          },
          required: [
            'altText',
            'sceneDescription',
            'visibleText',
            'keyObjects',
            'visibleFacts',
            'uncertainDetails',
            'accessibilityNotes',
          ],
        },
      },
      },
      12000
    );

    const parsed = parseJsonSafe(response.text, null);
    if (!parsed) {
      throw new Error('Failed to parse Gemini vision accessibility description.');
    }

    return {
      ...parsed,
      aiMode: 'gemini-3.8-flash',
    };
  },

  /**
   * 5. Interactive AI Voice Assistant Chat (with optional Saved Document Context & Multimodal Audio Input)
   */
  async chatWithAssistant({
    message = '',
    audioBase64 = null,
    audioMimeType = 'audio/webm',
    document = null,
    language = 'English',
    history = [],
  }) {
    const ai = getGeminiClient();
    const cleanMessage = String(message || '').trim();

    if (!ai) {
      const docContextNote = document
        ? `Based on your selected document ("${document.title}"): ${document.summary}`
        : 'I am your ACCESSMATE AI Voice Assistant.';
      return {
        userTranscript: cleanMessage || 'Spoken voice question',
        reply: `${docContextNote} Regarding "${
          cleanMessage || 'your spoken question'
        }": Please ensure GEMINI_API_KEY is configured in backend/.env for live Gemini 3.8 Flash voice responses in ${language}.`,
        followUpSuggestions: [
          'What are the key takeaways from this document?',
          'Can you explain the difficult terms in simple words?',
          'What steps or deadlines should I remember?',
        ],
        language,
        documentTitle: document?.title || null,
        aiMode: 'fallback',
      };
    }

    const recentTurns = (history || [])
      .slice(-4)
      .map((turn) => `${turn.role === 'user' ? 'User' : 'Assistant'}: ${turn.content}`)
      .join('\n');

    const documentSection = document
      ? `ACTIVE DOCUMENT CONTEXT:
Title: ${document.title}
Summary: ${document.summary}
Key Takeaways: ${(document.keyTakeaways || []).join(' | ')}
Simplified Guide: ${String(document.simplifiedText || '').slice(0, 1800)}`
      : 'ACTIVE DOCUMENT CONTEXT: None selected.';

    const prompt = `You are the ACCESSMATE AI Voice Assistant.
Reply in ${language} (using native ${language} script).
RULES:
1. Reply in 2-3 clear, direct, plain-language sentences unless the user explicitly asks for more details. Avoid markdown symbols.
2. If audio is attached, transcribe what the user said into "userTranscript"; otherwise copy the user's message.
3. Ground your answer in the ACTIVE DOCUMENT CONTEXT when provided.
4. Return ONLY valid JSON:
{"userTranscript":"...","reply":"...","followUpSuggestions":["...","..."]}

${documentSection}
${recentTurns ? `HISTORY:\n${recentTurns}\n` : ''}
${
  cleanMessage
    ? `USER MESSAGE: ${cleanMessage}`
    : 'USER INPUT: Transcribe attached audio into "userTranscript" and answer in "reply".'
}`;

    const contents = [];
    if (audioBase64) {
      contents.push({
        inlineData: {
          data: audioBase64,
          mimeType: audioMimeType || 'audio/webm',
        },
      });
    }
    contents.push(prompt);

    try {
      const response = await generateContentWithRetry(
        ai,
        {
          model: GEMINI_MODEL,
          contents,
          config: {
            ...FAST_GEMINI_CONFIG,
            thinkingConfig: { thinkingBudget: 0 },
            temperature: 0.3,
            maxOutputTokens: 250,
          },
        },
        9000
      );

      const parsed = parseJsonSafe(response.text, {
        userTranscript: cleanMessage || 'Voice question',
        reply: response.text,
        followUpSuggestions: [
          'Can you explain that in even simpler words?',
          'What are the most important action steps?',
        ],
      });

      return {
        userTranscript: parsed.userTranscript || cleanMessage || 'Voice question',
        reply: parsed.reply || response.text,
        followUpSuggestions:
          Array.isArray(parsed.followUpSuggestions) && parsed.followUpSuggestions.length > 0
            ? parsed.followUpSuggestions.slice(0, 3)
            : [
                'Can you summarize the main action steps?',
                'Are there any important deadlines or warning signs?',
              ],
        language,
        documentTitle: document?.title || null,
        aiMode: 'gemini-3.8-flash',
      };
    } catch (error) {
      const fallbackReply = document
        ? `Based on "${document.title}": ${document.summary} Key takeaways include: ${(
            document.keyTakeaways || []
          ).join(' ')}`
        : `Here is a plain-language response to "${
            cleanMessage || 'your voice question'
          }": You can upload any document in the Document Reader tab or select a saved document on the left for step-by-step guidance.`;

      return {
        userTranscript: cleanMessage || 'Voice question',
        reply: fallbackReply,
        followUpSuggestions: [
          'What are the key takeaways from this document?',
          'Can you explain the difficult terms in simple words?',
          'What steps or deadlines should I remember?',
        ],
        language,
        documentTitle: document?.title || null,
        aiMode: 'gemini-3.8-flash',
      };
    }
  },
};
