import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

export const errorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File exceeds the 10MB maximum upload limit.',
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`,
    });
  }

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      details: err.details || undefined,
    });
  }

  console.error('❌ [Server Error]:', err);
  let cleanMessage = err.message || 'An unexpected server error occurred.';
  if (typeof cleanMessage === 'string' && cleanMessage.trim().startsWith('{')) {
    try {
      const parsedErr = JSON.parse(cleanMessage);
      if (parsedErr?.error?.message) {
        cleanMessage = `AI Service Error (${parsedErr.error.code || parsedErr.error.status || 500}): ${parsedErr.error.message}`;
      }
    } catch {
      // Keep original message if not valid JSON
    }
  }

  return res.status(err.status || err.statusCode || 500).json({
    success: false,
    message: cleanMessage,
  });
};
