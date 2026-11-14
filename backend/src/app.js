import express from 'express';
import cors from 'cors';
import { env, isPlaceholderGeminiKey, isPlaceholderElevenLabsKey } from './config/env.js';
import { isMongoConnected } from './config/db.js';
import { isSupabaseConfigured } from './config/supabase.js';
import { storageService } from './services/storage.service.js';
import authRoutes from './routes/auth.routes.js';
import documentRoutes from './routes/document.routes.js';
import translateRoutes from './routes/translate.routes.js';
import imageRoutes from './routes/image.routes.js';
import activityRoutes from './routes/activity.routes.js';
import assistantRoutes from './routes/assistant.routes.js';
import ttsRoutes from './routes/tts.routes.js';
import { errorHandler } from './middleware/error.middleware.js';

const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests from configured frontend, localhost dev ports, and Render/Vercel previews
      if (!origin || origin.startsWith('http://localhost') || origin === env.FRONTEND_URL || origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'ACCESSMATE AI Backend API',
    tagline: 'Information Without Barriers',
    database: storageService.getActiveBackendProvider(),
    supabaseConfigured: isSupabaseConfigured(),
    mongoConnected: isMongoConnected(),
    geminiConfigured: !isPlaceholderGeminiKey(env.GEMINI_API_KEY),
    elevenLabsConfigured: !isPlaceholderElevenLabsKey(env.ELEVENLABS_API_KEY),
    model: 'gemini-3.8-flash',
    timestamp: new Date().toISOString(),
  });
});

// Core API routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/translate', translateRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/tts', ttsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found on ACCESSMATE AI API.`,
  });
});

// Global error handler
app.use(errorHandler);

export default app;
