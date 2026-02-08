import { connectDatabase, disconnectDatabase } from './db/index.js';
import { personaService } from './agents/persona.js';
import { toolRegistry } from './agents/tools.js';
async function initializeDatabase() {
    console.log('Initializing Alpicia Database...\n');
    try {
        await connectDatabase();
        console.log('Seeding default agent personas...');
        await personaService.seedDefaults();
        const personas = await personaService.list();
        console.log(`  Created ${personas.length} personas`);
        console.log('Seeding built-in tools...');
        await toolRegistry.seedBuiltinTools();
        const tools = await toolRegistry.list();
        console.log(`  Registered ${tools.length} tools`);
        console.log('\nDatabase initialization complete!');
        console.log('\nNext steps:');
        console.log('  1. Ensure PostgreSQL is running with the pgvector extension');
        console.log('  2. Run: npx prisma migrate dev --name init');
        console.log('  3. Start the server: npm run dev');
    }
    catch (error) {
        console.error('Database initialization failed:', error);
        throw error;
    }
    finally {
        await disconnectDatabase();
    }
}
initializeDatabase().catch(console.error);
//# sourceMappingURL=init-db.js.map