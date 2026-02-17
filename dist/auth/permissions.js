import { Role } from '../types/prisma-types.js';
export var Permission;
(function (Permission) {
    Permission["USER_READ"] = "user:read";
    Permission["USER_WRITE"] = "user:write";
    Permission["USER_ADMIN"] = "user:admin";
    Permission["CONVERSATION_READ"] = "conversation:read";
    Permission["CONVERSATION_WRITE"] = "conversation:write";
    Permission["CONVERSATION_DELETE"] = "conversation:delete";
    Permission["MEMORY_READ"] = "memory:read";
    Permission["MEMORY_WRITE"] = "memory:write";
    Permission["MEMORY_DELETE"] = "memory:delete";
    Permission["WORKFLOW_READ"] = "workflow:read";
    Permission["WORKFLOW_WRITE"] = "workflow:write";
    Permission["WORKFLOW_DELETE"] = "workflow:delete";
    Permission["WORKFLOW_EXECUTE"] = "workflow:execute";
    Permission["TOOL_EXECUTE"] = "tool:execute";
    Permission["SHELL_EXECUTE"] = "shell:execute";
    Permission["FILESYSTEM_READ"] = "filesystem:read";
    Permission["FILESYSTEM_WRITE"] = "filesystem:write";
    Permission["AUDIT_READ"] = "audit:read";
    Permission["AUDIT_EXPORT"] = "audit:export";
    Permission["TEAM_READ"] = "team:read";
    Permission["TEAM_WRITE"] = "team:write";
    Permission["TEAM_DELETE"] = "team:delete";
    Permission["API_KEY_READ"] = "api_key:read";
    Permission["API_KEY_WRITE"] = "api_key:write";
    Permission["ADMIN_ALL"] = "admin:*";
})(Permission || (Permission = {}));
export const ROLE_PERMISSIONS = {
    [Role.ADMIN]: [
        Permission.USER_READ,
        Permission.USER_WRITE,
        Permission.USER_ADMIN,
        Permission.CONVERSATION_READ,
        Permission.CONVERSATION_WRITE,
        Permission.CONVERSATION_DELETE,
        Permission.MEMORY_READ,
        Permission.MEMORY_WRITE,
        Permission.MEMORY_DELETE,
        Permission.WORKFLOW_READ,
        Permission.WORKFLOW_WRITE,
        Permission.WORKFLOW_DELETE,
        Permission.WORKFLOW_EXECUTE,
        Permission.TOOL_EXECUTE,
        Permission.SHELL_EXECUTE,
        Permission.FILESYSTEM_READ,
        Permission.FILESYSTEM_WRITE,
        Permission.AUDIT_READ,
        Permission.AUDIT_EXPORT,
        Permission.TEAM_READ,
        Permission.TEAM_WRITE,
        Permission.TEAM_DELETE,
        Permission.API_KEY_READ,
        Permission.API_KEY_WRITE,
        Permission.ADMIN_ALL,
    ],
    [Role.USER]: [
        Permission.CONVERSATION_READ,
        Permission.CONVERSATION_WRITE,
        Permission.MEMORY_READ,
        Permission.MEMORY_WRITE,
        Permission.WORKFLOW_READ,
        Permission.WORKFLOW_WRITE,
        Permission.WORKFLOW_EXECUTE,
        Permission.TOOL_EXECUTE,
        Permission.SHELL_EXECUTE,
        Permission.FILESYSTEM_READ,
        Permission.FILESYSTEM_WRITE,
        Permission.API_KEY_READ,
        Permission.API_KEY_WRITE,
    ],
    [Role.GUEST]: [Permission.CONVERSATION_READ, Permission.MEMORY_READ, Permission.WORKFLOW_READ],
};
export function hasPermission(role, permission) {
    const permissions = ROLE_PERMISSIONS[role];
    if (!permissions) {
        return false;
    }
    if (permissions.includes(Permission.ADMIN_ALL)) {
        return true;
    }
    if (permissions.includes(permission)) {
        return true;
    }
    const permissionPrefix = permission.split(':')[0];
    return permissions.some((p) => p === `${permissionPrefix}:*`);
}
export function hasAnyPermission(role, permissions) {
    return permissions.some((p) => hasPermission(role, p));
}
export function hasAllPermissions(role, permissions) {
    return permissions.every((p) => hasPermission(role, p));
}
export function getPermissions(role) {
    return ROLE_PERMISSIONS[role] || [];
}
//# sourceMappingURL=permissions.js.map