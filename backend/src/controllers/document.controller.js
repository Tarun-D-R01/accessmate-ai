import { storageService } from '../services/storage.service.js';
import { geminiService } from '../services/gemini.service.js';
import { ApiError } from '../utils/ApiError.js';

export const documentController = {
  async analyzeDocument(req, res, next) {
    try {
      const file = req.file;
      const pastedText = req.body?.pastedText ? String(req.body.pastedText).trim() : '';
      const customTitle = req.body?.title ? String(req.body.title).trim() : '';

      if (!file && !pastedText) {
        throw new ApiError(
          400,
          'Please upload a document (PDF, JPG, PNG, or TXT) or paste text to analyze.'
        );
      }

      const analysis = await geminiService.analyzeDocument({
        buffer: file?.buffer,
        mimeType: file?.mimetype || 'text/plain',
        fileName: file?.originalname || customTitle || 'Pasted_Text.txt',
        pastedText,
      });

      const savedDoc = await storageService.createDocument({
        userId: req.user._id,
        title: customTitle || analysis.title || file?.originalname || 'Untitled Document',
        fileName: file?.originalname || 'Pasted_Text.txt',
        mimeType: file?.mimetype || 'text/plain',
        fileSize: file?.size || Buffer.byteLength(pastedText, 'utf-8'),
        extractedText: analysis.extractedText,
        summary: analysis.summary,
        simplifiedText: analysis.simplifiedText,
        keyTakeaways: analysis.keyTakeaways || [],
        complexTerms: analysis.complexTerms || [],
        qaHistory: [],
        isSample: false,
      });

      storageService
        .logActivity({
          userId: req.user._id,
          type: 'DOCUMENT_ANALYZE',
          title: `Analyzed Document: ${savedDoc.title}`,
          summary: savedDoc.summary,
          metadata: {
            documentId: savedDoc._id,
            fileName: savedDoc.fileName,
            mimeType: savedDoc.mimeType,
            aiMode: analysis.aiMode,
          },
        })
        .catch(console.error);

      res.status(201).json({
        success: true,
        message: 'Document analyzed and simplified successfully.',
        document: savedDoc,
        aiMode: analysis.aiMode,
      });
    } catch (error) {
      next(error);
    }
  },

  async askDocument(req, res, next) {
    try {
      const { id } = req.params;
      const { question } = req.body;

      const doc = await storageService.getDocumentById(id, req.user._id);
      if (!doc) {
        throw new ApiError(404, 'Document not found.');
      }

      const result = await geminiService.askDocumentQuestion({
        document: doc,
        question,
      });

      const updatedDoc = await storageService.addQaToDocument(id, req.user._id, {
        question,
        answer: result.answer,
      });

      storageService
        .logActivity({
          userId: req.user._id,
          type: 'DOCUMENT_QA',
          title: `Q&A on "${doc.title}"`,
          summary: `Q: ${question} — A: ${result.answer.slice(0, 140)}${
            result.answer.length > 140 ? '...' : ''
          }`,
          metadata: {
            documentId: doc._id,
            question,
            aiMode: result.aiMode,
          },
        })
        .catch(console.error);

      res.status(200).json({
        success: true,
        question,
        answer: result.answer,
        document: updatedDoc,
        aiMode: result.aiMode,
      });
    } catch (error) {
      next(error);
    }
  },

  async getDocuments(req, res, next) {
    try {
      const documents = await storageService.getDocumentsByUser(req.user._id);
      res.status(200).json({
        success: true,
        documents,
      });
    } catch (error) {
      next(error);
    }
  },

  async deleteDocument(req, res, next) {
    try {
      const { id } = req.params;
      const deleted = await storageService.deleteDocument(id, req.user._id);
      if (!deleted) {
        throw new ApiError(404, 'Document not found or already deleted.');
      }

      res.status(200).json({
        success: true,
        message: 'Document removed from your workspace.',
      });
    } catch (error) {
      next(error);
    }
  },
};
