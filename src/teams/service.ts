import { Injectable, UnauthorizedError, NotFoundError, ConflictError } from '../core/errors';
import { randomBytes } from 'crypto';
import { db } from '../db/index.js';
import { Team, TeamMember, TeamRole, User, ApiKey, AuditLog, Workspace } from '@prisma/client';
import { AuthenticatedUser } from './types';

@Injectable()
export class TeamService {
  async createTeam(owner: AuthenticatedUser, data: { name: string; slug?: string }): Promise<Team> {
    const slug =
      data.slug ??
      data.name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

    const existing = await db.team.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictError('Team slug already exists');
    }

    const team = await db.team.create({
      data: {
        name: data.name,
        slug,
        ownerId: owner.id,
      },
    });

    await db.teamMember.create({
      data: {
        teamId: team.id,
        userId: owner.id,
        role: TeamRole.OWNER,
      },
    });

    return team;
  }

  async getTeam(teamId: string): Promise<Team | null> {
    return db.team.findUnique({ where: { id: teamId } });
  }

  async updateTeam(
    teamId: string,
    data: Partial<Omit<Team, 'id' | 'createdAt'>>,
    user: AuthenticatedUser
  ): Promise<Team> {
    if (!hasPermission(user, 'settings:write')) {
      throw new UnauthorizedError('Insufficient permissions');
    }

    return db.team.update({
      where: { id: teamId },
      data: {
        name: data.name,
        description: data.description,
        avatar: data.avatar,
        updatedAt: new Date(),
      },
    });
  }

  async deleteTeam(teamId: string, user: AuthenticatedUser): Promise<void> {
    if (!hasPermission(user, 'settings:write')) {
      throw new UnauthorizedError('Insufficient permissions');
    }

    await db.team.delete({ where: { id: teamId } });
  }

  async listUserTeams(userId: string): Promise<Team[]> {
    const memberships = await db.teamMember.findMany({
      where: { userId },
      include: { team: true },
    });

    return memberships.map((m) => m.team);
  }

  async listTeamMembers(teamId: string): Promise<(User & { teamRole: TeamRole })[]> {
    const memberships = await db.teamMember.findMany({
      where: { teamId },
      include: { user: true },
    });

    return memberships.map((m) => ({
      ...m.user,
      teamRole: m.role,
    }));
  }

  async addTeamMember(
    teamId: string,
    userId: string,
    role: TeamRole,
    invitedBy: AuthenticatedUser
  ): Promise<TeamMember> {
    if (!hasPermission(invitedBy, 'users:write')) {
      throw new UnauthorizedError('Insufficient permissions');
    }

    const member = await db.teamMember.create({
      data: {
        teamId,
        userId,
        role,
      },
    });

    return member;
  }

  async inviteMember(
    teamId: string,
    email: string,
    role: TeamRole,
    invitedBy: AuthenticatedUser
  ): Promise<void> {
    if (!hasPermission(invitedBy, 'users:write')) {
      throw new UnauthorizedError('Insufficient permissions');
    }

    // Find user by email
    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    await this.addTeamMember(teamId, user.id, role, invitedBy);
  }

  async removeTeamMember(
    teamId: string,
    userId: string,
    removedBy: AuthenticatedUser
  ): Promise<void> {
    if (!hasPermission(removedBy, 'users:write')) {
      throw new UnauthorizedError('Insufficient permissions');
    }

    const membership = await db.teamMember.findFirst({
      where: { teamId, userId },
    });

    if (!membership) {
      throw new NotFoundError('User is not a team member');
    }

    if (membership.role === TeamRole.OWNER) {
      throw new ConflictError('Cannot remove team owner');
    }

    await db.teamMember.delete({ where: { id: membership.id } });
  }

  async updateMemberRole(
    teamId: string,
    userId: string,
    newRole: TeamRole,
    updatedBy: AuthenticatedUser
  ): Promise<void> {
    if (!hasPermission(updatedBy, 'users:write')) {
      throw new UnauthorizedError('Insufficient permissions');
    }

    const membership = await db.teamMember.findFirst({
      where: { teamId, userId },
    });

    if (!membership) {
      throw new NotFoundError('User is not a team member');
    }

    if (membership.role === TeamRole.OWNER && newRole !== TeamRole.OWNER) {
      throw new ConflictError('Cannot demote team owner');
    }

    await db.teamMember.update({
      where: { id: membership.id },
      data: { role: newRole },
    });
  }

  // Workspace methods
  async listWorkspaces(teamId: string): Promise<Workspace[]> {
    return db.workspace.findMany({ where: { teamId } });
  }

  async createWorkspace(
    teamId: string,
    data: { name: string; description?: string }
  ): Promise<Workspace> {
    return db.workspace.create({
      data: {
        teamId,
        name: data.name,
        description: data.description,
      },
    });
  }

  async getWorkspace(workspaceId: string): Promise<Workspace | null> {
    return db.workspace.findUnique({ where: { id: workspaceId } });
  }

  async updateWorkspace(
    workspaceId: string,
    data: { name?: string; description?: string | null }
  ): Promise<Workspace> {
    return db.workspace.update({
      where: { id: workspaceId },
      data: {
        name: data.name,
        description: data.description,
        updatedAt: new Date(),
      },
    });
  }

  async deleteWorkspace(workspaceId: string): Promise<void> {
    await db.workspace.delete({ where: { id: workspaceId } });
  }

  async createApiKey(
    userId: string,
    name: string,
    scopes: string[],
    user: AuthenticatedUser
  ): Promise<ApiKey & { key: string }> {
    if (!hasPermission(user, 'api:write')) {
      throw new UnauthorizedError('Insufficient permissions');
    }

    const prefix = `sb_${Date.now().toString(36)}`;
    const key = `sk_${prefix}_${randomBytes(24).toString('hex')}`;
    const keyHash = await hashKey(key);

    const apiKey = await db.apiKey.create({
      data: {
        userId,
        name,
        keyHash,
        keyPrefix: prefix,
        scopes,
      },
    });

    return { ...apiKey, key };
  }

  async listApiKeys(userId: string): Promise<Omit<ApiKey, 'keyHash'>[]> {
    const keys = await db.apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        userId: true,
        name: true,
        teamId: true,
        keyPrefix: true,
        scopes: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
        revokedAt: true,
      },
    });

    return keys;
  }

  async revokeApiKey(keyId: string, user: AuthenticatedUser): Promise<void> {
    if (!hasPermission(user, 'api:write')) {
      throw new UnauthorizedError('Insufficient permissions');
    }

    await db.apiKey.delete({ where: { id: keyId } });
  }

  async getAuditLogs(
    userId: string,
    options: { action?: string; limit?: number }
  ): Promise<AuditLog[]> {
    return db.auditLog.findMany({
      where: {
        userId,
        ...(options.action && { action: options.action }),
      },
      orderBy: { createdAt: 'desc' },
      take: options.limit ?? 100,
    });
  }
}

export const teamService = new TeamService();

function hashKey(key: string): Promise<string> {
  return Promise.resolve(`hash_${key.substring(0, 16)}`);
}

function hasPermission(user: AuthenticatedUser, permission: string): boolean {
  return user.permissions.includes(permission);
}
