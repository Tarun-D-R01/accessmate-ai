import mongoose from 'mongoose';

const complexTermSchema = new mongoose.Schema(
  {
    term: { type: String, required: true },
    simpleExplanation: { type: String, required: true },
  },
  { _id: false }
);

const qaItemSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    answer: { type: String, required: true },
    askedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const documentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      default: 'text/plain',
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    extractedText: {
      type: String,
      required: true,
    },
    summary: {
      type: String,
      required: true,
    },
    simplifiedText: {
      type: String,
      required: true,
    },
    keyTakeaways: {
      type: [String],
      default: [],
    },
    complexTerms: {
      type: [complexTermSchema],
      default: [],
    },
    qaHistory: {
      type: [qaItemSchema],
      default: [],
    },
    isSample: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const DocumentModel = mongoose.model('Document', documentSchema);
