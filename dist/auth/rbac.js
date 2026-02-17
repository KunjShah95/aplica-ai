import { Role } from '../types/prisma-types.js';
import { hasPermission, hasAnyPermission } from './permissions.js';
export function requirePermission(permission) {
    return (req, res, next) => {
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
export function requireAnyPermission(...permissions) {
    return (req, res, next) => {
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
export function requireRole(...roles) {
    return (req, res, next) => {
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
export function requireAdmin(req, res, next) {
    return requireRole(Role.ADMIN)(req, res, next);
}
//# sourceMappingURL=rbac.js.map