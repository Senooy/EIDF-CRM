import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

interface AuthRequest extends Request {
  user?: any;
  organizationId?: string;
}

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split('Bearer ')[1];
    
    // In production, verify with Firebase Admin or your auth service
    // For now, simple JWT verification
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'demo-secret') as any;
    
    req.user = decoded;
    
    // Get organization from header
    const organizationId = req.headers['x-organization-id'] as string;
    if (organizationId) {
      req.organizationId = organizationId;
    }
    
    logger.debug('Auth middleware passed', { userId: decoded.uid, organizationId });
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
}