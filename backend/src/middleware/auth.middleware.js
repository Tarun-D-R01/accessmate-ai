import { verifyToken } from '../utils/jwt.utils.js';
import { storageService } from '../services/storage.service.js';
import { getSupabaseClient, isSupabaseConfigured } from '../config/supabase.js';
import { ApiError } from '../utils/ApiError.js';

export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Authentication required. Please log in.');
    }

    const token = authHeader.split(' ')[1];

    // 1. Try verifying our signed backend JWT first (0ms in-memory check)
    try {
      const decoded = verifyToken(token);
      const user = await storageService.findUserById(decoded.id);
      if (user) {
        const { password, ...safeUser } = user;
        req.user = safeUser;
        return next();
      }
    } catch {
      // Token may be a direct Supabase Auth access_token; check below
    }

    // 2. If Supabase is configured, verify direct Supabase Auth JWT token
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data?.user?.email) {
        let user = await storageService.findUserByEmail(data.user.email);
        if (!user) {
          user = await storageService.createUser({
            authUserId: data.user.id,
            name:
              data.user.user_metadata?.name ||
              data.user.email.split('@')[0] ||
              'ACCESSMATE User',
            email: data.user.email,
            password: '',
            preferredLanguage: data.user.user_metadata?.preferredLanguage || 'English',
            isDemo: false,
          });
        }
        const { password, ...safeUser } = user;
        req.user = safeUser;
        return next();
      }
    }

    throw new ApiError(401, 'User session expired or invalid token. Please log in again.');
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    return next(new ApiError(401, 'Invalid or expired authentication token.'));
  }
};
