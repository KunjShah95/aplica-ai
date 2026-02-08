
import { db } from '../db/index.js';
import * as fs from 'fs';

async function verify() {
    try {
        const workflowCount = await db.workflow.count();
        const taskCount = await db.scheduledTask.count();
        const workflows = await db.workflow.findMany({ select: { name: true, isActive: true } });
        const tasks = await db.scheduledTask.findMany({ select: { name: true, nextRunAt: true } });

        const result = {
            workflowCount,
            taskCount,
            workflows,
            tasks
        };

        console.log('Verification Result:', JSON.stringify(result, null, 2));
        fs.writeFileSync('c:/new/verify_output.json', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Error verifying DB:', error);
        fs.writeFileSync('c:/new/verify_output.json', JSON.stringify({ error: String(error) }, null, 2));
    } finally {
        await db.$disconnect();
    }
}

verify();
