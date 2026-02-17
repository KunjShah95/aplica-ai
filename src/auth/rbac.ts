import { Request, Response, NextFunction } from 'express';
import { Role } from '../types/prisma-types.js';
import { Permission, hasPermission, hasAnyPermission } from './permissions.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
    role: Role;
  };
}

export function requirePermission(permission: Permission) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!hasPermission(req.user.role, permission)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Missing required permission: ${permission}`,
      });
    }

    next();
  };
}

export function requireAnyPermission(...permissions: Permission[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!hasAnyPermission(req.user.role, permissions)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Missing any of required permissions: ${permissions.join(', ')}`,
      });
    }

    next();
  };
}

export function requireRole(...roles: Role[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Required role: ${roles.join(' or ')}`,
      });
    }

    next();
  };
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  return requireRole(Role.ADMIN)(req, res, next);
}
