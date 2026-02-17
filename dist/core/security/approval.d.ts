import { EventEmitter } from 'events';
export interface ApprovalRequest {
    id: string;
    userId: string;
    action: string;
    details: string;
    status: 'PENDING' | 'APPROVED' | 'DENIED' | 'AUTO_APPROVED';
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    timestamp: Date;
}
export type ApprovalEvent = {
    type: 'pending' | 'decision';
    request: ApprovalRequest;
};
export declare const approvalEvents: EventEmitter<[never]>;
export declare class ApprovalManager {
    private static pendingRequests;
    static request(userId: string, action: string, details: any, risk?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): Promise<ApprovalRequest>;
    static list(userId?: string): ApprovalRequest[];
    static get(requestId: string): ApprovalRequest | null;
    static approve(requestId: string, approverId: string): Promise<ApprovalRequest | null>;
    static deny(requestId: string, approverId: string): Promise<ApprovalRequest | null>;
}
//# sourceMappingURL=approval.d.ts.map