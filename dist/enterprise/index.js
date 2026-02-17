import { randomUUID } from 'crypto';
import { db } from '../db/index.js';
import { analyticsService } from '../analytics/index.js';
export class EnterpriseAuthService {
    samlConfigs = new Map();
    oidcConfigs = new Map();
    async configureSAML(organizationId, config) {
        this.samlConfigs.set(organizationId, config);
        await db.enterpriseConfig.upsert({
            where: { domain: organizationId },
            create: {
                name: organizationId,
                domain: organizationId,
                samlConfig: config,
                oidcConfig: {},
            },
            update: {
                samlConfig: config,
            },
        });
    }
    async configureOIDC(organizationId, config) {
        this.oidcConfigs.set(organizationId, config);
        await db.enterpriseConfig.upsert({
            where: { domain: organizationId },
            create: {
                name: organizationId,
                domain: organizationId,
                oidcConfig: config,
                samlConfig: {},
            },
            update: {
                oidcConfig: config,
            },
        });
    }
    getSAMLConfig(organizationId) {
        return this.samlConfigs.get(organizationId);
    }
    getOIDCConfig(organizationId) {
        return this.oidcConfigs.get(organizationId);
    }
    generateSAMLRequest(organizationId) {
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
    async parseSAMLResponse(samlResponse) {
        const decoded = Buffer.from(samlResponse, 'base64').toString('utf-8');
        const nameIdMatch = decoded.match(/<saml:NameID[^>]*>([^<]+)<\/saml:NameID>/);
        const emailMatch = decoded.match(/<saml:Attribute Name="email"[^>]*><saml:AttributeValue[^>]*>([^<]+)<\/saml:AttributeValue>/);
        const nameMatch = decoded.match(/<saml:Attribute Name="displayName"[^>]*><saml:AttributeValue[^>]*>([^<]+)<\/saml:AttributeValue>/);
        const groupsMatch = decoded.match(/<saml:Attribute Name="groups"[^>]*>([\s\S]*?)<\/saml:Attribute>/g);
        const groups = [];
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
    getOIDCAuthorizationUrl(organizationId, state) {
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
    async exchangeOIDCToken(organizationId, code) {
        const config = this.oidcConfigs.get(organizationId);
        if (!config) {
            throw new Error(`OIDC not configured for organization ${organizationId}`);
        }
        const response = await fetch(config.tokenEndpoint, {
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
        const userResponse = await fetch(config.userinfoEndpoint, {
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
    async syncEnterpriseUser(enterpriseUser, organizationId) {
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
                    create: { id: group, name: group, enterpriseId: enterprise.id },
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
                    create: { id: group, name: group, enterpriseId: enterprise.id },
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
    async logAction(params) {
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
    async getAuditTrail(filters) {
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
    async exportAuditLogs(organizationId, startDate, endDate, format) {
        const logs = await this.getAuditTrail({
            organizationId,
            startDate,
            endDate,
            limit: 10000,
        });
        if (format === 'csv') {
            const headers = ['Timestamp', 'User', 'Action', 'Resource', 'IP Address', 'Status'];
            const rows = logs.map((log) => [
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
    async getSecurityReport(organizationId) {
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
        const userCounts = new Map();
        const actionCounts = new Map();
        for (const log of logs) {
            if (log.userId) {
                userCounts.set(log.userId, (userCounts.get(log.userId) || 0) + 1);
            }
            actionCounts.set(log.action, (actionCounts.get(log.action) || 0) + 1);
        }
        const suspiciousActivity = [];
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
//# sourceMappingURL=index.js.map