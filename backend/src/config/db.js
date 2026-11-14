import mongoose from 'mongoose';
import { env, isPlaceholderMongoUri } from './env.js';

let isConnected = false;

export const connectDB = async () => {
  if (isPlaceholderMongoUri(env.MONGO_URI)) {
    console.warn(
      '⚠️  [MongoDB] MONGO_URI is not configured or uses placeholder values in .env. Running with automatic In-Memory Datastore fallback for instant local demo.'
    );
    isConnected = false;
    return false;
  }

  try {
    const conn = await mongoose.connect(env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    isConnected = true;
    console.log(`✅ [MongoDB] Connected successfully: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.warn(
      `⚠️  [MongoDB] Connection failed (${error.message}). Falling back to In-Memory Datastore so the app remains fully usable.`
    );
    isConnected = false;
    return false;
  }
};

export const isMongoConnected = () => {
  return isConnected && mongoose.connection.readyState === 1;
};
