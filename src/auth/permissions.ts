import { Role } from '../types/prisma-types.js';

export enum Permission {
  USER_READ = 'user:read',
  USER_WRITE = 'user:write',
  USER_ADMIN = 'user:admin',

  CONVERSATION_READ = 'conversation:read',
  CONVERSATION_WRITE = 'conversation:write',
  CONVERSATION_DELETE = 'conversation:delete',

  MEMORY_READ = 'memory:read',
  MEMORY_WRITE = 'memory:write',
  MEMORY_DELETE = 'memory:delete',

  WORKFLOW_READ = 'workflow:read',
  WORKFLOW_WRITE = 'workflow:write',
  WORKFLOW_DELETE = 'workflow:delete',
  WORKFLOW_EXECUTE = 'workflow:execute',

  TOOL_EXECUTE = 'tool:execute',
  SHELL_EXECUTE = 'shell:execute',
  FILESYSTEM_READ = 'filesystem:read',
  FILESYSTEM_WRITE = 'filesystem:write',

  AUDIT_READ = 'audit:read',
  AUDIT_EXPORT = 'audit:export',

  TEAM_READ = 'team:read',
  TEAM_WRITE = 'team:write',
  TEAM_DELETE = 'team:delete',

  API_KEY_READ = 'api_key:read',
  API_KEY_WRITE = 'api_key:write',

  ADMIN_ALL = 'admin:*',
}

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
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

export function hasPermission(role: Role, permission: Permission): boolean {
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

export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

export function getPermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}
