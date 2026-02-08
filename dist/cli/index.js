#!/usr/bin/env node
import * as readline from 'readline';
import { configLoader } from '../config/loader.js';
import { createProvider } from '../core/llm/index.js';
import { handleChat, handleStatus, handleConfig, handleHelp } from './commands.js';
export async function startCLI(config) {
    const llm = createProvider(config.llm);
    if (!llm.isAvailable()) {
        console.error('LLM provider not configured. Please set LLM_API_KEY in your environment.');
        console.error('   Copy .env.example to .env and add your API key.\n');
        process.exit(1);
    }
    const context = { config, llm };
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: '> '
    });
    console.log('Alpicia ready!');
    console.log("Type 'help' for available commands.\n");
    rl.prompt();
    rl.on('line', async (input) => {
        const command = input.trim().toLowerCase();
        switch (command) {
            case 'chat':
                await rl.close();
                await handleChat(context);
                return;
            case 'status':
                await handleStatus(context);
                break;
            case 'config':
                await handleConfig(context);
                break;
            case 'help':
                await handleHelp();
                break;
            case 'exit':
            case 'quit':
                console.log('\nGoodbye!\n');
                rl.close();
                process.exit(0);
            default:
                if (command) {
                    console.log(`Unknown command: ${command}. Type 'help' for available commands.`);
                }
        }
        rl.prompt();
    });
    rl.on('close', () => {
        console.log('\nGoodbye!\n');
        process.exit(0);
    });
}
async function main() {
    console.log('\nAlpicia CLI');
    console.log('Loading configuration...\n');
    try {
        const config = await configLoader.load();
        await startCLI(config);
    }
    catch (error) {
        console.error('Error starting Alpicia:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
//# sourceMappingURL=index.js.map