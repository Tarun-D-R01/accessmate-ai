import { z } from 'zod';

export const SUPPORTED_LANGUAGES = [
  'English',
  'Kannada',
  'Hindi',
  'Tamil',
  'Telugu',
  'Malayalam',
];

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters'),
  email: z.string().trim().email('Please provide a valid email address'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters long')
    .max(128, 'Password is too long'),
  preferredLanguage: z.enum(SUPPORTED_LANGUAGES).optional().default('English'),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Please provide a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const askDocumentSchema = z.object({
  question: z
    .string()
    .trim()
    .min(2, 'Question must be at least 2 characters')
    .max(1000, 'Question must be under 1000 characters'),
});

export const translateSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, 'Text to translate is required')
    .max(15000, 'Text must be under 15,000 characters'),
  targetLanguage: z.enum(SUPPORTED_LANGUAGES, {
    errorMap: () => ({
      message: `Target language must be one of: ${SUPPORTED_LANGUAGES.join(', ')}`,
    }),
  }),
  sourceLanguage: z.string().optional().default('Auto-detect'),
  simplifyBeforeTranslate: z.boolean().optional().default(false),
  tone: z.string().optional(),
  mode: z.string().optional(),
});

export const assistantChatSchema = z
  .object({
    message: z
      .string()
      .trim()
      .max(2000, 'Message must be under 2,000 characters')
      .optional()
      .default(''),
    audioBase64: z.string().optional().nullable(),
    audioMimeType: z.string().optional().nullable(),
    documentId: z.string().optional().nullable(),
    language: z.enum(SUPPORTED_LANGUAGES).optional().default('English'),
    history: z
      .array(
        z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string(),
        })
      )
      .max(12)
      .optional()
      .default([]),
  })
  .refine((data) => Boolean((data.message && data.message.trim()) || data.audioBase64), {
    message: 'Please provide either a text message or recorded voice audio.',
  });
