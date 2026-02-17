import { Request, Response, NextFunction } from 'express';
import { Role } from '../types/prisma-types.js';
import { Permission } from './permissions.js';
export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
        username: string;
        role: Role;
    };
}
export declare function requirePermission(permission: Permission): (req: AuthenticatedRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare function requireAnyPermission(...permissions: Permission[]): (req: AuthenticatedRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare function requireRole(...roles: Role[]): (req: AuthenticatedRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=rbac.d.ts.map