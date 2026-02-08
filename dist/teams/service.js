import { db } from '../db/index.js';
import { TeamRole } from '../types/prisma-types.js';
export class TeamService {
    async createTeam(input) {
        const existingSlug = await db.team.findUnique({
            where: { slug: input.slug },
        });
        if (existingSlug) {
            throw new Error('Team slug already exists');
        }
        const team = await db.team.create({
            data: {
                name: input.name,
                slug: input.slug,
                description: input.description,
                ownerId: input.ownerId,
                members: {
                    create: {
                        userId: input.ownerId,
                        role: TeamRole.OWNER,
                    },
                },
            },
            include: {
                members: {
                    include: {
                        user: { select: { id: true, username: true, displayName: true, avatar: true } },
                    },
                },
            },
        });
        return team;
    }
    async getTeam(id) {
        return db.team.findUnique({
            where: { id },
            include: {
                members: {
                    include: {
                        user: { select: { id: true, username: true, displayName: true, avatar: true } },
                    },
                },
                workspaces: {
                    select: { id: true, name: true, description: true },
                },
                _count: { select: { members: true, workspaces: true } },
            },
        });
    }
    async getTeamBySlug(slug) {
        return db.team.findUnique({
            where: { slug },
            include: {
                members: {
                    include: {
                        user: { select: { id: true, username: true, displayName: true, avatar: true } },
                    },
                },
                _count: { select: { members: true, workspaces: true } },
            },
        });
    }
    async listUserTeams(userId) {
        const memberships = await db.teamMember.findMany({
            where: { userId },
            include: {
                team: {
                    include: {
                        _count: { select: { members: true, workspaces: true } },
                    },
                },
            },
            orderBy: { joinedAt: 'desc' },
        });
        return memberships.map((m) => ({
            ...m.team,
            role: m.role,
            joinedAt: m.joinedAt,
        }));
    }
    async updateTeam(id, data) {
        return db.team.update({
            where: { id },
            data,
        });
    }
    async deleteTeam(id) {
        return db.team.delete({
            where: { id },
        });
    }
    async inviteMember(input) {
        const existing = await db.teamMember.findUnique({
            where: {
                teamId_userId: {
                    teamId: input.teamId,
                    userId: input.userId,
                },
            },
        });
        if (existing) {
            throw new Error('User is already a member of this team');
        }
        return db.teamMember.create({
            data: {
                teamId: input.teamId,
                userId: input.userId,
                role: input.role || TeamRole.MEMBER,
            },
            include: {
                user: { select: { id: true, username: true, displayName: true, avatar: true } },
            },
        });
    }
    async updateMemberRole(teamId, userId, role) {
        return db.teamMember.update({
            where: {
                teamId_userId: { teamId, userId },
            },
            data: { role },
        });
    }
    async removeMember(teamId, userId) {
        const team = await db.team.findUnique({ where: { id: teamId } });
        if (team?.ownerId === userId) {
            throw new Error('Cannot remove team owner');
        }
        return db.teamMember.delete({
            where: {
                teamId_userId: { teamId, userId },
            },
        });
    }
    async checkMembership(teamId, userId) {
        const member = await db.teamMember.findUnique({
            where: {
                teamId_userId: { teamId, userId },
            },
        });
        return member?.role || null;
    }
    async createWorkspace(input) {
        return db.workspace.create({
            data: {
                teamId: input.teamId,
                name: input.name,
                description: input.description,
                settings: input.settings || {},
            },
        });
    }
    async getWorkspace(id) {
        return db.workspace.findUnique({
            where: { id },
            include: {
                team: { select: { id: true, name: true, slug: true } },
                knowledgeBases: {
                    select: { id: true, name: true, description: true },
                },
                _count: { select: { conversations: true, knowledgeBases: true } },
            },
        });
    }
    async listWorkspaces(teamId) {
        return db.workspace.findMany({
            where: { teamId },
            include: {
                _count: { select: { conversations: true, knowledgeBases: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async updateWorkspace(id, data) {
        return db.workspace.update({
            where: { id },
            data: {
                ...data,
                settings: data.settings,
            },
        });
    }
    async deleteWorkspace(id) {
        return db.workspace.delete({
            where: { id },
        });
    }
    async transferOwnership(teamId, newOwnerId) {
        const membership = await db.teamMember.findUnique({
            where: {
                teamId_userId: { teamId, userId: newOwnerId },
            },
        });
        if (!membership) {
            throw new Error('New owner must be a team member');
        }
        return db.$transaction([
            db.team.update({
                where: { id: teamId },
                data: { ownerId: newOwnerId },
            }),
            db.teamMember.update({
                where: { teamId_userId: { teamId, userId: newOwnerId } },
                data: { role: TeamRole.OWNER },
            }),
        ]);
    }
}
export const teamService = new TeamService();
//# sourceMappingURL=service.js.map