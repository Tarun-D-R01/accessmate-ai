import mongoose from 'mongoose';
import { isMongoConnected } from '../config/db.js';
import { getSupabaseClient, isSupabaseConfigured } from '../config/supabase.js';
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

const mapSupabaseUser = (row) => {
  if (!row) return null;
  return {
    _id: String(row.id),
    authUserId: row.auth_user_id || null,
    name: row.name,
    email: row.email,
    password: row.password,
    preferredLanguage: row.preferred_language || 'English',
    isDemo: Boolean(row.is_demo),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const mapSupabaseDocument = (row) => {
  if (!row) return null;
  return {
    _id: String(row.id),
    userId: String(row.user_id),
    title: row.title,
    fileName: row.file_name,
    mimeType: row.mime_type || 'text/plain',
    fileSize: row.file_size || 0,
    extractedText: row.extracted_text,
    summary: row.summary,
    simplifiedText: row.simplified_text,
    keyTakeaways: Array.isArray(row.key_takeaways) ? row.key_takeaways : [],
    complexTerms: Array.isArray(row.complex_terms) ? row.complex_terms : [],
    qaHistory: Array.isArray(row.qa_history) ? row.qa_history : [],
    isSample: Boolean(row.is_sample),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const mapSupabaseActivity = (row) => {
  if (!row) return null;
  return {
    _id: String(row.id),
    userId: String(row.user_id),
    type: row.type,
    title: row.title,
    summary: row.summary || '',
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

export const storageService = {
  // ---------------- USERS ----------------
  async findUserByEmail(email) {
    const normalized = email.toLowerCase().trim();
    const supabase = getSupabaseClient();

    if (supabase) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', normalized)
        .maybeSingle();
      if (!error && data) {
        const mapped = mapSupabaseUser(data);
        memoryStore.users.set(String(mapped._id), mapped);
        return mapped;
      }
    }

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

    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', String(id))
        .maybeSingle();
      if (!error && data) {
        const mapped = mapSupabaseUser(data);
        memoryStore.users.set(String(mapped._id), mapped);
        return mapped;
      }
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
    const supabase = getSupabaseClient();

    if (supabase) {
      const { data, error } = await supabase
        .from('users')
        .insert({
          auth_user_id: userData.authUserId || null,
          name: userData.name,
          email: normalizedEmail,
          password: userData.password,
          preferred_language: userData.preferredLanguage || 'English',
          is_demo: Boolean(userData.isDemo),
        })
        .select('*')
        .single();

      if (!error && data) {
        const mapped = mapSupabaseUser(data);
        memoryStore.users.set(String(mapped._id), mapped);
        return mapped;
      }
    }

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
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', String(userId))
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        const docs = data.map(mapSupabaseDocument);
        docs.forEach((d) => memoryStore.documents.set(String(d._id), d));
        return docs;
      }
    }

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

    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', String(docId))
        .eq('user_id', String(userId))
        .maybeSingle();

      if (!error && data) {
        const mapped = mapSupabaseDocument(data);
        memoryStore.documents.set(String(mapped._id), mapped);
        return mapped;
      }
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
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('documents')
        .insert({
          user_id: String(docData.userId),
          title: docData.title,
          file_name: docData.fileName,
          mime_type: docData.mimeType || 'text/plain',
          file_size: docData.fileSize || 0,
          extracted_text: docData.extractedText,
          summary: docData.summary,
          simplified_text: docData.simplifiedText,
          key_takeaways: docData.keyTakeaways || [],
          complex_terms: docData.complexTerms || [],
          qa_history: docData.qaHistory || [],
          is_sample: Boolean(docData.isSample),
        })
        .select('*')
        .single();

      if (!error && data) {
        const mapped = mapSupabaseDocument(data);
        memoryStore.documents.set(String(mapped._id), mapped);
        return mapped;
      }
    }

    if (isMongoConnected()) {
      const created = await DocumentModel.create(docData);
      const obj = created.toObject();
      memoryStore.documents.set(String(obj._id), obj);
      return obj;
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

    const supabase = getSupabaseClient();
    if (supabase) {
      const existing = await this.getDocumentById(docId, userId);
      if (existing) {
        const nextHistory = [...(existing.qaHistory || []), entry];
        const { data, error } = await supabase
          .from('documents')
          .update({
            qa_history: nextHistory,
            updated_at: new Date().toISOString(),
          })
          .eq('id', String(docId))
          .eq('user_id', String(userId))
          .select('*')
          .maybeSingle();

        if (!error && data) {
          const mapped = mapSupabaseDocument(data);
          memoryStore.documents.set(String(mapped._id), mapped);
          return mapped;
        }
      }
    }

    if (isMongoConnected()) {
      if (!mongoose.Types.ObjectId.isValid(docId)) return null;
      const updated = await DocumentModel.findOneAndUpdate(
        { _id: docId, userId },
        { $push: { qaHistory: entry } },
        { new: true }
      ).lean();
      if (updated) {
        memoryStore.documents.set(String(updated._id), updated);
      }
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
    memoryStore.documents.delete(String(docId));
    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', String(docId))
        .eq('user_id', String(userId));
      if (!error) return true;
    }

    if (isMongoConnected()) {
      if (!mongoose.Types.ObjectId.isValid(docId)) return false;
      const res = await DocumentModel.findOneAndDelete({ _id: docId, userId });
      return Boolean(res);
    }

    return true;
  },

  // ---------------- ACTIVITIES ----------------
  async logActivity({ userId, type, title, summary = '', metadata = {} }) {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('activities')
        .insert({
          user_id: String(userId),
          type,
          title,
          summary,
          metadata,
        })
        .select('*')
        .maybeSingle();

      if (!error && data) {
        return mapSupabaseActivity(data);
      }
    }

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
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', String(userId))
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!error && Array.isArray(data)) {
        return data.map(mapSupabaseActivity);
      }
    }

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

  getActiveBackendProvider() {
    if (isSupabaseConfigured()) return 'supabase-postgres';
    if (isMongoConnected()) return 'mongodb-atlas';
    return 'in-memory-fallback';
  },
};
