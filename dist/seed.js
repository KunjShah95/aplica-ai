import { db, connectDatabase, disconnectDatabase } from './db/index.js';
import { personaService } from './agents/persona.js';
import { toolRegistry } from './agents/tools.js';
import { hashPassword } from './auth/password.js';
async function initializeDatabase(options = {}) {
    const { clean = false, sampleData = true } = options;
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Alpicia Database Seeder');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    try {
        await connectDatabase();
        if (clean) {
            console.log('🧹 Cleaning existing data...');
            await db.session.deleteMany({});
            await db.apiKey.deleteMany({});
            await db.auditLog.deleteMany({});
            await db.notification.deleteMany({});
            await db.memory.deleteMany({});
            await db.message.deleteMany({});
            await db.conversation.deleteMany({});
            await db.workflowExecution.deleteMany({});
            await db.workflow.deleteMany({});
            await db.workflowTrigger.deleteMany({});
            await db.scheduledTask.deleteMany({});
            await db.taskRun.deleteMany({});
            await db.documentChunk.deleteMany({});
            await db.knowledgeDocument.deleteMany({});
            await db.knowledgeBase.deleteMany({});
            await db.workspace.deleteMany({});
            await db.teamMember.deleteMany({});
            await db.team.deleteMany({});
            await db.toolExecution.deleteMany({});
            await db.tool.deleteMany({});
            await db.agentPersona.deleteMany({});
            await db.plugin.deleteMany({});
            await db.webhookDelivery.deleteMany({});
            await db.webhook.deleteMany({});
            await db.integration.deleteMany({});
            await db.oAuthAccount.deleteMany({});
            await db.userPreference.deleteMany({});
            await db.user.deleteMany({});
            console.log('  Done!\n');
        }
        console.log('Seeding default agent personas...');
        await personaService.seedDefaults();
        const personas = await personaService.list();
        console.log(`  Created ${personas.length} personas`);
        console.log('\nSeeding built-in tools...');
        await toolRegistry.seedBuiltinTools();
        const tools = await toolRegistry.list();
        console.log(`  Registered ${tools.length} tools`);
        if (sampleData) {
            console.log('\nCreating sample data...');
            console.log('  Creating default user...');
            const defaultUser = await db.user.create({
                data: {
                    email: 'admin@alpicia.dev',
                    username: 'admin',
                    passwordHash: await hashPassword('alpicia2024'),
                    displayName: 'Alpicia Admin',
                    bio: 'System Administrator',
                    role: 'ADMIN',
                    status: 'ACTIVE',
                },
            });
            console.log(`    User: ${defaultUser.email} (password: alpicia2024)`);
            console.log('  Creating test user...');
            const testUser = await db.user.create({
                data: {
                    email: 'user@example.com',
                    username: 'testuser',
                    passwordHash: await hashPassword('testpass123'),
                    displayName: 'Test User',
                    bio: 'Test account for development',
                    role: 'USER',
                    status: 'ACTIVE',
                },
            });
            console.log(`    User: ${testUser.email} (password: testpass123)`);
            console.log('  Creating sample team...');
            const team = await db.team.create({
                data: {
                    name: 'Alpicia Team',
                    slug: 'alpicia-team',
                    description: 'Default team for Alpicia',
                    ownerId: defaultUser.id,
                    members: {
                        create: [
                            { userId: defaultUser.id, role: 'OWNER' },
                            { userId: testUser.id, role: 'MEMBER' },
                        ],
                    },
                },
            });
            console.log(`    Team: ${team.name}`);
            console.log('  Creating sample workspace...');
            const workspace = await db.workspace.create({
                data: {
                    teamId: team.id,
                    name: 'Default Workspace',
                    description: 'Main workspace for the team',
                },
            });
            console.log(`    Workspace: ${workspace.name}`);
            console.log('  Creating sample conversation...');
            const conversation = await db.conversation.create({
                data: {
                    userId: testUser.id,
                    workspaceId: workspace.id,
                    title: 'Getting Started',
                    platform: 'api',
                    messages: {
                        create: [
                            {
                                role: 'USER',
                                content: 'Hello, how can you help me today?',
                            },
                            {
                                role: 'ASSISTANT',
                                content: 'Hello! I am Alpicia, your AI personal assistant. I can help you with a variety of tasks including:\n\n- Answering questions\n- Managing your calendar\n- Sending emails\n- Running commands\n- And much more!\n\nHow can I assist you today?',
                            },
                        ],
                    },
                },
            });
            console.log(`    Conversation: ${conversation.title}`);
            console.log('  Creating sample knowledge base...');
            const kb = await db.knowledgeBase.create({
                data: {
                    workspaceId: workspace.id,
                    name: 'Documentation',
                    description: 'Sample knowledge base with documentation',
                    documents: {
                        create: [
                            {
                                title: 'Getting Started Guide',
                                content: '# Getting Started with Alpicia\n\nWelcome to Alpicia! This guide will help you get started...\n\n## Features\n- Multi-platform messaging\n- Browser automation\n- Memory persistence\n- And more!',
                                sourceType: 'TEXT',
                                status: 'INDEXED',
                            },
                            {
                                title: 'API Reference',
                                content: '# API Reference\n\n## Authentication\nAll API requests require authentication...\n\n## Endpoints\n- /api/auth/* - Authentication\n- /api/conversations/* - Conversations\n- /api/memory/* - Memory management',
                                sourceType: 'TEXT',
                                status: 'INDEXED',
                            },
                        ],
                    },
                },
            });
            console.log(`    Knowledge Base: ${kb.name}`);
            console.log('  Creating sample workflow...');
            const workflow = await db.workflow.create({
                data: {
                    userId: defaultUser.id,
                    name: 'Daily Report',
                    description: 'Generate a daily summary report',
                    nodes: [
                        { id: '1', type: 'trigger', data: { type: 'cron', config: '0 9 * * *' } },
                        { id: '2', type: 'action', data: { action: 'fetch_data' } },
                        { id: '3', type: 'action', data: { action: 'generate_report' } },
                    ],
                    edges: [
                        { id: 'e1', source: '1', target: '2' },
                        { id: 'e2', source: '2', target: '3' },
                    ],
                    isActive: true,
                },
            });
            console.log(`    Workflow: ${workflow.name}`);
            console.log('  Creating sample memories...');
            await db.memory.createMany({
                data: [
                    {
                        userId: testUser.id,
                        type: 'FACT',
                        content: 'User prefers dark mode interface',
                        tags: ['preference', 'ui'],
                        importance: 0.8,
                    },
                    {
                        userId: testUser.id,
                        type: 'PREFERENCE',
                        content: 'User likes concise responses',
                        tags: ['preference', 'communication'],
                        importance: 0.7,
                    },
                    {
                        userId: testUser.id,
                        type: 'FACT',
                        content: 'User works in software development',
                        tags: ['profession', 'work'],
                        importance: 0.6,
                    },
                ],
            });
            console.log('    Created 3 sample memories');
            console.log('  Creating sample integration...');
            await db.integration.create({
                data: {
                    name: 'Webhook Handler',
                    type: 'webhook',
                    config: { url: 'https://example.com/webhook' },
                    isActive: true,
                },
            });
            console.log('    Created webhook integration');
        }
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('  Database seeding complete!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('\n📋 Login credentials:');
        console.log('   Admin: admin@alpicia.dev / alpicia2024');
        console.log('   User:  user@example.com / testpass123');
        console.log('\n⚠️  Change these passwords in production!');
    }
    catch (error) {
        console.error('\n❌ Database seeding failed:', error);
        throw error;
    }
    finally {
        await disconnectDatabase();
    }
}
const args = process.argv.slice(2);
const options = {
    clean: args.includes('--clean'),
    sampleData: !args.includes('--no-sample-data'),
};
initializeDatabase(options).catch(console.error);
//# sourceMappingURL=seed.js.map