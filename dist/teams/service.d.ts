import { Prisma } from '@prisma/client';
import { TeamRole } from '../types/prisma-types.js';
export interface CreateTeamInput {
    name: string;
    slug: string;
    description?: string;
    ownerId: string;
}
export interface CreateWorkspaceInput {
    teamId: string;
    name: string;
    description?: string;
    settings?: Record<string, unknown>;
}
export interface InviteMemberInput {
    teamId: string;
    userId: string;
    role?: TeamRole;
}
export declare class TeamService {
    createTeam(input: CreateTeamInput): Promise<{
        members: ({
            user: {
                displayName: string | null;
                username: string;
                avatar: string | null;
                id: string;
            };
        } & {
            id: string;
            userId: string;
            joinedAt: Date;
            role: import(".prisma/client").$Enums.TeamRole;
            teamId: string;
        })[];
    } & {
        name: string;
        description: string | null;
        avatar: string | null;
        id: string;
        createdAt: Date;
        ownerId: string;
        updatedAt: Date;
        slug: string;
    }>;
    getTeam(id: string): Promise<({
        members: ({
            user: {
                displayName: string | null;
                username: string;
                avatar: string | null;
                id: string;
            };
        } & {
            id: string;
            userId: string;
            joinedAt: Date;
            role: import(".prisma/client").$Enums.TeamRole;
            teamId: string;
        })[];
        _count: {
            members: number;
            workspaces: number;
        };
        workspaces: {
            name: string;
            description: string | null;
            id: string;
        }[];
    } & {
        name: string;
        description: string | null;
        avatar: string | null;
        id: string;
        createdAt: Date;
        ownerId: string;
        updatedAt: Date;
        slug: string;
    }) | null>;
    getTeamBySlug(slug: string): Promise<({
        members: ({
            user: {
                displayName: string | null;
                username: string;
                avatar: string | null;
                id: string;
            };
        } & {
            id: string;
            userId: string;
            joinedAt: Date;
            role: import(".prisma/client").$Enums.TeamRole;
            teamId: string;
        })[];
        _count: {
            members: number;
            workspaces: number;
        };
    } & {
        name: string;
        description: string | null;
        avatar: string | null;
        id: string;
        createdAt: Date;
        ownerId: string;
        updatedAt: Date;
        slug: string;
    }) | null>;
    listUserTeams(userId: string): Promise<any[]>;
    updateTeam(id: string, data: {
        name?: string;
        description?: string;
        avatar?: string;
    }): Promise<{
        name: string;
        description: string | null;
        avatar: string | null;
        id: string;
        createdAt: Date;
        ownerId: string;
        updatedAt: Date;
        slug: string;
    }>;
    deleteTeam(id: string): Promise<{
        name: string;
        description: string | null;
        avatar: string | null;
        id: string;
        createdAt: Date;
        ownerId: string;
        updatedAt: Date;
        slug: string;
    }>;
    inviteMember(input: InviteMemberInput): Promise<{
        user: {
            displayName: string | null;
            username: string;
            avatar: string | null;
            id: string;
        };
    } & {
        id: string;
        userId: string;
        joinedAt: Date;
        role: import(".prisma/client").$Enums.TeamRole;
        teamId: string;
    }>;
    updateMemberRole(teamId: string, userId: string, role: TeamRole): Promise<{
        id: string;
        userId: string;
        joinedAt: Date;
        role: import(".prisma/client").$Enums.TeamRole;
        teamId: string;
    }>;
    removeMember(teamId: string, userId: string): Promise<{
        id: string;
        userId: string;
        joinedAt: Date;
        role: import(".prisma/client").$Enums.TeamRole;
        teamId: string;
    }>;
    checkMembership(teamId: string, userId: string): Promise<TeamRole | null>;
    createWorkspace(input: CreateWorkspaceInput): Promise<{
        name: string;
        description: string | null;
        id: string;
        createdAt: Date;
        settings: Prisma.JsonValue;
        updatedAt: Date;
        teamId: string;
    }>;
    getWorkspace(id: string): Promise<({
        team: {
            name: string;
            id: string;
            slug: string;
        };
        _count: {
            conversations: number;
            knowledgeBases: number;
        };
        knowledgeBases: {
            name: string;
            description: string | null;
            id: string;
        }[];
    } & {
        name: string;
        description: string | null;
        id: string;
        createdAt: Date;
        settings: Prisma.JsonValue;
        updatedAt: Date;
        teamId: string;
    }) | null>;
    listWorkspaces(teamId: string): Promise<({
        _count: {
            conversations: number;
            knowledgeBases: number;
        };
    } & {
        name: string;
        description: string | null;
        id: string;
        createdAt: Date;
        settings: Prisma.JsonValue;
        updatedAt: Date;
        teamId: string;
    })[]>;
    updateWorkspace(id: string, data: {
        name?: string;
        description?: string;
        settings?: Record<string, unknown>;
    }): Promise<{
        name: string;
        description: string | null;
        id: string;
        createdAt: Date;
        settings: Prisma.JsonValue;
        updatedAt: Date;
        teamId: string;
    }>;
    deleteWorkspace(id: string): Promise<{
        name: string;
        description: string | null;
        id: string;
        createdAt: Date;
        settings: Prisma.JsonValue;
        updatedAt: Date;
        teamId: string;
    }>;
    transferOwnership(teamId: string, newOwnerId: string): Promise<[{
        name: string;
        description: string | null;
        avatar: string | null;
        id: string;
        createdAt: Date;
        ownerId: string;
        updatedAt: Date;
        slug: string;
    }, {
        id: string;
        userId: string;
        joinedAt: Date;
        role: import(".prisma/client").$Enums.TeamRole;
        teamId: string;
    }]>;
}
export declare const teamService: TeamService;
//# sourceMappingURL=service.d.ts.map