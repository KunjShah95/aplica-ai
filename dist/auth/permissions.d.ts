import { Role } from '../types/prisma-types.js';
export declare enum Permission {
    USER_READ = "user:read",
    USER_WRITE = "user:write",
    USER_ADMIN = "user:admin",
    CONVERSATION_READ = "conversation:read",
    CONVERSATION_WRITE = "conversation:write",
    CONVERSATION_DELETE = "conversation:delete",
    MEMORY_READ = "memory:read",
    MEMORY_WRITE = "memory:write",
    MEMORY_DELETE = "memory:delete",
    WORKFLOW_READ = "workflow:read",
    WORKFLOW_WRITE = "workflow:write",
    WORKFLOW_DELETE = "workflow:delete",
    WORKFLOW_EXECUTE = "workflow:execute",
    TOOL_EXECUTE = "tool:execute",
    SHELL_EXECUTE = "shell:execute",
    FILESYSTEM_READ = "filesystem:read",
    FILESYSTEM_WRITE = "filesystem:write",
    AUDIT_READ = "audit:read",
    AUDIT_EXPORT = "audit:export",
    TEAM_READ = "team:read",
    TEAM_WRITE = "team:write",
    TEAM_DELETE = "team:delete",
    API_KEY_READ = "api_key:read",
    API_KEY_WRITE = "api_key:write",
    ADMIN_ALL = "admin:*"
}
export declare const ROLE_PERMISSIONS: Record<Role, Permission[]>;
export declare function hasPermission(role: Role, permission: Permission): boolean;
export declare function hasAnyPermission(role: Role, permissions: Permission[]): boolean;
export declare function hasAllPermissions(role: Role, permissions: Permission[]): boolean;
export declare function getPermissions(role: Role): Permission[];
//# sourceMappingURL=permissions.d.ts.map