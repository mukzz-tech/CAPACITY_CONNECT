import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma.js';
import { AuthUserPayload, UserRole, ApprovalStatus } from '../types/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'capacity_connect_default_secret_key';

export interface AuthenticatedRequest extends Request {
  user?: AuthUserPayload;
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUserPayload;

    // Server-side database check to verify live role and approval status
    const dbUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true, approvalStatus: true },
    });

    if (!dbUser) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    req.user = {
      userId: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
      approvalStatus: dbUser.approvalStatus,
    };

    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
};

export const requireApproved = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Allow ADMIN even if pending? No, admin is approved or seed admin.
  if (req.user.approvalStatus !== ApprovalStatus.APPROVED && req.user.role !== UserRole.ADMIN) {
    res.status(403).json({
      error: 'Forbidden: Your account is pending administrative approval.',
      approvalStatus: req.user.approvalStatus,
    });
    return;
  }

  next();
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Forbidden: Requires one of roles: [${allowedRoles.join(', ')}]`,
      });
      return;
    }

    next();
  };
};

export const authenticateOptional = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUserPayload;

    const dbUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true, approvalStatus: true },
    });

    if (dbUser) {
      req.user = {
        userId: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
        approvalStatus: dbUser.approvalStatus,
      };
    }
    next();
  } catch {
    next();
  }
};
