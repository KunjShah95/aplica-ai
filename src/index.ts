#!/usr/bin/env node
// Only import what is needed before mode detection.
// Heavy modules (DB, gateway, plugins, etc.) are loaded dynamically inside
// main() so that PrismaClient and other singletons are NEVER constructed when
// running in CLI/TUI mode.
import { configLoader } from './config/loader.js';

const mode = process.argv[2];

// ── CLI / TUI mode ─────────────────────────────────────────────────────────────
// Short-circuit before any DB or service initialisation so that PrismaClient
// is never instantiated during an interactive terminal session.
if (mode === 'cli' || mode === 'tui') {
  (async () => {
    try {
      const config = await configLoader.load();
      const { runCLI } = await import('./tui/index.js');
      await runCLI(config);
    } catch (error) {
      console.error(
        'Failed to start CLI:',
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  })();
} else {
  main();
}

async function main(): Promise<void> {
  // Dynamic imports ensure these modules (and their module-level side-effects
  // such as `new PrismaClient()`) are only evaluated when actually needed.
  const { connectDatabase, disconnectDatabase } = await import('./db/index.js');
  const { GatewayServer } = await import('./gateway/index.js');
  const { apiServer } = await import('./api/server.js');
  const { pluginManager } = await import('./plugins/index.js');
  const { postgresMemory } = await import('./memory/postgres.js');
  const { createEmbeddingProvider } = await import('./memory/embeddings.js');
  const { scheduler } = await import('./workflows/index.js');
  const { personaService, toolRegistry } = await import('./agents/index.js');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Alpicia - AI Personal Assistant');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    console.log('[1/6] Connecting to PostgreSQL database...');
    await connectDatabase();
    console.log('      Database connected successfully\n');

    console.log('[2/6] Initializing embedding provider...');
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
    const config = await configLoader.load();

    console.log(`      Name: ${config.soul.name} v${config.soul.version}`);

    console.log('[6/6] Starting services...');

    if (mode === 'api') {
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
