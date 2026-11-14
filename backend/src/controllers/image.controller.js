import { geminiService } from '../services/gemini.service.js';
import { storageService } from '../services/storage.service.js';
import { ApiError } from '../utils/ApiError.js';

const normalizeImageMimeType = (mimetype = '', originalname = '') => {
  const lowerMime = String(mimetype).toLowerCase().trim();
  const lowerName = String(originalname).toLowerCase().trim();

  if (lowerMime === 'image/png' || lowerMime === 'image/x-png' || lowerName.endsWith('.png')) {
    return 'image/png';
  }
  if (lowerMime === 'image/webp' || lowerName.endsWith('.webp')) {
    return 'image/webp';
  }
  if (lowerMime === 'image/gif' || lowerName.endsWith('.gif')) {
    return 'image/gif';
  }
  if (
    lowerMime === 'image/jpeg' ||
    lowerMime === 'image/jpg' ||
    lowerName.endsWith('.jpg') ||
    lowerName.endsWith('.jpeg')
  ) {
    return 'image/jpeg';
  }
  return lowerMime || 'image/png';
};

export const imageController = {
  async describeImage(req, res, next) {
    try {
      const file = req.file;
      if (!file || !file.buffer || file.buffer.length === 0) {
        throw new ApiError(
          400,
          'Please upload a valid non-empty image file (JPG, PNG, WEBP, or GIF) to describe.'
        );
      }

      const normalizedMimeType = normalizeImageMimeType(file.mimetype, file.originalname);

      const description = await geminiService.describeImageForAccessibility({
        buffer: file.buffer,
        mimeType: normalizedMimeType,
        fileName: file.originalname || 'uploaded-image.png',
      });

      storageService
        .logActivity({
          userId: req.user._id,
          type: 'IMAGE_DESCRIBE',
          title: `Described Image: ${file.originalname || 'uploaded-image.png'}`,
          summary: description.altText,
          metadata: {
            fileName: file.originalname || 'uploaded-image.png',
            mimeType: normalizedMimeType,
            aiMode: description.aiMode,
          },
        })
        .catch(console.error);

      res.status(200).json({
        success: true,
        fileName: file.originalname || 'uploaded-image.png',
        description,
      });
    } catch (error) {
      next(error);
    }
  },
};
