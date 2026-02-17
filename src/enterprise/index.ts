import { randomUUID } from 'crypto';
import { db } from '../db/index.js';
import { analyticsService } from '../analytics/index.js';

export interface SSOConfig {
  provider: 'saml' | 'oauth' | 'oidc';
  entryPoint?: string;
  issuer: string;
  certificate?: string;
  callbackUrl: string;
  wantAuthnResponseSigned?: boolean;
  wantAssertionsSigned?: boolean;
  signatureAlgorithm?: 'sha1' | 'sha256' | 'sha512';
}

export interface SAMLConfig extends SSOConfig {
  provider: 'saml';
  entryPoint: string;
  logoutUrl?: string;
  attributeMapping?: Record<string, string>;
}

export interface OIDCConfig extends SSOConfig {
  provider: 'oidc';
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userinfoEndpoint?: string;
  jwksEndpoint?: string;
  scopes: string[];
}

export interface EnterpriseUser {
  id: string;
  email: string;
  displayName: string;
  groups: string[];
  roles: string[];
  attributes: Record<string, unknown>;
}

export class EnterpriseAuthService {
  private samlConfigs: Map<string, SAMLConfig> = new Map();
  private oidcConfigs: Map<string, OIDCConfig> = new Map();

  async configureSAML(organizationId: string, config: SAMLConfig): Promise<void> {
    this.samlConfigs.set(organizationId, config);

    await db.enterpriseConfig.upsert({
      where: { domain: organizationId },
      create: {
        name: organizationId,
        domain: organizationId,
        samlConfig: config as any,
        oidcConfig: {},
      },
      update: {
        samlConfig: config as any,
      },
    });
  }

  async configureOIDC(organizationId: string, config: OIDCConfig): Promise<void> {
    this.oidcConfigs.set(organizationId, config);

    await db.enterpriseConfig.upsert({
      where: { domain: organizationId },
      create: {
        name: organizationId,
        domain: organizationId,
        oidcConfig: config as any,
        samlConfig: {},
      },
      update: {
        oidcConfig: config as any,
      },
    });
  }

  getSAMLConfig(organizationId: string): SAMLConfig | undefined {
    return this.samlConfigs.get(organizationId);
  }

  getOIDCConfig(organizationId: string): OIDCConfig | undefined {
    return this.oidcConfigs.get(organizationId);
  }

  generateSAMLRequest(organizationId: string): string {
    const config = this.samlConfigs.get(organizationId);
    if (!config) {
      throw new Error(`SAML not configured for organization ${organizationId}`);
    }

    const requestId = '_' + randomUUID();

    const samlRequest = `<?xml version="1.0" encoding="UTF-8"?>
<samlp:AuthnRequest 
  xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
  xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
  ID="${requestId}"
  Version="2.0"
  IssueInstant="${new Date().toISOString()}"
  AssertionConsumerServiceURL="${config.callbackUrl}"
  ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST">
  <saml:Issuer>${config.issuer}</saml:Issuer>
</samlp:AuthnRequest>`;

    return Buffer.from(samlRequest).toString('base64');
  }

  async parseSAMLResponse(samlResponse: string): Promise<EnterpriseUser> {
    const decoded = Buffer.from(samlResponse, 'base64').toString('utf-8');

    const nameIdMatch = decoded.match(/<saml:NameID[^>]*>([^<]+)<\/saml:NameID>/);
    const emailMatch = decoded.match(
      /<saml:Attribute Name="email"[^>]*><saml:AttributeValue[^>]*>([^<]+)<\/saml:AttributeValue>/
    );
    const nameMatch = decoded.match(
      /<saml:Attribute Name="displayName"[^>]*><saml:AttributeValue[^>]*>([^<]+)<\/saml:AttributeValue>/
    );

    const groupsMatch = decoded.match(
      /<saml:Attribute Name="groups"[^>]*>([\s\S]*?)<\/saml:Attribute>/g
    );
    const groups: string[] = [];
    if (groupsMatch) {
      for (const match of groupsMatch) {
        const valueMatch = match.match(/<saml:AttributeValue[^>]*>([^<]+)<\/saml:AttributeValue>/);
        if (valueMatch) {
          groups.push(valueMatch[1]);
        }
      }
    }

    return {
      id: randomUUID(),
      email: emailMatch?.[1] || nameIdMatch?.[1] || '',
      displayName: nameMatch?.[1] || emailMatch?.[1] || 'Unknown',
      groups,
      roles: groups.filter((g) => g.startsWith('role:')).map((r) => r.replace('role:', '')),
      attributes: {},
    };
  }

  getOIDCAuthorizationUrl(organizationId: string, state: string): string {
    const config = this.oidcConfigs.get(organizationId);
    if (!config) {
      throw new Error(`OIDC not configured for organization ${organizationId}`);
    }

    const params = new URLSearchParams({
      client_id: config.issuer,
      redirect_uri: config.callbackUrl,
      response_type: 'code',
      scope: config.scopes.join(' '),
      state,
    });

    return `${config.authorizationEndpoint}?${params.toString()}`;
  }

