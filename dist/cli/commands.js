import * as readline from 'readline';
export async function handleChat(context) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    const conversation = [];
    console.log('\n🤖 SentinelBot Chat Mode');
    console.log('Type your messages. Press Ctrl+C or type "exit" to quit.\n');
    const askQuestion = () => {
        rl.question('You: ', async (input) => {
            if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
                console.log('\n👋 Goodbye!');
                rl.close();
                return;
            }
            conversation.push({ role: 'user', content: input });
            try {
                console.log('Sentinel: ');
                const result = await context.llm.complete(conversation);
                console.log(result.content);
                conversation.push({ role: 'assistant', content: result.content });
            }
            catch (error) {
                console.error('Error:', error instanceof Error ? error.message : String(error));
            }
            askQuestion();
        });
    };
    askQuestion();
}
export async function handleStatus(context) {
    console.log('\n📊 System Status');
    console.log('='.repeat(40));
    console.log(`Name: ${context.config.soul.name} v${context.config.soul.version}`);
    console.log(`LLM Provider: ${context.config.llm.provider}`);
    console.log(`LLM Model: ${context.config.llm.model}`);
    console.log(`LLM Available: ${context.llm.isAvailable()}`);
    console.log(`Telegram: ${context.config.messaging.telegram?.enabled ? '✅' : '❌'}`);
    console.log(`Discord: ${context.config.messaging.discord?.enabled ? '✅' : '❌'}`);
    console.log(`WebSocket: ${context.config.messaging.websocket?.enabled ? '✅' : '❌'}`);
    console.log(`Memory: ${context.config.memory.type}`);
    console.log(`Sandbox: ${context.config.security.sandboxEnabled ? '✅' : '❌'}`);
    console.log('='.repeat(40) + '\n');
}
export async function handleConfig(context) {
    console.log('\n⚙️ Configuration');
    console.log('='.repeat(40));
    console.log(`SOUL Name: ${context.config.soul.name}`);
    console.log(`Identity: ${context.config.identity.displayName} (@${context.config.identity.username})`);
    console.log(`Personality Traits: ${context.config.soul.personality.traits.join(', ')}`);
    console.log(`Default Tone: ${context.config.soul.personality.defaultTone}`);
    console.log(`User: ${context.config.user.name}`);
    console.log(`Memory Enabled: ${context.config.user.memoryEnabled}`);
    console.log('='.repeat(40) + '\n');
}
export async function handleHelp() {
    console.log('\n📖 Available Commands');
    console.log('='.repeat(40));
    console.log('  chat     - Start interactive chat mode');
    console.log('  status   - Show system status');
    console.log('  config   - Show current configuration');
    console.log('  help     - Show this help message');
    console.log('  exit     - Exit the CLI');
    console.log('='.repeat(40) + '\n');
}
//# sourceMappingURL=commands.js.map