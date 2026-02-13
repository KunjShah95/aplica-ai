import {
  Injectable,
  UnauthorizedError,
  NotFoundError,
  ConflictError,
} from "../core/errors";
import { v4 as uuidv4 } from "crypto";
import { db } from "../database";
import {
  Team,
  User,
  Invite,
  ApiKey,
  userRolePermissions,
  AuthenticatedUser,
  UserRole,
} from "./types";

@Injectable()
export class TeamService {
  async createTeam(
    owner: AuthenticatedUser,
    data: { name: string; slug?: string },
  ): Promise<Team> {
    const slug =
      data.slug ??
      data.name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");

    const existing = await db.team.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictError("Team slug already exists");
    }

    const team = await db.team.create({
      data: {
        id: crypto.randomUUID(),
        name: data.name,
        slug,
        ownerId: owner.id,
        plan: "free",
        settings: {
          defaultRole: "developer",
          requireApproval: false,
          maxWorkflows: 10,
          allowApiAccess: true,
          auditRetentionDays: 30,
        },
      },
    });

    await db.teamMember.create({
      data: {
        id: crypto.randomUUID(),
        teamId: team.id,
        userId: owner.id,
        role: "owner",
        createdAt: new Date(),
      },
    });

    return team;
  }

  async getTeam(teamId: string): Promise<Team | null> {
    return db.team.findUnique({ where: { id: teamId } });
  }

  async updateTeam(
    teamId: string,
    data: Partial<Team>,
    user: AuthenticatedUser,
  ): Promise<Team> {
    if (!hasPermission(user, "settings:write")) {
      throw new UnauthorizedError("Insufficient permissions");
    }

    return db.team.update({
      where: { id: teamId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  async listTeamMembers(
    teamId: string,
  ): Promise<(User & { role: UserRole })[]> {
    const memberships = await db.teamMember.findMany({
      where: { teamId },
      include: { user: true },
    });

    return memberships.map((m) => ({
      ...m.user,
      role: m.role as UserRole,
    }));
  }

  async addTeamMember(
    teamId: string,
    email: string,
    role: UserRole,
    invitedBy: AuthenticatedUser,
  ): Promise<Invite> {
    if (!hasPermission(invitedBy, "users:write")) {
      throw new UnauthorizedError("Insufficient permissions");
    }

    const invite = await db.invite.create({
      data: {
        id: crypto.randomUUID(),
        teamId,
        email,
        role,
        token: crypto.randomUUID() + crypto.randomUUID(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdBy: invitedBy.id,
      },
    });

    return invite;
  }

  async removeTeamMember(
    teamId: string,
    userId: string,
    removedBy: AuthenticatedUser,
  ): Promise<void> {
    if (!hasPermission(removedBy, "users:write")) {
      throw new UnauthorizedError("Insufficient permissions");
    }

    const membership = await db.teamMember.findFirst({
      where: { teamId, userId },
    });

    if (!membership) {
      throw new NotFoundError("User is not a team member");
    }

    if (membership.role === "owner") {
      throw new ConflictError("Cannot remove team owner");
    }

    await db.teamMember.delete({ where: { id: membership.id } });
  }

  async updateMemberRole(
    teamId: string,
    userId: string,
    newRole: UserRole,
    updatedBy: AuthenticatedUser,
  ): Promise<void> {
    if (!hasPermission(updatedBy, "users:write")) {
      throw new UnauthorizedError("Insufficient permissions");
    }

    const membership = await db.teamMember.findFirst({
      where: { teamId, userId },
    });

    if (!membership) {
      throw new NotFoundError("User is not a team member");
    }

    if (membership.role === "owner" && newRole !== "owner") {
      throw new ConflictError("Cannot demote team owner");
    }

    await db.teamMember.update({
      where: { id: membership.id },
      data: { role: newRole },
    });
  }

  async acceptInvite(token: string, user: AuthenticatedUser): Promise<void> {
    const invite = await db.invite.findUnique({
      where: { token },
    });

    if (!invite) {
      throw new NotFoundError("Invite not found");
    }

    if (invite.expiresAt < new Date()) {
      throw new ConflictError("Invite has expired");
    }

    await db.teamMember.create({
      data: {
        id: crypto.randomUUID(),
        teamId: invite.teamId,
        userId: user.id,
        role: invite.role,
        createdAt: new Date(),
      },
    });

    await db.invite.delete({ where: { id: invite.id } });
  }

  async createApiKey(
    teamId: string,
    name: string,
    permissions: string[],
    user: AuthenticatedUser,
  ): Promise<ApiKey> {
    if (!hasPermission(user, "api:write")) {
      throw new UnauthorizedError("Insufficient permissions");
    }

    const prefix = `sb_${Date.now().toString(36)}`;
    const key = `sk_${prefix}_${crypto.randomBytes(24).toString("hex")}`;
    const keyHash = await hashKey(key);

    const apiKey = await db.apiKey.create({
      data: {
        id: crypto.randomUUID(),
        teamId,
        name,
        keyHash,
        prefix,
        permissions,
        expiresAt: null,
        createdAt: new Date(),
      },
    });

    return { ...apiKey, key };
  }

  async listApiKeys(teamId: string): Promise<Omit<ApiKey, "keyHash">[]> {
    const keys = await db.apiKey.findMany({
      where: { teamId },
      select: {
        id: true,
        teamId: true,
        name: true,
        prefix: true,
        permissions: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    return keys;
  }

  async revokeApiKey(keyId: string, user: AuthenticatedUser): Promise<void> {
    if (!hasPermission(user, "api:write")) {
      throw new UnauthorizedError("Insufficient permissions");
    }

    await db.apiKey.delete({ where: { id: keyId } });
  }

  async getAuditLogs(
    teamId: string,
    options: { userId?: string; action?: string; limit?: number },
  ): Promise<any[]> {
    return db.auditLog.findMany({
      where: {
        teamId,
        ...(options.userId && { userId: options.userId }),
        ...(options.action && { action: options.action }),
      },
      orderBy: { createdAt: "desc" },
      take: options.limit ?? 100,
    });
  }
}

function hashKey(key: string): Promise<string> {
  return Promise.resolve(`hash_${key.substring(0, 16)}`);
}

function hasPermission(user: AuthenticatedUser, permission: string): boolean {
  return user.permissions.includes(permission);
}
