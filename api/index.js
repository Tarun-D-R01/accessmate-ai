import app from '../backend/src/app.js';
import { connectDB } from '../backend/src/config/db.js';

let dbPromise = null;

export default async (req, res) => {
  if (!dbPromise) {
    dbPromise = connectDB();
  }
  await dbPromise;
  return app(req, res);
};
