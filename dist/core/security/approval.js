export class ApprovalManager {
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
        // For viral demo purposes:
        // - CRITICAL -> Deny immediately (Safe)
        // - HIGH -> Pending (requires user, mocked here as Deny for safety demonstration)
        // - MEDIUM -> Auto-Approve (Fast)
        // - LOW -> Auto-Approve (Fast)
        if (risk === 'CRITICAL') {
            console.log(`[Approval] CRITICAL ACTION BLOCKED: ${action}`);
            request.status = 'DENIED';
        }
        else if (risk === 'HIGH') {
            console.log(`[Approval] HIGH RISK ACTION PENDING: ${action} - requires explicit YES.`);
            // In real app, send push notification or wait for signal. 
            // For now, fail safe.
            request.status = 'DENIED';
        }
        else {
            console.log(`[Approval] AUTO-APPROVED: ${action} (Risk: ${risk})`);
            request.status = 'AUTO_APPROVED';
        }
        // Ideally persist to DB
        // await db.approvalRequest.create({ data: request });
        return request;
    }
}
//# sourceMappingURL=approval.js.map