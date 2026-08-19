import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { IUser } from '../types';

export interface AuthRequest extends Request {
  user?: IUser;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  let token;

  // Check if token exists in cookies
  if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }
  // Fallback to Authorization header
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token provided' });
    return;
  }

  try {
    // Verify token
    if (!process.env.JWT_SECRET) {
      res.status(500).json({ message: 'Server configuration error: JWT_SECRET is not set' });
      return;
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as { id: string };

    // Get user from token and attach to request object
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      res.status(401).json({ message: 'User not found, unauthorized' });
      return;
    }
    if (user.isActive === false) {
      res.status(403).json({ message: 'Tài khoản của bạn đã bị khóa.' });
      return;
    }

    req.user = user;
    next();
  } catch (error: any) {
    console.error('Token verification error:', error?.message || error);
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({ message: 'Token đã hết hạn, vui lòng đăng nhập lại (Token expired)' });
      return;
    }
    if (error.name === 'JsonWebTokenError') {
      res.status(401).json({ message: 'Token không hợp lệ (Invalid token)' });
      return;
    }
    res.status(401).json({ message: 'Không có quyền truy cập, xác thực thất bại (Not authorized, token failed)' });
    return;
  }
};

// Middleware to restrict access to Admins only
export const isAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized, access denied. Admins only' });
  }
};
