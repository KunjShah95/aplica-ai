#!/usr/bin/env node
import { configLoader } from './config/loader.js';
import { GatewayServer } from './gateway/index.js';

async function main(): Promise<void> {
  console.log('SentinelBot - AI Personal Assistant\n');

  try {
    const config = await configLoader.load();
    console.log(`Loaded configuration: ${config.soul.name} v${config.soul.version}`);
    console.log(`Identity: ${config.identity.displayName}`);
    console.log(`LLM: ${config.llm.provider}/${config.llm.model}`);
    console.log(`Messaging: ${Object.entries(config.messaging).filter(([_, v]) => v?.enabled).map(([k]) => k).join(', ') || 'none'}\n`);

    if (process.argv[2] === 'cli') {
      const { startCLI } = await import('./cli/index.js');
      await startCLI(config);
    } else {
      const gateway = new GatewayServer(config);
      await gateway.start();
    }
  } catch (error) {
    console.error('Failed to start SentinelBot:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
