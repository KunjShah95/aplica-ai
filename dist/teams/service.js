var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
import { Injectable, UnauthorizedError, NotFoundError, ConflictError } from '../core/errors';
import { randomBytes } from 'crypto';
import { db } from '../db/index.js';
import { TeamRole } from '@prisma/client';
let TeamService = (() => {
    let _classDecorators = [Injectable()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var TeamService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            TeamService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        async createTeam(owner, data) {
            const slug = data.slug ??
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
        async getTeam(teamId) {
            return db.team.findUnique({ where: { id: teamId } });
        }
        async updateTeam(teamId, data, user) {
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
        async deleteTeam(teamId, user) {
            if (!hasPermission(user, 'settings:write')) {
                throw new UnauthorizedError('Insufficient permissions');
            }
            await db.team.delete({ where: { id: teamId } });
        }
        async listUserTeams(userId) {
            const memberships = await db.teamMember.findMany({
                where: { userId },
                include: { team: true },
            });
            return memberships.map((m) => m.team);
        }
        async listTeamMembers(teamId) {
            const memberships = await db.teamMember.findMany({
                where: { teamId },
                include: { user: true },
            });
            return memberships.map((m) => ({
                ...m.user,
                teamRole: m.role,
            }));
        }
        async addTeamMember(teamId, userId, role, invitedBy) {
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
        async inviteMember(teamId, email, role, invitedBy) {
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
        async removeTeamMember(teamId, userId, removedBy) {
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
        async updateMemberRole(teamId, userId, newRole, updatedBy) {
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
        async listWorkspaces(teamId) {
            return db.workspace.findMany({ where: { teamId } });
        }
        async createWorkspace(teamId, data) {
            return db.workspace.create({
                data: {
                    teamId,
                    name: data.name,
                    description: data.description,
                },
            });
        }
        async getWorkspace(workspaceId) {
            return db.workspace.findUnique({ where: { id: workspaceId } });
        }
        async updateWorkspace(workspaceId, data) {
            return db.workspace.update({
                where: { id: workspaceId },
                data: {
                    name: data.name,
                    description: data.description,
                    updatedAt: new Date(),
                },
            });
        }
        async deleteWorkspace(workspaceId) {
            await db.workspace.delete({ where: { id: workspaceId } });
        }
        async createApiKey(userId, name, scopes, user) {
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
        async listApiKeys(userId) {
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
        async revokeApiKey(keyId, user) {
            if (!hasPermission(user, 'api:write')) {
                throw new UnauthorizedError('Insufficient permissions');
            }
            await db.apiKey.delete({ where: { id: keyId } });
        }
        async getAuditLogs(userId, options) {
            return db.auditLog.findMany({
                where: {
                    userId,
                    ...(options.action && { action: options.action }),
                },
                orderBy: { createdAt: 'desc' },
                take: options.limit ?? 100,
            });
        }
    };
    return TeamService = _classThis;
})();
export { TeamService };
export const teamService = new TeamService();
function hashKey(key) {
    return Promise.resolve(`hash_${key.substring(0, 16)}`);
}
function hasPermission(user, permission) {
    return user.permissions.includes(permission);
}
//# sourceMappingURL=service.js.map