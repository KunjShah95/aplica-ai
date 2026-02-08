export interface ApprovalRequest {
    id: string;
    userId: string;
    action: string;
    details: string;
    status: 'PENDING' | 'APPROVED' | 'DENIED' | 'AUTO_APPROVED';
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    timestamp: Date;
}
export declare class ApprovalManager {
    static request(userId: string, action: string, details: any, risk?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): Promise<ApprovalRequest>;
}
//# sourceMappingURL=approval.d.ts.map