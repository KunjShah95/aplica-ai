import { db } from '../../db/index.js';

export interface ApprovalRequest {
    id: string;
    userId: string;
    action: string;
    details: string;
    status: 'PENDING' | 'APPROVED' | 'DENIED' | 'AUTO_APPROVED';
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    timestamp: Date;
}

export class ApprovalManager {
    static async request(
        userId: string,
        action: string,
        details: any,
        risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM'
    ): Promise<ApprovalRequest> {
        // Log the request
        const request: ApprovalRequest = {
            id: crypto.randomUUID(),
            userId,
            action,
            details: JSON.stringify(details),
            status: 'PENDING',
            riskLevel: risk,
            timestamp: new Date()
        };

        // For viral demo purposes:
        // - CRITICAL -> Deny immediately (Safe)
        // - HIGH -> Pending (requires user, mocked here as Deny for safety demonstration)
        // - MEDIUM -> Auto-Approve (Fast)
        // - LOW -> Auto-Approve (Fast)

        if (risk === 'CRITICAL') {
            console.log(`[Approval] CRITICAL ACTION BLOCKED: ${action}`);
            request.status = 'DENIED';
        } else if (risk === 'HIGH') {
            console.log(`[Approval] HIGH RISK ACTION PENDING: ${action} - requires explicit YES.`);
            // In real app, send push notification or wait for signal. 
            // For now, fail safe.
            request.status = 'DENIED';
        } else {
            console.log(`[Approval] AUTO-APPROVED: ${action} (Risk: ${risk})`);
            request.status = 'AUTO_APPROVED';
        }

        // Ideally persist to DB
        // await db.approvalRequest.create({ data: request });

        return request;
    }
}
