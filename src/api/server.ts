import { createServer, IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import {
  authService,
  extractTokenFromHeader,
  verifyAccessToken,
  AuthUser,
  googleOAuth,
  githubOAuth,
  discordOAuth,
  handleGoogleOAuth,
  handleGitHubOAuth,
  handleDiscordOAuth,
} from '../auth/index.js';
import { ApprovalManager } from '../core/security/approval.js';
import { conversationService } from '../memory/conversation.js';
import { postgresMemory } from '../memory/postgres.js';
import { knowledgeBaseService } from '../memory/knowledge-base.js';
import { teamService } from '../teams/index.js';
import { analyticsService } from '../analytics/index.js';
import { MemoryType, MessageRole, DocumentSourceType } from '../types/prisma-types.js';
import { Permission, hasPermission } from '../auth/permissions.js';

interface RequestContext {
  req: IncomingMessage;
  res: ServerResponse;
  url: URL;
  params: Record<string, string>;
  query: Record<string, string>;
  user?: AuthUser;
  body?: unknown;
}

type RouteHandler = (ctx: RequestContext) => Promise<void>;

interface Route {
  method: string;
  pattern: RegExp;
  handler: RouteHandler;
  auth: boolean;
  permission?: Permission;
}

export class ApiServer {
  private routes: Route[] = [];
  private port: number;

  constructor(port: number = 3000) {
    this.port = port;
    this.setupRoutes();
  }

  private setupRoutes(): void {
    const P = Permission;

    // Auth routes
    this.addRoute('POST', '/api/auth/register', this.handleRegister.bind(this), false);
    this.addRoute('POST', '/api/auth/login', this.handleLogin.bind(this), false);
    this.addRoute('POST', '/api/auth/logout', this.handleLogout.bind(this), true);
    this.addRoute('POST', '/api/auth/refresh', this.handleRefresh.bind(this), false);
    this.addRoute('GET', '/api/auth/me', this.handleGetMe.bind(this), true);
    this.addRoute('PUT', '/api/auth/me', this.handleUpdateMe.bind(this), true, P.USER_WRITE);
    this.addRoute(
      'POST',
      '/api/auth/change-password',
      this.handleChangePassword.bind(this),
      true,
      P.USER_WRITE
    );

    // OAuth routes
    this.addRoute(
      'GET',
      '/api/auth/oauth/google',
      this.handleGoogleOAuthRedirect.bind(this),
      false
    );
    this.addRoute(
      'GET',
      '/api/auth/callback/google',
      this.handleGoogleOAuthCallback.bind(this),
      false
    );
    this.addRoute(
      'GET',
      '/api/auth/oauth/github',
      this.handleGitHubOAuthRedirect.bind(this),
      false
    );
    this.addRoute(
      'GET',
      '/api/auth/callback/github',
      this.handleGitHubOAuthCallback.bind(this),
      false
    );
    this.addRoute(
      'GET',
      '/api/auth/oauth/discord',
      this.handleDiscordOAuthRedirect.bind(this),
      false
    );
    this.addRoute(
      'GET',
      '/api/auth/callback/discord',
      this.handleDiscordOAuthCallback.bind(this),
      false
    );

    // API Keys
    this.addRoute(
      'GET',
      '/api/auth/api-keys',
      this.handleListApiKeys.bind(this),
      true,
      P.API_KEY_READ
    );
    this.addRoute(
      'POST',
      '/api/auth/api-keys',
      this.handleCreateApiKey.bind(this),
      true,
      P.API_KEY_WRITE
    );
    this.addRoute(
      'DELETE',
      '/api/auth/api-keys/:id',
      this.handleRevokeApiKey.bind(this),
      true,
      P.API_KEY_WRITE
    );

    // Conversations
    this.addRoute(
      'GET',
      '/api/conversations',
      this.handleListConversations.bind(this),
      true,
      P.CONVERSATION_READ
    );
    this.addRoute(
      'POST',
      '/api/conversations',
      this.handleCreateConversation.bind(this),
      true,
      P.CONVERSATION_WRITE
    );
    this.addRoute(
      'GET',
      '/api/conversations/:id',
      this.handleGetConversation.bind(this),
      true,
      P.CONVERSATION_READ
    );
    this.addRoute(
      'DELETE',
      '/api/conversations/:id',
      this.handleDeleteConversation.bind(this),
      true,
      P.CONVERSATION_DELETE
    );
    this.addRoute(
      'POST',
      '/api/conversations/:id/messages',
      this.handleAddMessage.bind(this),
      true,
      P.CONVERSATION_WRITE
    );
    this.addRoute(
      'POST',
      '/api/conversations/:id/share',
      this.handleShareConversation.bind(this),
      true,
      P.CONVERSATION_READ
    );
    this.addRoute('GET', '/api/shared/:token', this.handleGetSharedConversation.bind(this), false);

    // Memory
    this.addRoute('GET', '/api/memory', this.handleSearchMemory.bind(this), true, P.MEMORY_READ);
    this.addRoute('POST', '/api/memory', this.handleAddMemory.bind(this), true, P.MEMORY_WRITE);
    this.addRoute('GET', '/api/memory/:id', this.handleGetMemory.bind(this), true, P.MEMORY_READ);
    this.addRoute(
      'PUT',
      '/api/memory/:id',
      this.handleUpdateMemory.bind(this),
      true,
      P.MEMORY_WRITE
    );
    this.addRoute(
      'DELETE',
      '/api/memory/:id',
      this.handleDeleteMemory.bind(this),
      true,
      P.MEMORY_DELETE
    );

    // Knowledge Bases
    this.addRoute(
      'GET',
      '/api/knowledge-bases',
      this.handleListKnowledgeBases.bind(this),
      true,
      P.MEMORY_READ
    );
    this.addRoute(
      'POST',
      '/api/knowledge-bases',
      this.handleCreateKnowledgeBase.bind(this),
      true,
      P.MEMORY_WRITE
    );
    this.addRoute(
      'GET',
      '/api/knowledge-bases/:id',
      this.handleGetKnowledgeBase.bind(this),
      true,
      P.MEMORY_READ
    );
    this.addRoute(
      'DELETE',
      '/api/knowledge-bases/:id',
      this.handleDeleteKnowledgeBase.bind(this),
      true,
      P.MEMORY_DELETE
    );
    this.addRoute(
      'POST',
      '/api/knowledge-bases/:id/documents',
      this.handleAddDocument.bind(this),
      true,
      P.MEMORY_WRITE
    );
    this.addRoute(
      'POST',
      '/api/knowledge-bases/:id/search',
      this.handleSearchKnowledgeBase.bind(this),
      true,
      P.MEMORY_READ
    );

    // Teams
    this.addRoute('GET', '/api/teams', this.handleListTeams.bind(this), true, P.TEAM_READ);
    this.addRoute('POST', '/api/teams', this.handleCreateTeam.bind(this), true, P.TEAM_WRITE);
    this.addRoute('GET', '/api/teams/:id', this.handleGetTeam.bind(this), true, P.TEAM_READ);
    this.addRoute('PUT', '/api/teams/:id', this.handleUpdateTeam.bind(this), true, P.TEAM_WRITE);
    this.addRoute(
      'DELETE',
      '/api/teams/:id',
      this.handleDeleteTeam.bind(this),
      true,
      P.TEAM_DELETE
    );
    this.addRoute(
      'POST',
      '/api/teams/:id/members',
      this.handleInviteMember.bind(this),
      true,
      P.TEAM_WRITE
    );
    this.addRoute(
      'DELETE',
      '/api/teams/:id/members/:userId',
      this.handleRemoveMember.bind(this),
      true,
      P.TEAM_WRITE
    );

    // Workspaces
    this.addRoute(
      'GET',
      '/api/teams/:teamId/workspaces',
      this.handleListWorkspaces.bind(this),
      true,
      P.TEAM_READ
    );
    this.addRoute(
      'POST',
      '/api/teams/:teamId/workspaces',
      this.handleCreateWorkspace.bind(this),
      true,
      P.TEAM_WRITE
    );
    this.addRoute(
      'GET',
      '/api/workspaces/:id',
      this.handleGetWorkspace.bind(this),
      true,
      P.TEAM_READ
    );
    this.addRoute(
      'PUT',
      '/api/workspaces/:id',
      this.handleUpdateWorkspace.bind(this),
      true,
      P.TEAM_WRITE
    );
    this.addRoute(
      'DELETE',
      '/api/workspaces/:id',
      this.handleDeleteWorkspace.bind(this),
      true,
      P.TEAM_DELETE
    );

    // Analytics
    this.addRoute(
      'GET',
      '/api/analytics/dashboard',
      this.handleGetDashboard.bind(this),
      true,
      P.AUDIT_READ
    );
    this.addRoute(
      'GET',
      '/api/analytics/usage',
      this.handleGetUsage.bind(this),
      true,
      P.AUDIT_READ
    );
    this.addRoute(
      'GET',
      '/api/analytics/audit-logs',
      this.handleGetAuditLogs.bind(this),
      true,
      P.AUDIT_READ
    );

    // Approvals
    this.addRoute(
      'GET',
      '/api/approvals',
      this.handleListApprovals.bind(this),
      true,
      P.TOOL_EXECUTE
    );
    this.addRoute(
      'POST',
      '/api/approvals/:id/approve',
      this.handleApproveRequest.bind(this),
      true,
      P.TOOL_EXECUTE
    );
    this.addRoute(
      'POST',
      '/api/approvals/:id/deny',
      this.handleDenyRequest.bind(this),
      true,
      P.TOOL_EXECUTE
    );

    // Health
    this.addRoute('GET', '/api/health', this.handleHealth.bind(this), false);
  }

  private addRoute(
    method: string,
    path: string,
    handler: RouteHandler,
    auth: boolean,
    permission?: Permission
  ): void {
    const pattern = new RegExp('^' + path.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$');
    this.routes.push({ method, pattern, handler, auth, permission });
  }

  async start(): Promise<void> {
    const server = createServer(async (req, res) => {
      const startTime = Date.now();

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      const url = new URL(req.url || '/', `http://${req.headers.host}`);
      const query = Object.fromEntries(url.searchParams);

      try {
        for (const route of this.routes) {
          if (req.method !== route.method) continue;

          const match = url.pathname.match(route.pattern);
          if (!match) continue;

          const params = match.groups || {};
          const ctx: RequestContext = { req, res, url, params, query };

          if (route.auth) {
            const user = await this.authenticate(req);
            if (!user) {
              this.sendError(res, 401, 'Unauthorized');
              return;
            }
            ctx.user = user;

            if (route.permission && !hasPermission(user.role, route.permission)) {
              this.sendError(res, 403, 'Forbidden: Missing required permission');
              return;
            }
          }

          if (['POST', 'PUT', 'PATCH'].includes(req.method || '')) {
            ctx.body = await this.parseBody(req);
          }

          await route.handler(ctx);

          const duration = Date.now() - startTime;
          if (ctx.user) {
            await analyticsService.recordUsage({
              userId: ctx.user.id,
              endpoint: url.pathname,
              method: req.method || 'GET',
              statusCode: res.statusCode || 200,
              duration,
            });
          }

          return;
        }

        this.sendError(res, 404, 'Not found');
      } catch (error) {
        console.error('API Error:', error);
        this.sendError(res, 500, error instanceof Error ? error.message : 'Internal server error');
      }
    });

    server.listen(this.port, () => {
      console.log(`API Server running on http://localhost:${this.port}`);
    });
  }

  private async authenticate(req: IncomingMessage): Promise<AuthUser | null> {
    const authHeader = req.headers.authorization;

    if (authHeader?.startsWith('Bearer sk_')) {
      const result = await authService.validateApiKey(authHeader.slice(7));
      if (result) {
        return await authService.getUser(result.userId);
      }
      return null;
    }

    const token = extractTokenFromHeader(authHeader);
    if (!token) return null;

    return await authService.validateToken(token);
  }

  private async parseBody(req: IncomingMessage): Promise<unknown> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch {
          resolve({});
        }
      });
      req.on('error', reject);
    });
  }

  private sendJson(res: ServerResponse, data: unknown, status: number = 200): void {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }

  private sendError(res: ServerResponse, status: number, message: string): void {
    this.sendJson(res, { error: message }, status);
  }

  // Auth handlers
  private async handleRegister(ctx: RequestContext): Promise<void> {
    const body = ctx.body as any;
    const result = await authService.register({
      email: body.email,
      username: body.username,
      password: body.password,
      displayName: body.displayName,
    });
    this.sendJson(ctx.res, result, 201);
  }

  private async handleLogin(ctx: RequestContext): Promise<void> {
    const body = ctx.body as any;
    const result = await authService.login({
      email: body.email,
      password: body.password,
    });
    this.sendJson(ctx.res, result);
  }

  private async handleLogout(ctx: RequestContext): Promise<void> {
    const token = extractTokenFromHeader(ctx.req.headers.authorization);
    if (token) {
      await authService.logout(token);
    }
    this.sendJson(ctx.res, { success: true });
  }

  private async handleRefresh(ctx: RequestContext): Promise<void> {
    const body = ctx.body as any;
    const tokens = await authService.refreshTokens(body.refreshToken);
    this.sendJson(ctx.res, tokens);
  }

  private async handleGetMe(ctx: RequestContext): Promise<void> {
    this.sendJson(ctx.res, { user: ctx.user });
  }

  private async handleUpdateMe(ctx: RequestContext): Promise<void> {
    const body = ctx.body as any;
    const user = await authService.updateUser(ctx.user!.id, body);
    this.sendJson(ctx.res, { user });
  }

  private async handleChangePassword(ctx: RequestContext): Promise<void> {
    const body = ctx.body as any;
    await authService.changePassword(ctx.user!.id, body.currentPassword, body.newPassword);
    this.sendJson(ctx.res, { success: true });
  }

  // OAuth handlers
  private async handleGoogleOAuthRedirect(ctx: RequestContext): Promise<void> {
    const url = googleOAuth.getAuthUrl();
    this.sendJson(ctx.res, { url });
  }

  private async handleGoogleOAuthCallback(ctx: RequestContext): Promise<void> {
    const code = ctx.query.code;
    if (!code) {
      this.sendError(ctx.res, 400, 'Missing code parameter');
      return;
    }
    try {
      const result = await handleGoogleOAuth(code);
      this.sendJson(ctx.res, result);
    } catch (error) {
      this.sendError(ctx.res, 400, (error as Error).message);
    }
  }

  private async handleGitHubOAuthRedirect(ctx: RequestContext): Promise<void> {
    const url = githubOAuth.getAuthUrl();
    this.sendJson(ctx.res, { url });
  }

  private async handleGitHubOAuthCallback(ctx: RequestContext): Promise<void> {
    const code = ctx.query.code;
    if (!code) {
      this.sendError(ctx.res, 400, 'Missing code parameter');
      return;
    }
    try {
      const result = await handleGitHubOAuth(code);
      this.sendJson(ctx.res, result);
    } catch (error) {
      this.sendError(ctx.res, 400, (error as Error).message);
    }
  }

  private async handleDiscordOAuthRedirect(ctx: RequestContext): Promise<void> {
    const url = discordOAuth.getAuthUrl();
    this.sendJson(ctx.res, { url });
  }

  private async handleDiscordOAuthCallback(ctx: RequestContext): Promise<void> {
    const code = ctx.query.code;
    if (!code) {
      this.sendError(ctx.res, 400, 'Missing code parameter');
      return;
    }
    try {
      const result = await handleDiscordOAuth(code);
      this.sendJson(ctx.res, result);
    } catch (error) {
      this.sendError(ctx.res, 400, (error as Error).message);
    }
  }

  // API Key handlers
  private async handleListApiKeys(ctx: RequestContext): Promise<void> {
    const keys = await authService.listApiKeys(ctx.user!.id);
    this.sendJson(ctx.res, { apiKeys: keys });
  }

  private async handleCreateApiKey(ctx: RequestContext): Promise<void> {
    const body = ctx.body as any;
    const result = await authService.createApiKey(ctx.user!.id, {
      name: body.name,
      scopes: body.scopes || ['read', 'write'],
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
    });
    this.sendJson(ctx.res, result, 201);
  }

  private async handleRevokeApiKey(ctx: RequestContext): Promise<void> {
    await authService.revokeApiKey(ctx.user!.id, ctx.params.id);
    this.sendJson(ctx.res, { success: true });
  }

  // Conversation handlers
  private async handleListConversations(ctx: RequestContext): Promise<void> {
    const conversations = await conversationService.list(ctx.user!.id, {
      limit: parseInt(ctx.query.limit || '20'),
      offset: parseInt(ctx.query.offset || '0'),
      workspaceId: ctx.query.workspaceId,
    });
    this.sendJson(ctx.res, { conversations });
  }

  private async handleCreateConversation(ctx: RequestContext): Promise<void> {
    const body = ctx.body as any;
    const conversation = await conversationService.create({
      userId: ctx.user!.id,
      title: body.title,
      workspaceId: body.workspaceId,
      platform: body.platform || 'api',
    });
    this.sendJson(ctx.res, { conversation }, 201);
  }

  private async handleGetConversation(ctx: RequestContext): Promise<void> {
    const conversation = await conversationService.get(ctx.params.id);
    if (!conversation) {
      this.sendError(ctx.res, 404, 'Conversation not found');
      return;
    }
    this.sendJson(ctx.res, { conversation });
  }

  private async handleDeleteConversation(ctx: RequestContext): Promise<void> {
    await conversationService.delete(ctx.params.id);
    this.sendJson(ctx.res, { success: true });
  }

  private async handleAddMessage(ctx: RequestContext): Promise<void> {
    const body = ctx.body as any;
    const message = await conversationService.addMessage({
      conversationId: ctx.params.id,
      role: body.role as MessageRole,
      content: body.content,
      model: body.model,
    });
    this.sendJson(ctx.res, { message }, 201);
  }

  private async handleShareConversation(ctx: RequestContext): Promise<void> {
    const body = ctx.body as any;
    const share = await conversationService.share(ctx.params.id, body.expiresInDays);
    this.sendJson(ctx.res, { share });
  }

  private async handleGetSharedConversation(ctx: RequestContext): Promise<void> {
    const conversation = await conversationService.getByShareToken(ctx.params.token);
    if (!conversation) {
      this.sendError(ctx.res, 404, 'Shared conversation not found or expired');
      return;
    }
    this.sendJson(ctx.res, { conversation });
  }

  // Memory handlers
  private async handleSearchMemory(ctx: RequestContext): Promise<void> {
    const results = await postgresMemory.search({
      userId: ctx.user!.id,
      query: ctx.query.q,
      type: ctx.query.type as MemoryType | undefined,
      limit: parseInt(ctx.query.limit || '10'),
    });
    this.sendJson(ctx.res, { memories: results });
  }

  private async handleAddMemory(ctx: RequestContext): Promise<void> {
    const body = ctx.body as any;
    const memory = await postgresMemory.add({
      userId: ctx.user!.id,
      type: body.type as MemoryType,
      content: body.content,
      metadata: body.metadata,
      tags: body.tags,
      importance: body.importance,
    });
    this.sendJson(ctx.res, { memory }, 201);
  }

  private async handleGetMemory(ctx: RequestContext): Promise<void> {
    const memory = await postgresMemory.get(ctx.params.id);
    if (!memory) {
      this.sendError(ctx.res, 404, 'Memory not found');
      return;
    }
    this.sendJson(ctx.res, { memory });
  }

  private async handleUpdateMemory(ctx: RequestContext): Promise<void> {
    const body = ctx.body as any;
    const memory = await postgresMemory.update(ctx.params.id, body);
    this.sendJson(ctx.res, { memory });
  }

  private async handleDeleteMemory(ctx: RequestContext): Promise<void> {
    await postgresMemory.delete(ctx.params.id);
    this.sendJson(ctx.res, { success: true });
  }

  // Knowledge Base handlers
  private async handleListKnowledgeBases(ctx: RequestContext): Promise<void> {
    const workspaceId = ctx.query.workspaceId;
    if (!workspaceId) {
      this.sendError(ctx.res, 400, 'workspaceId is required');
      return;
    }
    const knowledgeBases = await knowledgeBaseService.list(workspaceId);
    this.sendJson(ctx.res, { knowledgeBases });
  }

  private async handleCreateKnowledgeBase(ctx: RequestContext): Promise<void> {
    const body = ctx.body as any;
    const kb = await knowledgeBaseService.create({
      workspaceId: body.workspaceId,
      name: body.name,
      description: body.description,
    });
    this.sendJson(ctx.res, { knowledgeBase: kb }, 201);
  }

  private async handleGetKnowledgeBase(ctx: RequestContext): Promise<void> {
    const stats = await knowledgeBaseService.getStats(ctx.params.id);
    this.sendJson(ctx.res, stats);
  }

  private async handleDeleteKnowledgeBase(ctx: RequestContext): Promise<void> {
    await knowledgeBaseService.deleteKnowledgeBase(ctx.params.id);
    this.sendJson(ctx.res, { success: true });
  }

  private async handleAddDocument(ctx: RequestContext): Promise<void> {
    const body = ctx.body as any;
    const doc = await knowledgeBaseService.addDocument({
      knowledgeBaseId: ctx.params.id,
      title: body.title,
      content: body.content,
      source: body.source,
      sourceType: (body.sourceType as DocumentSourceType) || 'TEXT',
    });
    this.sendJson(ctx.res, { document: doc }, 201);
  }

  private async handleSearchKnowledgeBase(ctx: RequestContext): Promise<void> {
    const body = ctx.body as any;
    const results = await knowledgeBaseService.search(ctx.params.id, body.query, body.limit || 5);
    this.sendJson(ctx.res, { results });
  }

  // Team handlers
  private async handleListTeams(ctx: RequestContext): Promise<void> {
    const teams = await teamService.listUserTeams(ctx.user!.id);
    this.sendJson(ctx.res, { teams });
  }

  private async handleCreateTeam(ctx: RequestContext): Promise<void> {
    const body = ctx.body as any;
    const team = await teamService.createTeam(
      { id: ctx.user!.id, email: ctx.user!.email, username: ctx.user!.username, role: ctx.user!.role, permissions: [] },
      { name: body.name, slug: body.slug }
    );
    this.sendJson(ctx.res, { team }, 201);
  }

  private async handleGetTeam(ctx: RequestContext): Promise<void> {
    const team = await teamService.getTeam(ctx.params.id);
    if (!team) {
      this.sendError(ctx.res, 404, 'Team not found');
      return;
    }
    this.sendJson(ctx.res, { team });
  }

  private async handleUpdateTeam(ctx: RequestContext): Promise<void> {
    const body = ctx.body as any;
    const team = await teamService.updateTeam(ctx.params.id, body, { id: ctx.user!.id, email: ctx.user!.email, username: ctx.user!.username, role: ctx.user!.role, permissions: [] });
    this.sendJson(ctx.res, { team });
  }

  private async handleDeleteTeam(ctx: RequestContext): Promise<void> {
    await teamService.deleteTeam(ctx.params.id, { id: ctx.user!.id, email: ctx.user!.email, username: ctx.user!.username, role: ctx.user!.role, permissions: [] });
    this.sendJson(ctx.res, { success: true });
  }

  private async handleInviteMember(ctx: RequestContext): Promise<void> {
    const body = ctx.body as any;
    await teamService.inviteMember(
      ctx.params.id,
      body.email,
      body.role,
      { id: ctx.user!.id, email: ctx.user!.email, username: ctx.user!.username, role: ctx.user!.role, permissions: [] }
    );
    this.sendJson(ctx.res, { success: true }, 201);
  }

  private async handleRemoveMember(ctx: RequestContext): Promise<void> {
    await teamService.removeTeamMember(ctx.params.id, ctx.params.userId, { id: ctx.user!.id, email: ctx.user!.email, username: ctx.user!.username, role: ctx.user!.role, permissions: [] });
    this.sendJson(ctx.res, { success: true });
  }

  // Workspace handlers
  private async handleListWorkspaces(ctx: RequestContext): Promise<void> {
    const workspaces = await teamService.listWorkspaces(ctx.params.teamId);
    this.sendJson(ctx.res, { workspaces });
  }

  private async handleCreateWorkspace(ctx: RequestContext): Promise<void> {
    const body = ctx.body as any;
    const workspace = await teamService.createWorkspace(ctx.params.teamId, { name: body.name, description: body.description });
    this.sendJson(ctx.res, { workspace }, 201);
  }

  private async handleGetWorkspace(ctx: RequestContext): Promise<void> {
    const workspace = await teamService.getWorkspace(ctx.params.id);
    if (!workspace) {
      this.sendError(ctx.res, 404, 'Workspace not found');
      return;
    }
    this.sendJson(ctx.res, { workspace });
  }

  private async handleUpdateWorkspace(ctx: RequestContext): Promise<void> {
    const body = ctx.body as any;
    const workspace = await teamService.updateWorkspace(ctx.params.id, body);
    this.sendJson(ctx.res, { workspace });
  }

  private async handleDeleteWorkspace(ctx: RequestContext): Promise<void> {
    await teamService.deleteWorkspace(ctx.params.id);
    this.sendJson(ctx.res, { success: true });
  }

  // Analytics handlers
  private async handleGetDashboard(ctx: RequestContext): Promise<void> {
    const stats = await analyticsService.getDashboardStats(ctx.user!.id);
    this.sendJson(ctx.res, stats);
  }

  private async handleGetUsage(ctx: RequestContext): Promise<void> {
    const startDate = new Date(ctx.query.startDate || Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = new Date(ctx.query.endDate || Date.now());

    const [stats, timeSeries] = await Promise.all([
      analyticsService.getUsageStats(ctx.user!.id, startDate, endDate),
      analyticsService.getTimeSeries(ctx.user!.id, startDate, endDate),
    ]);

    this.sendJson(ctx.res, { stats, timeSeries });
  }

  private async handleGetAuditLogs(ctx: RequestContext): Promise<void> {
    const logs = await analyticsService.getAuditLogs({
      userId: ctx.user!.id,
      limit: parseInt(ctx.query.limit || '50'),
      offset: parseInt(ctx.query.offset || '0'),
    });
    this.sendJson(ctx.res, { logs });
  }

  private ensureAdmin(user: AuthUser): boolean {
    return user.role === 'ADMIN';
  }

  // Approval handlers
  private async handleListApprovals(ctx: RequestContext): Promise<void> {
    if (!this.ensureAdmin(ctx.user!)) {
      this.sendError(ctx.res, 403, 'Forbidden');
      return;
    }

    const approvals = ApprovalManager.list(ctx.query.userId || undefined);
    this.sendJson(ctx.res, { approvals });
  }

  private async handleApproveRequest(ctx: RequestContext): Promise<void> {
    if (!this.ensureAdmin(ctx.user!)) {
      this.sendError(ctx.res, 403, 'Forbidden');
      return;
    }

    const approved = await ApprovalManager.approve(ctx.params.id, ctx.user!.id);
    if (!approved) {
      this.sendError(ctx.res, 404, 'Approval request not found');
      return;
    }

    this.sendJson(ctx.res, { approval: approved });
  }

  private async handleDenyRequest(ctx: RequestContext): Promise<void> {
    if (!this.ensureAdmin(ctx.user!)) {
      this.sendError(ctx.res, 403, 'Forbidden');
      return;
    }

    const denied = await ApprovalManager.deny(ctx.params.id, ctx.user!.id);
    if (!denied) {
      this.sendError(ctx.res, 404, 'Approval request not found');
      return;
    }

    this.sendJson(ctx.res, { approval: denied });
  }

  // Health check
  private async handleHealth(ctx: RequestContext): Promise<void> {
    this.sendJson(ctx.res, {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
  }
}

export const apiServer = new ApiServer(parseInt(process.env.API_PORT || '3000'));
