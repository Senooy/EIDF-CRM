import { Request, Response, NextFunction } from 'express';
import { DecodedIdToken } from 'firebase-admin/auth';
import { admin } from '../services/firebase-admin';
import { prisma } from '../db/prisma';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
  organizationId?: string;
  userRole?: string;
}

export async function authenticateUser(
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
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    req.user = decodedToken;
    
    // Get organization from header or query
    const organizationId = req.headers['x-organization-id'] as string || req.query.organizationId as string;
    
    if (organizationId) {
      // Verify user has access to this organization
      const orgUser = await prisma.organizationUser.findFirst({
        where: {
          userId: decodedToken.uid,
          organizationId: organizationId,
        },
      });
      
      if (!orgUser) {
        return res.status(403).json({ error: 'Access denied to this organization' });
      }
      
      req.organizationId = organizationId;
      req.userRole = orgUser.role;
    }
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireOrganization(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.organizationId) {
    return res.status(400).json({ error: 'Organization ID required' });
  }
  next();
}

export function requireRole(...allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userRole || !allowedRoles.includes(req.userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}