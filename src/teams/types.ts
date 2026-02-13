import { z } from "zod";

export const UserRole = {
  OWNER: "owner",
  ADMIN: "admin",
  DEVELOPER: "developer",
  VIEWER: "viewer",
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const userRolePermissions: Record<UserRole, string[]> = {
  owner: [
    "workflows:read",
    "workflows:write",
    "workflows:delete",
    "workflows:execute",
    "users:read",
    "users:write",
    "users:delete",
    "team:read",
    "team:write",
    "team:delete",
    "settings:read",
    "settings:write",
    "billing:read",
    "billing:write",
    "api:read",
    "api:write",
    "audit:read",
  ],
  admin: [
    "workflows:read",
    "workflows:write",
    "workflows:delete",
    "workflows:execute",
    "users:read",
    "users:write",
    "team:read",
    "team:write",
    "settings:read",
    "settings:write",
    "billing:read",
    "api:read",
    "api:write",
    "audit:read",
  ],
  developer: [
    "workflows:read",
    "workflows:write",
    "workflows:execute",
    "team:read",
    "api:read",
    "api:write",
  ],
  viewer: ["workflows:read", "team:read"],
};

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1).max(100),
  avatarUrl: z.string().url().nullable(),
  role: z.enum(["owner", "admin", "developer", "viewer"]),
  teamId: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const TeamSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/),
  avatarUrl: z.string().url().nullable(),
  ownerId: z.string().uuid(),
  plan: z.enum(["free", "pro", "enterprise"]),
  settings: z.object({
    defaultRole: z.enum(["developer", "viewer"]).default("developer"),
    requireApproval: z.boolean().default(false),
    maxWorkflows: z.number().default(10),
    allowApiAccess: z.boolean().default(true),
    auditRetentionDays: z.number().default(30),
  }),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const InviteSchema = z.object({
  id: z.string().uuid(),
  teamId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(["admin", "developer", "viewer"]),
  token: z.string().min(32).max(64),
  expiresAt: z.date(),
  createdBy: z.string().uuid(),
  createdAt: z.date(),
});

export const ApiKeySchema = z.object({
  id: z.string().uuid(),
  teamId: z.string().uuid(),
  name: z.string().min(1).max(100),
  keyHash: z.string().min(64).max(64),
  prefix: z.string().min(4).max(8),
  permissions: z.array(z.string()),
  lastUsedAt: z.date().nullable(),
  expiresAt: z.date().nullable(),
  createdAt: z.date(),
});

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: UserRole;
  teamId: string;
  teamSlug: string;
  permissions: string[];
}

export function hasPermission(
  user: AuthenticatedUser,
  permission: string,
): boolean {
  return user.permissions.includes(permission);
}

export function hasAnyPermission(
  user: AuthenticatedUser,
  permissions: string[],
): boolean {
  return permissions.some((p) => user.permissions.includes(p));
}

export function hasAllPermissions(
  user: AuthenticatedUser,
  permissions: string[],
): boolean {
  return permissions.every((p) => user.permissions.includes(p));
}
