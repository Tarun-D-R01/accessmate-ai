import { verifyToken } from '../utils/jwt.utils.js';
import { storageService } from '../services/storage.service.js';
import { ApiError } from '../utils/ApiError.js';

export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Authentication required. Please log in.');
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    const user = await storageService.findUserById(decoded.id);
    if (!user) {
      throw new ApiError(401, 'User session expired or no longer exists. Please log in again.');
    }

    const { password, ...safeUser } = user;
    req.user = safeUser;
    next();
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    return next(new ApiError(401, 'Invalid or expired authentication token.'));
  }
};
