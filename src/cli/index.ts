#!/usr/bin/env node
import * as readline from 'readline';
import { AppConfig } from '../config/types.js';
import { configLoader } from '../config/loader.js';
import { createProvider } from '../core/llm/index.js';
import {
  CLIContext,
  handleChat,
  handleStatus,
  handleConfig,
  handleHelp,
  handleViral,
  handleShare,
  handleSecurity,
  handleOnboarding,
} from './commands.js';

export async function startCLI(config: AppConfig): Promise<void> {
  const llm = createProvider(config.llm);

  if (!llm.isAvailable()) {
    console.error('\n⚠️  LLM provider not configured.');
    console.error('   Please set LLM_API_KEY in your environment.');
    console.error('   Copy .env.example to .env and add your API key.\n');
    process.exit(1);
  }

  const context: CLIContext = { config, llm };

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> ',
  });

  console.log('\n' + '═'.repeat(50));
  console.log(`  🤖 ${config.soul.name} v${config.soul.version} ready!`);
  console.log('═'.repeat(50));
  console.log("  Type 'help' for commands or 'onboard' for a tour.\n");
  rl.prompt();

  rl.on('line', async (input) => {
    const trimmed = input.trim().toLowerCase();
    const parts = trimmed.split(/\s+/);
    const command = parts[0];
    const args = parts.slice(1);

    switch (command) {
      case 'chat':
      case 'c':
        await rl.close();
        await handleChat(context);
        return;
      case 'status':
      case 's':
        await handleStatus(context);
        break;
      case 'config':
        await handleConfig(context);
        break;
      case 'viral':
      case 'v':
        await handleViral(context);
        break;
      case 'share':
        if (args[0]) {
          await handleShare(context, args[0]);
        } else {
          console.log('\n  📢 Share on social media!');
          console.log('  Usage: share <platform>');
          console.log('  Platforms: twitter, github, discord, linkedin\n');
        }
        break;
      case 'security':
      case 'sec':
        await handleSecurity(context);
        break;
      case 'onboard':
      case 'onboarding':
      case 'start':
        await handleOnboarding(context);
        break;
      case 'help':
      case '?':
        await handleHelp();
        break;
      case 'clear':
        console.log('\n  ✓ Screen cleared\n');
        break;
      case 'exit':
      case 'quit':
      case 'q':
        console.log('\n👋 Goodbye!\n');
        rl.close();
        process.exit(0);
      default:
        if (command) {
          console.log(`\n  ❓ Unknown command: ${command}`);
          console.log("  Type 'help' for available commands.\n");
        }
    }

    rl.prompt();
  });

  rl.on('close', () => {
    console.log('\n👋 Goodbye!\n');
    process.exit(0);
  });
}

async function main(): Promise<void> {
  console.log('\n🚀 ' + 'Alpicia CLI');
  console.log('Loading configuration...\n');

  try {
    const config = await configLoader.load();
    await startCLI(config);
  } catch (error) {
    console.error(
      '\n❌ Error starting Alpicia:',
      error instanceof Error ? error.message : String(error)
    );
    console.log('\n  Make sure you have:');
    console.log('    • Created SOUL.md configuration file');
    console.log('    • Set up your environment variables');
    console.log('    • Run npm install\n');
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
