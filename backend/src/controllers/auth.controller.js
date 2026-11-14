import bcrypt from 'bcrypt';
import { storageService } from '../services/storage.service.js';
import { getSupabaseClient, isSupabaseConfigured } from '../config/supabase.js';
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

      let supabaseAuthUserId = null;
      if (isSupabaseConfigured()) {
        try {
          const supabase = getSupabaseClient();
          const { data: authData } = await supabase.auth.signUp({
            email: email.toLowerCase().trim(),
            password,
            options: {
              data: {
                name,
                preferredLanguage: preferredLanguage || 'English',
              },
            },
          });
          supabaseAuthUserId = authData?.user?.id || null;
        } catch (supaErr) {
          console.warn('⚠️ [Supabase Auth SignUp] Proceeding with local user record:', supaErr.message);
        }
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storageService.createUser({
        authUserId: supabaseAuthUserId,
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
        authProvider: isSupabaseConfigured() ? 'supabase' : 'jwt',
        user: sanitizeUser(user),
      });
    } catch (error) {
      next(error);
    }
  },

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const normalizedEmail = email.toLowerCase().trim();

      let supabaseVerified = false;
      let supabaseUserObj = null;

      if (isSupabaseConfigured()) {
        try {
          const supabase = getSupabaseClient();
          const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          });
          if (!authErr && authData?.user) {
            supabaseVerified = true;
            supabaseUserObj = authData.user;
          }
        } catch {
          // Fall back to password hash check in storageService
        }
      }

      let user = await storageService.findUserByEmail(normalizedEmail);

      if (!user && supabaseVerified && supabaseUserObj) {
        const hashedPassword = await bcrypt.hash(password, 10);
        user = await storageService.createUser({
          authUserId: supabaseUserObj.id,
          name:
            supabaseUserObj.user_metadata?.name ||
            normalizedEmail.split('@')[0] ||
            'ACCESSMATE User',
          email: normalizedEmail,
          password: hashedPassword,
          preferredLanguage: supabaseUserObj.user_metadata?.preferredLanguage || 'English',
          isDemo: false,
        });
      }

      if (!user) {
        throw new ApiError(401, 'Invalid email or password.');
      }

      if (!supabaseVerified) {
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          throw new ApiError(401, 'Invalid email or password.');
        }
      }

      const token = signToken({ id: user._id, email: user.email });

      res.status(200).json({
        success: true,
        message: 'Logged in successfully.',
        token,
        authProvider: isSupabaseConfigured() ? 'supabase' : 'jwt',
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
