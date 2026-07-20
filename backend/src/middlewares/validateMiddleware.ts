import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

/**
 * Validation middleware to validate request body against a Zod schema.
 * Returns 400 Bad Request if validation fails.
 */
export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const formattedErrors = result.error.issues.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      res.status(400).json({
        message: 'Dữ liệu đầu vào không hợp lệ',
        errors: formattedErrors,
      });
      return;
    }

    req.body = result.data;
    next();
  };
};
