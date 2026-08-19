import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

/**
 * Global Express Error Handling Middleware.
 * Catches any unhandled errors passed via next(err) or thrown in async routes.
 */
export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  console.error('Unhandled System Error:', err);

  if (err?.name === 'TokenExpiredError' || err?.name === 'JsonWebTokenError') {
    res.status(401).json({
      message: 'Token đã hết hạn hoặc không hợp lệ (Token expired or invalid)',
    });
    return;
  }

  if (
    err.name === 'CastError' ||
    err instanceof mongoose.Error.CastError ||
    err.kind === 'ObjectId'
  ) {
    res.status(400).json({
      message: 'Định dạng ID không hợp lệ (Invalid ObjectId format)',
    });
    return;
  }

  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    message: err.message || 'Lỗi máy chủ nội bộ',
  });
};
