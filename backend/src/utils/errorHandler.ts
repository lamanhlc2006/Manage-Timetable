import { Response } from 'express';
import mongoose from 'mongoose';

/**
 * Validates whether a given string is a valid 24-character hexadecimal MongoDB ObjectId string.
 */
export const isValidObjectId = (id: string): boolean => {
  if (!id || typeof id !== 'string') return false;
  return mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(id);
};

/**
 * Centralized catch block handler for Express controller methods.
 * Intercepts Mongoose CastErrors (invalid ObjectIds) and returns 400 Bad Request
 * instead of unhandled 500 Internal Server Errors.
 */
export const handleControllerError = (
  res: Response,
  error: any,
  logContextMessage = 'Controller error'
): void => {
  console.error(`${logContextMessage}:`, error);

  if (
    error.name === 'CastError' ||
    error instanceof mongoose.Error.CastError ||
    error.kind === 'ObjectId'
  ) {
    res.status(400).json({
      message: 'Định dạng ID không hợp lệ (Invalid ObjectId format)',
    });
    return;
  }

  res.status(500).json({
    message: error.message || 'Lỗi máy chủ nội bộ',
  });
};
