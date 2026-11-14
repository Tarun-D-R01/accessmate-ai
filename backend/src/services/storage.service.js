import mongoose from 'mongoose';
import { isMongoConnected } from '../config/db.js';
import { User } from '../models/User.model.js';
import { DocumentModel } from '../models/Document.model.js';
import { Activity } from '../models/Activity.model.js';

// In-memory fallback store and read-through cache for ultra-fast 0ms lookups
const memoryStore = {
  users: new Map(),
  documents: new Map(),
  activities: new Map(),
};

const createId = () => new mongoose.Types.ObjectId().toString();

export const storageService = {
  // ---------------- USERS ----------------
  async findUserByEmail(email) {
    const normalized = email.toLowerCase().trim();
    if (isMongoConnected()) {
      const user = await User.findOne({ email: normalized }).lean();
      if (user) {
        memoryStore.users.set(String(user._id), user);
      }
      return user;
    }
    for (const user of memoryStore.users.values()) {
      if (user.email === normalized) return { ...user };
    }
    return null;
  },

  async findUserById(id) {
    if (!id) return null;
    const cached = memoryStore.users.get(String(id));
    if (cached) {
      return { ...cached };
    }
    if (isMongoConnected()) {
      if (!mongoose.Types.ObjectId.isValid(id)) return null;
      const user = await User.findById(id).lean();
      if (user) {
        memoryStore.users.set(String(user._id), user);
      }
      return user;
    }
    return null;
  },

  async createUser(userData) {
    const normalizedEmail = userData.email.toLowerCase().trim();
    if (isMongoConnected()) {
      const created = await User.create({
        ...userData,
        email: normalizedEmail,
      });
      const obj = created.toObject();
      memoryStore.users.set(String(obj._id), obj);
      return obj;
    }
    const now = new Date().toISOString();
    const newUser = {
      _id: createId(),
      name: userData.name,
      email: normalizedEmail,
      password: userData.password,
      preferredLanguage: userData.preferredLanguage || 'English',
      isDemo: Boolean(userData.isDemo),
      createdAt: now,
      updatedAt: now,
    };
    memoryStore.users.set(String(newUser._id), newUser);
    return { ...newUser };
  },

  // ---------------- DOCUMENTS ----------------
  async getDocumentsByUser(userId) {
    if (isMongoConnected()) {
      return await DocumentModel.find({ userId })
        .sort({ createdAt: -1 })
        .lean();
    }
    const docs = [];
    for (const doc of memoryStore.documents.values()) {
      if (String(doc.userId) === String(userId)) {
        docs.push({ ...doc });
      }
    }
    return docs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async getDocumentById(docId, userId) {
    const cached = memoryStore.documents.get(String(docId));
    if (cached && String(cached.userId) === String(userId)) {
      return { ...cached };
    }
    if (isMongoConnected()) {
      if (!mongoose.Types.ObjectId.isValid(docId)) return null;
      const doc = await DocumentModel.findOne({ _id: docId, userId }).lean();
      if (doc) {
        memoryStore.documents.set(String(doc._id), doc);
      }
      return doc;
    }
    return null;
  },

  async createDocument(docData) {
    if (isMongoConnected()) {
      const created = await DocumentModel.create(docData);
      return created.toObject();
    }
    const now = new Date().toISOString();
    const newDoc = {
      _id: createId(),
      userId: String(docData.userId),
      title: docData.title,
      fileName: docData.fileName,
      mimeType: docData.mimeType || 'text/plain',
      fileSize: docData.fileSize || 0,
      extractedText: docData.extractedText,
      summary: docData.summary,
      simplifiedText: docData.simplifiedText,
      keyTakeaways: docData.keyTakeaways || [],
      complexTerms: docData.complexTerms || [],
      qaHistory: docData.qaHistory || [],
      isSample: Boolean(docData.isSample),
      createdAt: now,
      updatedAt: now,
    };
    memoryStore.documents.set(String(newDoc._id), newDoc);
    return { ...newDoc };
  },

  async addQaToDocument(docId, userId, qaEntry) {
    const entry = {
      _id: createId(),
      question: qaEntry.question,
      answer: qaEntry.answer,
      askedAt: new Date().toISOString(),
    };
    if (isMongoConnected()) {
      if (!mongoose.Types.ObjectId.isValid(docId)) return null;
      const updated = await DocumentModel.findOneAndUpdate(
        { _id: docId, userId },
        { $push: { qaHistory: entry } },
        { new: true }
      ).lean();
      return updated;
    }
    const doc = memoryStore.documents.get(String(docId));
    if (!doc || String(doc.userId) !== String(userId)) return null;
    doc.qaHistory = [...(doc.qaHistory || []), entry];
    doc.updatedAt = new Date().toISOString();
    memoryStore.documents.set(String(docId), doc);
    return { ...doc };
  },

  async deleteDocument(docId, userId) {
    if (isMongoConnected()) {
      if (!mongoose.Types.ObjectId.isValid(docId)) return false;
      const res = await DocumentModel.findOneAndDelete({ _id: docId, userId });
      return Boolean(res);
    }
    const doc = memoryStore.documents.get(String(docId));
    if (!doc || String(doc.userId) !== String(userId)) return false;
    memoryStore.documents.delete(String(docId));
    return true;
  },

  // ---------------- ACTIVITIES ----------------
  async logActivity({ userId, type, title, summary = '', metadata = {} }) {
    if (isMongoConnected()) {
      const created = await Activity.create({
        userId,
        type,
        title,
        summary,
        metadata,
      });
      return created.toObject();
    }
    const now = new Date().toISOString();
    const act = {
      _id: createId(),
      userId: String(userId),
      type,
      title,
      summary,
      metadata,
      createdAt: now,
      updatedAt: now,
    };
    memoryStore.activities.set(String(act._id), act);
    return { ...act };
  },

  async getActivitiesByUser(userId, limit = 30) {
    if (isMongoConnected()) {
      return await Activity.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
    }
    const list = [];
    for (const act of memoryStore.activities.values()) {
      if (String(act.userId) === String(userId)) {
        list.push({ ...act });
      }
    }
    return list
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
  },
};
