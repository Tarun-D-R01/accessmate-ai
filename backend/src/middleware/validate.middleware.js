import { ApiError } from '../utils/ApiError.js';

export const validateBody = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    const message = firstIssue
      ? `${firstIssue.Message || firstIssue.message}`
      : 'Invalid request data';
    return next(
      new ApiError(
        400,
        message,
        result.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        }))
      )
    );
  }
  req.body = result.data;
  next();
};