  async exchangeOIDCToken(organizationId: string, code: string): Promise<EnterpriseUser> {
    const config = this.oidcConfigs.get(organizationId);
    if (!config) {
      throw new Error(`OIDC not configured for organization ${organizationId}`);
    }

    const response = await fetch(config.tokenEndpoint!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: config.issuer,
        client_secret: config.certificate || '',
        redirect_uri: config.callbackUrl,
      }),
    });

    const tokens = await response.json();

    const userResponse = await fetch(config.userinfoEndpoint!, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    const userInfo = await userResponse.json();

    return {
      id: userInfo.sub || randomUUID(),
      email: userInfo.email,
      displayName: userInfo.name || userInfo.email,
      groups: userInfo.groups || [],
      roles: userInfo.roles || [],
      attributes: userInfo,
    };
  }

  async syncEnterpriseUser(
    enterpriseUser: EnterpriseUser,
    organizationId: string
  ): Promise<string> {
    let user = await db.user.findUnique({
      where: { email: enterpriseUser.email },
    });

    if (!user) {
      user = await db.user.create({
        data: {
          id: enterpriseUser.id,
          email: enterpriseUser.email,
          username: enterpriseUser.email.split('@')[0],
          displayName: enterpriseUser.displayName,
          role: 'USER',
          status: 'ACTIVE',
        },
      });
    }

    if (enterpriseUser.groups.length > 0) {
      const enterprise = await db.enterpriseConfig.findUnique({
        where: { domain: organizationId },
      });
      for (const group of enterpriseUser.groups) {
        await db.group.upsert({
          where: { id: group },
          create: { id: group, name: group, enterpriseId: enterprise!.id },
          update: {},
        });

        await db.groupMember.upsert({
          where: { groupId_userId: { groupId: group, userId: user.id } },
          create: { groupId: group, userId: user.id },
          update: {},
        });
      }
    }

    await db.user.update({
      where: { id: user.id },
      data: {
        displayName: enterpriseUser.displayName,
      },
    });

    if (enterpriseUser.groups.length > 0) {
      const enterprise = await db.enterpriseConfig.findUnique({
        where: { domain: organizationId },
      });
      for (const group of enterpriseUser.groups) {
        await db.group.upsert({
          where: { id: group },
          create: { id: group, name: group, enterpriseId: enterprise!.id },
          update: {},
        });

        await db.groupMember.upsert({
          where: { groupId_userId: { groupId: group, userId: user.id } },
          create: { groupId: group, userId: user.id },
          update: {},
        });
      }
    }

    await analyticsService.logAudit({
      userId: user.id,
      action: 'sso_login',
      resource: 'user',
      resourceId: user.id,
      details: { method: 'enterprise_sso', email: enterpriseUser.email },
    });

    return user.id;
  }
}

export class AuditService {
  async logAction(params: {
    userId?: string;
    organizationId?: string;
    action: string;
    resource: string;
    resourceId?: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await analyticsService.logAudit({
      userId: params.userId,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId,
      details: {
        ...params.details,
        organizationId: params.organizationId,
      },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      status: 'success',
    });
  }

  async getAuditTrail(filters: {
    organizationId?: string;
    userId?: string;
    action?: string;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    return analyticsService.getAuditLogs({
      userId: filters.userId,
      action: filters.action,
      resource: filters.resource,
      startDate: filters.startDate,
      endDate: filters.endDate,
      limit: filters.limit || 100,
      offset: filters.offset || 0,
    });
  }

  async exportAuditLogs(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    format: 'json' | 'csv'
  ): Promise<string> {
    const logs = await this.getAuditTrail({
      organizationId,
      startDate,
      endDate,
      limit: 10000,
    });

    if (format === 'csv') {
      const headers = ['Timestamp', 'User', 'Action', 'Resource', 'IP Address', 'Status'];
      const rows = logs.map((log: any) => [
        log.createdAt,
        log.user?.displayName || log.userId || 'System',
        log.action,
        log.resource,
        log.ipAddress || '',
        log.status,
      ]);

      return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    }

    return JSON.stringify(logs, null, 2);
  }

  async getSecurityReport(organizationId: string): Promise<{
    totalActions: number;
    failedActions: number;
    topUsers: Array<{ userId: string; count: number }>;
    topActions: Array<{ action: string; count: number }>;
    suspiciousActivity: Array<{ reason: string; userId: string; timestamp: Date }>;
  }> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const stats = await analyticsService.getUsageStats('system', thirtyDaysAgo, new Date());
    const errorRate = await analyticsService.getErrorRate('system', thirtyDaysAgo, new Date());

    const logs = await this.getAuditTrail({
      organizationId,
      startDate: thirtyDaysAgo,
      endDate: new Date(),
      limit: 1000,
    });

    const userCounts = new Map<string, number>();
    const actionCounts = new Map<string, number>();

    for (const log of logs) {
      if (log.userId) {
        userCounts.set(log.userId, (userCounts.get(log.userId) || 0) + 1);
      }
      actionCounts.set(log.action, (actionCounts.get(log.action) || 0) + 1);
    }

    const suspiciousActivity: Array<{ reason: string; userId: string; timestamp: Date }> = [];
    for (const log of logs) {
      if (log.status === 'failed') {
        suspiciousActivity.push({
          reason: `Failed action: ${log.action}`,
          userId: log.userId || 'unknown',
          timestamp: log.createdAt,
        });
      }
    }

    return {
      totalActions: stats.totalRequests,
      failedActions: errorRate.errors,
      topUsers: Array.from(userCounts.entries())
        .map(([userId, count]) => ({ userId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      topActions: Array.from(actionCounts.entries())
        .map(([action, count]) => ({ action, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      suspiciousActivity: suspiciousActivity.slice(0, 20),
    };
  }
}

export const enterpriseAuthService = new EnterpriseAuthService();
export const auditService = new AuditService();
