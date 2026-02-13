import { scheduler } from './scheduler.js';
import { workflowEngine } from './engine.js';
import { db } from '../db/index.js';

export async function setupDailyTasks() {
    const user = await db.user.findFirst();
    if (!user) {
        console.error('No user found for workflows');
        return;
    }

    // 1. Codebase Health Check
    await workflowEngine.createWorkflow({
        name: 'Daily Codebase Health Check',
        description: 'Runs security audit and checks every morning',
        triggers: [{ type: 'CRON', config: { cron: '0 8 * * *' } }], // 8 AM
        steps: [
            {
                id: 'run_audit',
                name: 'Run Security Audit',
                type: 'TOOL_EXECUTION',
                config: {
                    tool: 'run_shell',
                    input: {
                        command: 'npm',
                        args: ['run', 'audit']
                    }
                },
                onSuccess: 'analyze_audit'
            },
            {
                id: 'analyze_audit',
                name: 'Analyze Audit Results',
                type: 'LLM_PROMPT',
                config: {
                    systemPrompt: 'You are a security engineer. Analyze the audit output and provide a summary of critical vulnerabilities. Be concise.',
                    prompt: 'Audit Output:\n{{stepResults.run_audit.output}}'
                },
                onSuccess: 'notify_user'
            },
            {
                id: 'notify_user',
                name: 'Send Health Report',
                type: 'NOTIFICATION',
                config: {
                    userId: user.id,
                    title: 'Daily Codebase Health Report',
                    content: '{{stepResults.analyze_audit.content}}'
                }
            }
        ],
        isEnabled: true
    }, user.id);

    // 2. Weekly Database Backup
    await workflowEngine.createWorkflow({
        name: 'Weekly Database Backup',
        description: 'Backs up the database every Sunday',
        triggers: [{ type: 'CRON', config: { cron: '0 2 * * 0' } }], // Sunday 2 AM
        steps: [
            {
                id: 'backup_db',
                name: 'Dump Database',
                type: 'TOOL_EXECUTION',
                config: {
                    tool: 'run_shell',
                    input: {
                        command: 'npm',
                        args: ['run', 'db:backup']
                    }
                },
                onSuccess: 'notify_admin'
            },
            {
                id: 'notify_admin',
                name: 'Backup Notification',
                type: 'NOTIFICATION',
                config: {
                    userId: user.id,
                    title: 'Database Backup Completed',
                    content: 'Database backup task completed.'
                }
            }
        ],
        isEnabled: true
    }, user.id);

    console.log('Daily tasks workflows setup complete.');
}
