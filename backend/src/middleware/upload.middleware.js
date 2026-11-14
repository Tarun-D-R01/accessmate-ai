import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const storage = multer.memoryStorage();

const ALLOWED_DOC_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'text/plain',
];

const ALLOWED_IMAGE_MIMES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/x-png',
  'image/webp',
  'image/gif',
];

export const uploadDocumentMiddleware = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const isTxtExt = file.originalname && file.originalname.toLowerCase().endsWith('.txt');
    if (ALLOWED_DOC_MIMES.includes(file.mimetype) || isTxtExt) {
      cb(null, true);
    } else {
      cb(
        new ApiError(
          400,
          `Unsupported file format (${file.mimetype || file.originalname}). Please upload a PDF, JPG, PNG, WEBP, or TXT file (max 10MB).`
        )
      );
    }
  },
});

export const uploadImageMiddleware = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const extAllowed =
      file.originalname &&
      /\.(png|jpe?g|webp|gif)$/i.test(file.originalname.trim());
    if (ALLOWED_IMAGE_MIMES.includes(file.mimetype) || extAllowed) {
      cb(null, true);
    } else {
      cb(
        new ApiError(
          400,
          `Unsupported image format (${file.mimetype || file.originalname}). Please upload a JPG, PNG, WEBP, or GIF image (max 10MB).`
        )
      );
    }
  },
});
