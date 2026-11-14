import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  PORT: process.env.PORT || 5000,
  MONGO_URI: process.env.MONGO_URI || '',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY || '',
  ELEVENLABS_VOICE_ID: process.env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb',
  JWT_SECRET: process.env.JWT_SECRET || 'accessmate_default_jwt_secret_2026',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  NODE_ENV: process.env.NODE_ENV || 'development',
};

export const isPlaceholderMongoUri = (uri) => {
  if (!uri || typeof uri !== 'string') return true;
  return uri.includes('<username>') || uri.includes('<password>') || uri.trim() === '';
};

export const isPlaceholderGeminiKey = (key) => {
  if (!key || typeof key !== 'string') return true;
  return key === 'your_gemini_api_key_here' || key.trim() === '';
};

export const isPlaceholderElevenLabsKey = (key) => {
  if (!key || typeof key !== 'string') return true;
  return key === 'your_elevenlabs_api_key_here' || key.trim() === '';
};
