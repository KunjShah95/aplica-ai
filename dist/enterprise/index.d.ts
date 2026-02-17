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
export declare class EnterpriseAuthService {
    private samlConfigs;
    private oidcConfigs;
    configureSAML(organizationId: string, config: SAMLConfig): Promise<void>;
    configureOIDC(organizationId: string, config: OIDCConfig): Promise<void>;
    getSAMLConfig(organizationId: string): SAMLConfig | undefined;
    getOIDCConfig(organizationId: string): OIDCConfig | undefined;
    generateSAMLRequest(organizationId: string): string;
    parseSAMLResponse(samlResponse: string): Promise<EnterpriseUser>;
    getOIDCAuthorizationUrl(organizationId: string, state: string): string;
    exchangeOIDCToken(organizationId: string, code: string): Promise<EnterpriseUser>;
    syncEnterpriseUser(enterpriseUser: EnterpriseUser, organizationId: string): Promise<string>;
}
export declare class AuditService {
    logAction(params: {
        userId?: string;
        organizationId?: string;
        action: string;
        resource: string;
        resourceId?: string;
        details?: Record<string, unknown>;
        ipAddress?: string;
        userAgent?: string;
    }): Promise<void>;
    getAuditTrail(filters: {
        organizationId?: string;
        userId?: string;
        action?: string;
        resource?: string;
        startDate?: Date;
        endDate?: Date;
        limit?: number;
        offset?: number;
    }): Promise<any[]>;
    exportAuditLogs(organizationId: string, startDate: Date, endDate: Date, format: 'json' | 'csv'): Promise<string>;
    getSecurityReport(organizationId: string): Promise<{
        totalActions: number;
        failedActions: number;
        topUsers: Array<{
            userId: string;
            count: number;
        }>;
        topActions: Array<{
            action: string;
            count: number;
        }>;
        suspiciousActivity: Array<{
            reason: string;
            userId: string;
            timestamp: Date;
        }>;
    }>;
}
export declare const enterpriseAuthService: EnterpriseAuthService;
export declare const auditService: AuditService;
//# sourceMappingURL=index.d.ts.map