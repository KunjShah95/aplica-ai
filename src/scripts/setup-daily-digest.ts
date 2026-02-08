import { scheduler } from '../workflows/scheduler.js';
import { workflowEngine } from '../workflows/engine.js';
import { db } from '../db/index.js';

async function setup() {
    console.log('Setting up Daily Digest Workflow...');

    // 1. Get default user (for ownership)
    const user = await db.user.findFirst();
    if (!user) {
        console.error('No user found in database. Please create a user first.');
        process.exit(1);
    }
    console.log(`Using user: ${user.username || user.email || user.id}`);

    // 2. Define Workflow
    const workflowName = 'Daily Tech Trends Digest';

    // Check if workflow exists
    const existingWorkflow = await db.workflow.findFirst({
        where: { name: workflowName, userId: user.id }
    });

    let workflowId = existingWorkflow?.id;

    if (existingWorkflow) {
        console.log(`Workflow '${workflowName}' already exists with ID: ${workflowId}`);
        // Optionally update it? For now we skip.
    } else {
        console.log(`Creating workflow '${workflowName}'...`);
        workflowId = await workflowEngine.createWorkflow({
            name: workflowName,
            description: 'Automated daily search and summary of tech trends.',
            triggers: [{ type: 'CRON', config: { cron: '0 9 * * *' } }],
            steps: [
                {
                    id: 'step_search',
                    name: 'Search Tech Trends',
                    type: 'TOOL_EXECUTION',
                    config: {
                        tool: 'web_search',
                        input: { query: 'latest AI technology news today' }
                    },
                    onSuccess: 'step_summarize'
                },
                {
                    id: 'step_summarize',
                    name: 'Summarize Findings',
                    type: 'LLM_PROMPT',
                    config: {
                        systemPrompt: 'You are a tech analyst. Summarize the following search results into a concise markdown daily digest.',
                        prompt: 'Here are the search results:\n\n{{stepResults.step_search.results}}',
                        temperature: 0.5
                    },
                    onSuccess: 'step_save'
                },
                {
                    id: 'step_save',
                    name: 'Save to Memory',
                    type: 'MEMORY_OPERATION',
                    config: {
                        operation: 'store',
                        data: {
                            content: '{{stepResults.step_summarize.content}}',
                            metadata: {
                                type: 'daily-digest',
                                tags: ['tech-trends', 'daily-briefing'],
                                date: '{{stepResults.step_search.timestamp}}' // We might need to inject timestamp or just let memory handle it
                            }
                        }
                    },
                    onSuccess: 'step_notify'
                },
                {
                    id: 'step_notify',
                    name: 'Notify User',
                    type: 'NOTIFICATION',
                    config: {
                        userId: user.id,
                        title: 'Daily Tech Digest',
                        content: '{{stepResults.step_summarize.content}}'
                    }
                }
            ],
            variables: {},
            isEnabled: true
        }, user.id);
        console.log(`Workflow created with ID: ${workflowId}`);
    }

    // 3. Schedule it
    const taskName = 'Trigger Daily Digest Task';

    // Check if task exists
    const existingTask = await db.scheduledTask.findFirst({
        where: { name: taskName }
    });

    if (existingTask) {
        console.log(`Scheduled task '${taskName}' already exists.`);
    } else {
        console.log(`Scheduling task '${taskName}'...`);
        if (!workflowId) throw new Error('Workflow ID is missing');

        // We need to pass the workflowId
        await scheduler.createTask({
            name: taskName,
            schedule: {
                type: 'CRON',
                cron: '0 9 * * *'
            },
            workflowId: workflowId,
            payload: {} // Payload passed to workflow inputs if needed
        });
        console.log('Scheduled task created.');
    }
}

setup()
    .catch(console.error)
    .finally(() => db.$disconnect());
