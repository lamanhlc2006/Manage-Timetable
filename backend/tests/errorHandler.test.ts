import { isValidObjectId, handleControllerError } from '../src/utils/errorHandler';

describe('errorHandler - isValidObjectId', () => {
  it('should return true for valid 24-character hexadecimal ObjectId', () => {
    expect(isValidObjectId('507f1f77bcf86cd799439011')).toBe(true);
    expect(isValidObjectId('60d5ecb8b5c9c824c8b45678')).toBe(true);
  });

  it('should return false for invalid string lengths or non-hex characters', () => {
    expect(isValidObjectId('invalid-id-123')).toBe(false);
    expect(isValidObjectId('123')).toBe(false);
    expect(isValidObjectId('')).toBe(false);
    expect(isValidObjectId('507f1f77bcf86cd79943901z')).toBe(false);
  });
});

describe('errorHandler - handleControllerError', () => {
  let res: any;

  beforeEach(() => {
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  it('should return 400 Bad Request for Mongoose CastError', () => {
    const castError = { name: 'CastError', kind: 'ObjectId' };
    handleControllerError(res, castError, 'Test error');

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Định dạng ID không hợp lệ (Invalid ObjectId format)',
    });
  });

  it('should return 500 Internal Server Error for unhandled generic errors', () => {
    const genericError = new Error('Database connection failed');
    handleControllerError(res, genericError, 'Test generic error');

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Database connection failed',
    });
  });
});
