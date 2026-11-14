import app from './app.js';
import { env, isPlaceholderGeminiKey, isPlaceholderElevenLabsKey } from './config/env.js';
import { connectDB } from './config/db.js';

const startServer = async () => {
  await connectDB();

  if (isPlaceholderGeminiKey(env.GEMINI_API_KEY)) {
    console.warn(
      '⚠️  [Gemini AI] GEMINI_API_KEY in backend/.env is currently set to placeholder. Add your real key for live Gemini 3.8 Flash multimodal responses.'
    );
  } else {
    console.log('✅ [Gemini AI] GEMINI_API_KEY configured (Model: gemini-3.8-flash)');
  }

  if (!isPlaceholderElevenLabsKey(env.ELEVENLABS_API_KEY)) {
    console.log(
      '✅ [ElevenLabs] ELEVENLABS_API_KEY configured (STT: scribe_v1, TTS: eleven_flash_v2_5)'
    );
  }

  app.listen(env.PORT, () => {
    console.log(`🚀 [ACCESSMATE AI] Server running on http://localhost:${env.PORT}`);
    console.log(`🩺 [Health Check]  http://localhost:${env.PORT}/api/health`);
  });
};

startServer();
