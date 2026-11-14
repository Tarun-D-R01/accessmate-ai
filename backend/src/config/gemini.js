import { GoogleGenAI } from '@google/genai';
import { env, isPlaceholderGeminiKey } from './env.js';

export const GEMINI_MODEL = 'gemini-3.8-flash';

export const FAST_GEMINI_CONFIG = {
  thinkingConfig: { thinkingBudget: 0 },
  temperature: 0.3,
};

let genAIClient = null;

export const getGeminiClient = () => {
  if (isPlaceholderGeminiKey(env.GEMINI_API_KEY)) {
    return null;
  }
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return genAIClient;
};
