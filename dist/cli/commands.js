import * as readline from 'readline';
import { viralEngine } from '../viral/index.js';
export async function handleChat(context) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    const conversation = [];
    console.log('\nAlpicia Chat Mode');
    console.log('Type your messages. Press Ctrl+C or type "exit" to quit.\n');
    const askQuestion = () => {
        rl.question('You: ', async (input) => {
            if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
                console.log('\nGoodbye!');
                rl.close();
                return;
            }
            conversation.push({ role: 'user', content: input });
            try {
                console.log('Alpicia: ');
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
    console.log('\nSystem Status');
    console.log('='.repeat(40));
    console.log(`Name: ${context.config.soul.name} v${context.config.soul.version}`);
    console.log(`LLM Provider: ${context.config.llm.provider}`);
    console.log(`LLM Model: ${context.config.llm.model}`);
    console.log(`LLM Available: ${context.llm.isAvailable()}`);
    console.log(`Telegram: ${context.config.messaging.telegram?.enabled ? 'enabled' : 'disabled'}`);
    console.log(`Discord: ${context.config.messaging.discord?.enabled ? 'enabled' : 'disabled'}`);
    console.log(`WebSocket: ${context.config.messaging.websocket?.enabled ? 'enabled' : 'disabled'}`);
    console.log(`Memory: ${context.config.memory.type}`);
    console.log(`Sandbox: ${context.config.security.sandboxEnabled ? 'enabled' : 'disabled'}`);
    console.log('='.repeat(40) + '\n');
}
export async function handleConfig(context) {
    console.log('\nConfiguration');
    console.log('='.repeat(40));
    console.log(`SOUL Name: ${context.config.soul.name}`);
    console.log(`Identity: ${context.config.identity.displayName} (@${context.config.identity.username})`);
    console.log(`Personality Traits: ${context.config.soul.personality.traits.join(', ')}`);
    console.log(`Default Tone: ${context.config.soul.personality.defaultTone}`);
    console.log(`User: ${context.config.user.name}`);
    console.log(`Memory Enabled: ${context.config.user.memoryEnabled}`);
    console.log('='.repeat(40) + '\n');
}
export async function handleViral(context) {
    console.log('\n🚀 Alpicia Viral Features');
    console.log('='.repeat(40));
    const userId = context.config.user.id || 'cli-user';
    const referralCode = await viralEngine.generateReferralCode(userId);
    const stats = await viralEngine.getReferralStats(userId);
    console.log(`\n📊 Your Viral Stats:`);
    console.log(`   Rank: #${stats.rank}`);
    console.log(`   Score: ${stats.score.toLocaleString()}`);
    console.log(`   Total Referrals: ${stats.totalReferrals}`);
    console.log(`   Total Shares: ${stats.totalShares}`);
    console.log(`\n🔗 Your Referral Code: ${referralCode}`);
    console.log(`\n📢 Share Alpicia:`);
    console.log(`   Twitter: alpicia share twitter`);
    console.log(`   GitHub:  alpicia share github`);
    console.log(`   Discord: alpicia share discord`);
    console.log(`   LinkedIn: alpicia share linkedin`);
    console.log(`\n🏆 Community Leaderboard:`);
    const leaderboard = await viralEngine.getLeaderboard(5);
    leaderboard.forEach((entry) => {
        console.log(`   ${entry.rank}. User ${entry.userId.substring(0, 8)}... - ${entry.score.toLocaleString()} pts`);
    });
    console.log('\n' + '='.repeat(40) + '\n');
}
export async function handleShare(context, platform) {
    const userId = context.config.user.id || 'cli-user';
    const referralCode = await viralEngine.generateReferralCode(userId);
    const content = viralEngine.generateShareContent(platform, referralCode);
    await viralEngine.recordShare(userId, platform);
    console.log(`\n📢 Share on ${platform.charAt(0).toUpperCase() + platform.slice(1)}:`);
    console.log('='.repeat(40));
    console.log(content.message);
    console.log('='.repeat(40));
    console.log(`\n🔗 URL: ${content.url}`);
    console.log(`\n✨ Copied to clipboard! (simulated)`);
    console.log(`\n💡 Pro tip: Use "alpicia viral" to see your stats!\n`);
}
export async function handleHelp() {
    console.log('\nAvailable Commands');
    console.log('='.repeat(40));
    console.log('  chat     - Start interactive chat mode');
    console.log('  status   - Show system status');
    console.log('  config   - Show current configuration');
    console.log('  viral    - Show viral stats and referral code');
    console.log('  share <platform> - Share Alpicia on social media');
    console.log('  help     - Show this help message');
    console.log('  exit     - Exit the CLI');
    console.log('='.repeat(40) + '\n');
}
//# sourceMappingURL=commands.js.map