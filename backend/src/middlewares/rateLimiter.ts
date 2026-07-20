import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for Auth endpoints (/api/auth/*)
 * Max 10 requests per 1 minute
 */
export const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Quá nhiều yêu cầu xác thực. Vui lòng thử lại sau 1 phút.',
  },
});

/**
 * Rate limiter for Schedule endpoints (/api/schedules/*)
 * Max 100 requests per 1 minute
 */
export const scheduleLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Quá nhiều yêu cầu đến hệ thống lịch trình. Vui lòng thử lại sau 1 phút.',
  },
});
