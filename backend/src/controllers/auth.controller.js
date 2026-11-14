import bcrypt from 'bcrypt';
import { storageService } from '../services/storage.service.js';
import { ensureDemoUserAndSeed } from '../services/seed.service.js';
import { signToken } from '../utils/jwt.utils.js';
import { ApiError } from '../utils/ApiError.js';

const sanitizeUser = (user) => {
  const { password, ...rest } = user;
  return rest;
};

export const authController = {
  async register(req, res, next) {
    try {
      const { name, email, password, preferredLanguage } = req.body;

      const existing = await storageService.findUserByEmail(email);
      if (existing) {
        throw new ApiError(409, 'An account with this email already exists. Please log in.');
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storageService.createUser({
        name,
        email,
        password: hashedPassword,
        preferredLanguage,
        isDemo: false,
      });

      const token = signToken({ id: user._id, email: user.email });

      res.status(201).json({
        success: true,
        message: 'Account created successfully.',
        token,
        user: sanitizeUser(user),
      });
    } catch (error) {
      next(error);
    }
  },

  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      const user = await storageService.findUserByEmail(email);
      if (!user) {
        throw new ApiError(401, 'Invalid email or password.');
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        throw new ApiError(401, 'Invalid email or password.');
      }

      const token = signToken({ id: user._id, email: user.email });

      res.status(200).json({
        success: true,
        message: 'Logged in successfully.',
        token,
        user: sanitizeUser(user),
      });
    } catch (error) {
      next(error);
    }
  },

  async demoLogin(req, res, next) {
    try {
      const { user, documents } = await ensureDemoUserAndSeed();
      const token = signToken({ id: user._id, email: user.email });

      res.status(200).json({
        success: true,
        message: 'Welcome to the ACCESSMATE AI Demo Workspace! 2 sample documents have been loaded.',
        token,
        user: sanitizeUser(user),
        seededDocumentsCount: documents.length,
      });
    } catch (error) {
      next(error);
    }
  },

  async getMe(req, res, next) {
    try {
      res.status(200).json({
        success: true,
        user: req.user,
      });
    } catch (error) {
      next(error);
    }
  },
};
