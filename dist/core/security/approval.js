import { db } from '../../db/index.js';
import { sanitizeLogData } from '../../security/encryption.js';
import { EventEmitter } from 'events';
export const approvalEvents = new EventEmitter();
export class ApprovalManager {
    static pendingRequests = new Map();
    static async request(userId, action, details, risk = 'MEDIUM') {
        // Log the request
        const request = {
            id: crypto.randomUUID(),
            userId,
            action,
            details: JSON.stringify(details),
            status: 'PENDING',
            riskLevel: risk,
            timestamp: new Date()
        };
        try {
            await db.auditLog.create({
                data: {
                    userId,
                    action: 'approval_request',
                    resource: action,
                    details: sanitizeLogData({
                        riskLevel: risk,
                        status: request.status,
                        details
                    }),
                    status: 'pending',
                },
            });
        }
        catch {
        }
        // For viral demo purposes:
        // - CRITICAL -> Deny immediately (Safe)
        // - HIGH -> Pending (requires user, mocked here as Deny for safety demonstration)
        // - MEDIUM -> Auto-Approve (Fast)
        // - LOW -> Auto-Approve (Fast)
        const requireManual = process.env.APPROVAL_REQUIRE_MANUAL === 'true';
        if (risk === 'CRITICAL') {
            console.log(`[Approval] CRITICAL ACTION BLOCKED: ${action}`);
            request.status = 'DENIED';
        }
        else if (risk === 'HIGH') {
            if (requireManual) {
                console.log(`[Approval] HIGH RISK ACTION PENDING: ${action} - requires explicit YES.`);
                request.status = 'PENDING';
            }
            else {
                console.log(`[Approval] HIGH RISK ACTION BLOCKED: ${action}`);
                request.status = 'DENIED';
            }
        }
        else {
            console.log(`[Approval] AUTO-APPROVED: ${action} (Risk: ${risk})`);
            request.status = 'AUTO_APPROVED';
        }
        if (request.status === 'PENDING') {
            this.pendingRequests.set(request.id, request);
            approvalEvents.emit('pending', { type: 'pending', request });
        }
        try {
            await db.auditLog.create({
                data: {
                    userId,
                    action: 'approval_result',
                    resource: action,
                    details: sanitizeLogData({
                        riskLevel: risk,
                        status: request.status,
                    }),
                    status: request.status === 'AUTO_APPROVED' ? 'success' : 'failure',
                },
            });
        }
        catch {
        }
        if (request.status !== 'PENDING') {
            approvalEvents.emit('decision', { type: 'decision', request });
        }
        // Ideally persist to DB
        // await db.approvalRequest.create({ data: request });
        return request;
    }
    static list(userId) {
        const requests = Array.from(this.pendingRequests.values());
        if (!userId)
            return requests;
        return requests.filter((request) => request.userId === userId);
    }
    static get(requestId) {
        return this.pendingRequests.get(requestId) || null;
    }
    static async approve(requestId, approverId) {
        const request = this.pendingRequests.get(requestId);
        if (!request)
            return null;
        request.status = 'APPROVED';
        this.pendingRequests.delete(requestId);
        approvalEvents.emit('decision', { type: 'decision', request });
        try {
            await db.auditLog.create({
                data: {
                    userId: approverId,
                    action: 'approval_override',
                    resource: request.action,
                    details: sanitizeLogData({ requestId, status: request.status }),
                    status: 'success',
                },
            });
        }
        catch {
        }
        return request;
    }
    static async deny(requestId, approverId) {
        const request = this.pendingRequests.get(requestId);
        if (!request)
            return null;
        request.status = 'DENIED';
        this.pendingRequests.delete(requestId);
        approvalEvents.emit('decision', { type: 'decision', request });
        try {
            await db.auditLog.create({
                data: {
                    userId: approverId,
                    action: 'approval_override',
                    resource: request.action,
                    details: sanitizeLogData({ requestId, status: request.status }),
                    status: 'failure',
                },
            });
        }
        catch {
        }
        return request;
    }
}
//# sourceMappingURL=approval.js.map