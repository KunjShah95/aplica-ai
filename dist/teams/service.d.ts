import { Team, TeamMember, TeamRole, User, ApiKey, AuditLog, Workspace } from '@prisma/client';
import { AuthenticatedUser } from './types';
export declare class TeamService {
    createTeam(owner: AuthenticatedUser, data: {
        name: string;
        slug?: string;
    }): Promise<Team>;
    getTeam(teamId: string): Promise<Team | null>;
    updateTeam(teamId: string, data: Partial<Omit<Team, 'id' | 'createdAt'>>, user: AuthenticatedUser): Promise<Team>;
    deleteTeam(teamId: string, user: AuthenticatedUser): Promise<void>;
    listUserTeams(userId: string): Promise<Team[]>;
    listTeamMembers(teamId: string): Promise<(User & {
        teamRole: TeamRole;
    })[]>;
    addTeamMember(teamId: string, userId: string, role: TeamRole, invitedBy: AuthenticatedUser): Promise<TeamMember>;
    inviteMember(teamId: string, email: string, role: TeamRole, invitedBy: AuthenticatedUser): Promise<void>;
    removeTeamMember(teamId: string, userId: string, removedBy: AuthenticatedUser): Promise<void>;
    updateMemberRole(teamId: string, userId: string, newRole: TeamRole, updatedBy: AuthenticatedUser): Promise<void>;
    listWorkspaces(teamId: string): Promise<Workspace[]>;
    createWorkspace(teamId: string, data: {
        name: string;
        description?: string;
    }): Promise<Workspace>;
    getWorkspace(workspaceId: string): Promise<Workspace | null>;
    updateWorkspace(workspaceId: string, data: {
        name?: string;
        description?: string | null;
    }): Promise<Workspace>;
    deleteWorkspace(workspaceId: string): Promise<void>;
    createApiKey(userId: string, name: string, scopes: string[], user: AuthenticatedUser): Promise<ApiKey & {
        key: string;
    }>;
    listApiKeys(userId: string): Promise<Omit<ApiKey, 'keyHash'>[]>;
    revokeApiKey(keyId: string, user: AuthenticatedUser): Promise<void>;
    getAuditLogs(userId: string, options: {
        action?: string;
        limit?: number;
    }): Promise<AuditLog[]>;
}
export declare const teamService: TeamService;
//# sourceMappingURL=service.d.ts.map