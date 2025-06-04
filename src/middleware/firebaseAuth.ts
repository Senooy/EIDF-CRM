import { Request, Response, NextFunction } from 'express';
import { verifyIdToken } from '../lib/firebaseAdmin.js';

export const firebaseAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing Authorization header' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = await verifyIdToken(token);
    (req as any).firebaseUid = decoded.uid;
    next();
  } catch (err) {
    console.error('Invalid Firebase token:', (err as Error).message);
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};
