import * as readline from 'readline';
import { viralEngine } from '../viral/index.js';
export async function handleChat(context) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    const conversation = [];
    console.log('\n' + '─'.repeat(50));
    console.log('  💬  Chat Mode');
    console.log('─'.repeat(50));
    console.log('  Type your messages. Press Ctrl+C or type "exit" to quit.');
    console.log('  Type "help" for tips, "clear" to clear the conversation.\n');
    const tips = [
        '💡 Tip: Be specific in your requests for better results',
        '💡 Tip: You can ask me to remember things for later',
        '💡 Tip: Use "clear" to start a fresh conversation',
        '💡 Tip: Ask me to explain things in different ways',
    ];
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    console.log(`  ${randomTip}\n`);
    const askQuestion = () => {
        rl.question('You: ', async (input) => {
            const trimmed = input.trim().toLowerCase();
            if (trimmed === 'exit' || trimmed === 'quit') {
                console.log('\n👋 Goodbye! It was great chatting with you!\n');
                rl.close();
                return;
            }
            if (trimmed === 'clear') {
                conversation.length = 0;
                console.log('\n  ✓ Conversation cleared\n');
                askQuestion();
                return;
            }
            if (trimmed === 'help' || trimmed === '?') {
                console.log('\n  📖 Chat Commands:');
                console.log('    help, ?    - Show this help message');
                console.log('    clear      - Clear conversation history');
                console.log('    exit, quit - Exit chat mode\n');
                askQuestion();
                return;
            }
            if (!input.trim()) {
                askQuestion();
                return;
            }
            conversation.push({ role: 'user', content: input });
            try {
                process.stdout.write('Assistant: ');
                const result = await context.llm.complete(conversation);
                console.log(result.content);
                conversation.push({ role: 'assistant', content: result.content });
            }
            catch (error) {
                console.error('\n  ❌ Error:', error instanceof Error ? error.message : String(error));
                console.log('  Please try again or type "help" for assistance.\n');
            }
            askQuestion();
        });
    };
    askQuestion();
}
export async function handleStatus(context) {
    const llmAvailable = context.llm.isAvailable();
    console.log('\n' + '─'.repeat(50));
    console.log('  📊 System Status');
    console.log('─'.repeat(50));
    console.log(`  🤖 Assistant: ${context.config.soul.name} v${context.config.soul.version}`);
    console.log(`  🧠 LLM:       ${context.config.llm.provider} (${context.config.llm.model})`);
    console.log(`  📡 Status:    ${llmAvailable ? '🟢 Online' : '🔴 Offline'}`);
    console.log('\n  📱 Integrations:');
    console.log(`    • Telegram:   ${context.config.messaging.telegram?.enabled ? '🟢 Enabled' : '🔴 Disabled'}`);
    console.log(`    • Discord:    ${context.config.messaging.discord?.enabled ? '🟢 Enabled' : '🔴 Disabled'}`);
    console.log(`    • WebSocket:  ${context.config.messaging.websocket?.enabled ? '🟢 Enabled' : '🔴 Disabled'}`);
    console.log('\n  🔧 Features:');
    console.log(`    • Memory:     ${context.config.memory.type}`);
    console.log(`    • Sandbox:    ${context.config.security.sandboxEnabled ? '🟢 Enabled' : '🔴 Disabled'}`);
    console.log(`    • Rate Limit: ${context.config.security.rateLimit.maxRequests} req/${context.config.security.rateLimit.windowMs / 1000}s`);
    console.log('\n  👤 User:');
    console.log(`    • Name:   ${context.config.user.name}`);
    console.log(`    • Memory: ${context.config.user.memoryEnabled ? '🟢 Enabled' : '🔴 Disabled'}`);
    console.log('\n' + '─'.repeat(50) + '\n');
}
export async function handleConfig(context) {
    console.log('\n' + '─'.repeat(50));
    console.log('  ⚙️  Configuration');
    console.log('─'.repeat(50));
    console.log('\n  🤖 Identity:');
    console.log(`    Name:        ${context.config.soul.name}`);
    console.log(`    Display:     ${context.config.identity.displayName} (@${context.config.identity.username})`);
    console.log(`    Version:     ${context.config.soul.version}`);
    console.log(`    Bio:         ${context.config.identity.bio}`);
    console.log('\n  🎭 Personality:');
    console.log(`    Traits:      ${context.config.soul.personality.traits.join(', ')}`);
    console.log(`    Values:      ${context.config.soul.personality.values.join(', ')}`);
    console.log(`    Tone:        ${context.config.soul.personality.defaultTone}`);
    console.log('\n  🎯 Goals:');
    context.config.soul.goals.forEach((goal, i) => {
        console.log(`    ${i + 1}. ${goal}`);
    });
    console.log('\n  ⚠️  Constraints:');
    context.config.soul.constraints.forEach((constraint, i) => {
        console.log(`    ${i + 1}. ${constraint}`);
    });
    console.log('\n' + '─'.repeat(50) + '\n');
}
export async function handleViral(context) {
    console.log('\n' + '─'.repeat(50));
    console.log('  🚀 Viral Features');
    console.log('─'.repeat(50));
    const userId = context.config.user.id || 'cli-user';
    const referralCode = await viralEngine.generateReferralCode(userId);
    const stats = await viralEngine.getReferralStats(userId);
    console.log('\n  📊 Your Stats:');
    console.log(`    Rank:          #${stats.rank}`);
    console.log(`    Score:          ${stats.score.toLocaleString()} points`);
    console.log(`    Referrals:      ${stats.totalReferrals}`);
    console.log(`    Shares:         ${stats.totalShares}`);
    console.log('\n  🔗 Your Referral Code:');
    console.log(`    ${referralCode}`);
    console.log('\n  📢 Share on Social Media:');
    console.log('    alpicia share twitter   - Share on Twitter');
    console.log('    alpicia share github    - Share on GitHub');
    console.log('    alpicia share discord   - Share on Discord');
    console.log('    alpicia share linkedin  - Share on LinkedIn');
    console.log('\n  🏆 Leaderboard:');
    const leaderboard = await viralEngine.getLeaderboard(5);
    if (leaderboard.length > 0) {
        leaderboard.forEach((entry) => {
            const medal = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : '  ';
            console.log(`    ${medal} #${entry.rank} User ${entry.userId.substring(0, 6)}... - ${entry.score.toLocaleString()} pts`);
        });
    }
    else {
        console.log('    No rankings yet. Be the first!');
    }
    console.log('\n' + '─'.repeat(50) + '\n');
}
export async function handleShare(context, platform) {
    const validPlatforms = ['twitter', 'github', 'discord', 'linkedin'];
    const normalizedPlatform = platform.toLowerCase();
    if (!validPlatforms.includes(normalizedPlatform)) {
        console.log('\n  ❌ Invalid platform');
        console.log('  Valid platforms: twitter, github, discord, linkedin');
        console.log('  Usage: alpicia share <platform>\n');
        return;
    }
    const userId = context.config.user.id || 'cli-user';
    const referralCode = await viralEngine.generateReferralCode(userId);
    const content = viralEngine.generateShareContent(normalizedPlatform, referralCode);
    await viralEngine.recordShare(userId, platform);
    console.log('\n' + '─'.repeat(50));
    console.log(`  📢 Share on ${platform.charAt(0).toUpperCase() + platform.slice(1)}`);
    console.log('─'.repeat(50));
    console.log(`\n${content.message}\n`);
    console.log('  🔗 URL:', content.url);
    console.log('\n  ✅ Ready to share!\n');
}
export async function handleSecurity(context) {
    console.log('\n' + '─'.repeat(50));
    console.log('  🔒 Security Settings');
    console.log('─'.repeat(50));
    console.log('\n  🛡️  Protection:');
    console.log(`    Sandbox:       ${context.config.security.sandboxEnabled ? '🟢 Enabled' : '🔴 Disabled'}`);
    console.log(`    Rate Limiting: 🟢 Enabled`);
    console.log('\n  ⚡ Rate Limits:');
    console.log(`    Window:        ${context.config.security.rateLimit.windowMs / 1000} seconds`);
    console.log(`    Max Requests:  ${context.config.security.rateLimit.maxRequests}`);
    console.log('\n  🚫 Blocked Commands:');
    if (context.config.security.blockedCommands.length > 0) {
        context.config.security.blockedCommands.forEach((cmd) => {
            console.log(`    • ${cmd}`);
        });
    }
    else {
        console.log('    (none)');
    }
    console.log('\n  ✅ Allowed Commands:');
    if (context.config.security.allowedCommands.length > 0) {
        context.config.security.allowedCommands.forEach((cmd) => {
            console.log(`    • ${cmd}`);
        });
    }
    else {
        console.log('    (all)');
    }
    console.log('\n  📝 Security Tips:');
    console.log('    • Never share your API keys');
    console.log('    • Use strong, unique passwords');
    console.log('    • Enable 2FA when available');
    console.log('    • Review audit logs regularly');
    console.log('\n' + '─'.repeat(50) + '\n');
}
export async function handleOnboarding(context) {
    console.log('\n' + '═'.repeat(60));
    console.log('  🎉 Welcome to ' + context.config.soul.name + '!');
    console.log('═'.repeat(60));
    console.log(`
  Hi! I'm ${context.config.identity.displayName}, your AI assistant.
  
  I'm here to help you with:
    • Answering questions and providing information
    • Writing and debugging code
    • Brainstorming ideas and creative tasks
    • Automating repetitive tasks
    • And much more!
  
  Let's get you started:
  `);
    console.log('  📖 Quick Start:');
    console.log('    1. Type "chat" to start a conversation');
    console.log('    2. Type "status" to see system info');
    console.log('    3. Type "help" for all commands');
    console.log('    4. Type "config" to see my settings');
    console.log('\n  🔗 Useful Links:');
    console.log('    • Docs:    Check the docs/ folder');
    console.log('    • GitHub:  github.com/openclaw/openclaw');
    console.log('    • Discord: Join our community');
    console.log('\n  💡 Pro Tips:');
    console.log('    • Be specific in your requests');
    console.log('    • Ask me to explain things differently');
    console.log('    • Tell me about your preferences');
    console.log("    • Don't hesitate to ask for help!");
    console.log('\n' + '═'.repeat(60));
    console.log(`  Let's start! Type "chat" to begin.\n`);
}
export async function handleHelp() {
    console.log('\n' + '─'.repeat(50));
    console.log('  📖 Help - Available Commands');
    console.log('─'.repeat(50));
    console.log('\n  💬 Chat:');
    console.log('    chat     - Start interactive chat mode');
    console.log('    clear    - Clear conversation (in chat)');
    console.log('\n  📊 Status:');
    console.log('    status   - Show system status and health');
    console.log('    security - Show security settings');
    console.log('\n  ⚙️  Configuration:');
    console.log('    config   - Show assistant configuration');
    console.log('\n  🚀 Social:');
    console.log('    viral    - Show viral stats');
    console.log('    share <platform> - Share on social media');
    console.log('              (twitter, github, discord, linkedin)');
    console.log('\n  🎮 General:');
    console.log('    help     - Show this help message');
    console.log('    onboard  - Show welcome message');
    console.log('    exit     - Exit the CLI');
    console.log('\n  ⌨️  Shortcuts:');
    console.log('    ?        - Same as help');
    console.log('    quit     - Same as exit');
    console.log('\n' + '─'.repeat(50));
    console.log('  💡 Tip: Use TAB for command completion!\n');
}
//# sourceMappingURL=commands.js.map