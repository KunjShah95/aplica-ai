#!/usr/bin/env node
import { configLoader } from './config/loader.js';
import { GatewayServer } from './gateway/index.js';
import { connectDatabase, disconnectDatabase } from './db/index.js';
import { apiServer } from './api/server.js';
import { pluginManager } from './plugins/index.js';
import { postgresMemory } from './memory/postgres.js';
import { createEmbeddingProvider } from './memory/embeddings.js';
import { scheduler } from './workflows/index.js';
import { personaService, toolRegistry } from './agents/index.js';

async function main(): Promise<void> {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Alpicia - AI Personal Assistant');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    if (process.argv[2] === 'dashboard') {
      console.log('      Mode: Viral Dashboard (Offline Mock)\n');
      // Mock connection for dashboard
    } else {
      console.log('[1/6] Connecting to PostgreSQL database...');
      await connectDatabase();
      console.log('      Database connected successfully\n');
    }

    if (process.argv[2] !== 'dashboard') {
      console.log('[2/6] Initializing embedding provider...');
      // ... (existing embedding logic)
      const embeddingType = (process.env.EMBEDDING_PROVIDER as 'openai' | 'ollama') || 'openai';
      if (process.env.OPENAI_API_KEY || embeddingType === 'ollama') {
        const embeddingProvider = createEmbeddingProvider(embeddingType);
        postgresMemory.setEmbeddingProvider(embeddingProvider);
        console.log(`      Provider: ${embeddingType}\n`);
      } else {
        console.log('      No embedding provider configured (vector search disabled)\n');
      }

      console.log('[3/6] Loading plugins...');
      await pluginManager.loadFromDirectory();
      console.log(`      Loaded ${pluginManager.getLoaded().length} plugins\n`);

      console.log('[4/6] Initializing agents and tools...');
      await personaService.seedDefaults();
      await toolRegistry.seedBuiltinTools();
      const personas = await personaService.list();
      const tools = await toolRegistry.getEnabled();
      console.log(`      ${personas.length} personas, ${tools.length} tools available\n`);

      console.log('[5/6] Loading configuration...');
      const config = await configLoader.load(); // Load strictly for services
    }

    // Dashboard logic
    if (process.argv[2] === 'dashboard') {
      const { startInteractiveDashboard } = await import('./cli/dashboard-interactive.js');
      await startInteractiveDashboard();
      return; // Exit main flow, dashboard runs its own loop
    }

    const config = await configLoader.load(); // Reload if needed or move up scope (refactoring for cleaner flow)
    console.log(`      Name: ${config.soul.name} v${config.soul.version}`);
    // ...

    console.log('[6/6] Starting services...');

    if (process.argv[2] === 'cli') {
      console.log('      Mode: CLI\n');
      const { startCLI } = await import('./cli/index.js');
      await startCLI(config);
    } else if (process.argv[2] === 'api') {
      console.log('      Mode: API Server\n');
      await apiServer.start();
      await scheduler.start();
    } else {
      console.log('      Mode: Full (API + Gateway + Scheduler)\n');
      await apiServer.start();
      await scheduler.start();
      await import('./workflows/daily-tasks.js').then((m) => m.setupDailyTasks());
      const gateway = new GatewayServer(config);
      await gateway.start();
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Alpicia is running! Press Ctrl+C to stop.');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const shutdown = async (signal: string) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      scheduler.stop();
      await disconnectDatabase();
      console.log('Goodbye!');
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error(
      '\nFailed to start Alpicia:',
      error instanceof Error ? error.message : String(error)
    );
    await disconnectDatabase();
    process.exit(1);
  }
}

main();
