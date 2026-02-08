import { Agent } from '../core/agent.js';
import { conversationManager } from '../core/conversation.js';
import { taskQueue } from '../core/queue.js';

export interface SessionConfig {
  thinkingLevel: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
  verboseLevel: number;
  model: string;
  sendPolicy: 'always' | 'mention' | 'never';
  groupActivation: 'mention' | 'always';
}

export interface ChatCommandContext {
  conversationId: string;
  userId: string;
  source: string;
  isOwner: boolean;
  isGroup: boolean;
}

export class ChatCommandHandler {
  private agent: Agent;
  private sessions: Map<string, SessionConfig> = new Map();
  private usageStats: Map<string, { tokens: number; messages: number; cost?: number }> = new Map();

  constructor(agent: Agent) {
    this.agent = agent;
  }

  async handleCommand(
    command: string,
    args: string[],
    context: ChatCommandContext
  ): Promise<{ response: string; success: boolean }> {
    switch (command.toLowerCase()) {
      case 'status':
        return this.cmdStatus(args, context);
      case 'new':
      case 'reset':
        return this.cmdNew(args, context);
      case 'compact':
        return this.cmdCompact(args, context);
      case 'think':
        return this.cmdThink(args, context);
      case 'verbose':
        return this.cmdVerbose(args, context);
      case 'usage':
        return this.cmdUsage(args, context);
      case 'restart':
        return this.cmdRestart(args, context);
      case 'activation':
        return this.cmdActivation(args, context);
      case 'help':
        return this.cmdHelp(args, context);
      default:
        return {
          response: `Unknown command: /${command}. Type /help for available commands.`,
          success: false,
        };
    }
  }

  private async cmdStatus(
    args: string[],
    context: ChatCommandContext
  ): Promise<{ response: string; success: boolean }> {
    const config = this.getSessionConfig(context.conversationId);
    const usage = this.usageStats.get(context.conversationId) || { tokens: 0, messages: 0 };
    const conversation = await conversationManager.get(context.conversationId);
    const messageCount = conversation?.messages.length || 0;

    const response = `**Session Status**
- Model: ${config.model}
- Thinking: ${config.thinkingLevel}
- Verbose: ${config.verboseLevel > 0 ? 'on' : 'off'}
- Messages: ${messageCount}
- Tokens used: ${usage.tokens}
${usage.cost ? `- Cost: $${usage.cost.toFixed(4)}` : ''}`;

    return { response, success: true };
  }

  private async cmdNew(
    args: string[],
    context: ChatCommandContext
  ): Promise<{ response: string; success: boolean }> {
    await conversationManager.close(context.conversationId);

    const newConversation = await conversationManager.create(context.userId, {
      platform: context.source as any,
      title: args.join(' ') || undefined,
      tags: [],
    });

    this.sessions.delete(context.conversationId);

    return { response: 'Started a new conversation. How can I help you?', success: true };
  }

  private async cmdReset(
    args: string[],
    context: ChatCommandContext
  ): Promise<{ response: string; success: boolean }> {
    return this.cmdNew(args, context);
  }

  private async cmdCompact(
    args: string[],
    context: ChatCommandContext
  ): Promise<{ response: string; success: boolean }> {
    const conversation = await conversationManager.get(context.conversationId);
    if (!conversation) {
      return { response: 'No active conversation found.', success: false };
    }

    const summary = await this.summarizeConversation(conversation);

    await conversationManager.archive(context.conversationId);

    const newConversation = await conversationManager.create(context.userId, {
      platform: context.source as any,
      title: `Compacted: ${conversation.metadata.title || 'Conversation'}`,
      tags: ['compacted', ...conversation.metadata.tags],
    });

    await conversationManager.addMessage(
      newConversation.id,
      'system',
      `Summary of previous conversation:\n${summary}`
    );

    return {
      response: 'Conversation context has been compacted. What would you like to work on next?',
      success: true,
    };
  }

  private async cmdThink(
    args: string[],
    context: ChatCommandContext
  ): Promise<{ response: string; success: boolean }> {
    const level = args[0]?.toLowerCase() as
      | 'off'
      | 'minimal'
      | 'low'
      | 'medium'
      | 'high'
      | 'xhigh'
      | undefined;

    const validLevels: ('off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh')[] = [
      'off',
      'minimal',
      'low',
      'medium',
      'high',
      'xhigh',
    ];

    if (!level || !validLevels.includes(level)) {
      const config = this.getSessionConfig(context.conversationId);
      return {
        response: `Current thinking level: **${config.thinkingLevel}**\n\nAvailable levels: ${validLevels.join(', ')}\n\nUsage: /think <level>`,
        success: false,
      };
    }

    this.updateSessionConfig(context.conversationId, { thinkingLevel: level });
    return { response: `Thinking level set to: **${level}**`, success: true };
  }

  private async cmdVerbose(
    args: string[],
    context: ChatCommandContext
  ): Promise<{ response: string; success: boolean }> {
    const state = args[0]?.toLowerCase();

    if (state === 'on' || state === 'off' || state === 'true' || state === 'false') {
      const verbose = state === 'on' || state === 'true';
      this.updateSessionConfig(context.conversationId, { verboseLevel: verbose ? 1 : 0 });
      return { response: `Verbose mode: **${verbose ? 'on' : 'off'}**`, success: true };
    }

    const config = this.getSessionConfig(context.conversationId);
    return {
      response: `Verbose mode is currently: **${config.verboseLevel > 0 ? 'on' : 'off'}**\n\nUsage: /verbose on|off`,
      success: false,
    };
  }

  private async cmdUsage(
    args: string[],
    context: ChatCommandContext
  ): Promise<{ response: string; success: boolean }> {
    const mode = args[0]?.toLowerCase() as 'off' | 'tokens' | 'full' | undefined;
    const validModes: ('off' | 'tokens' | 'full')[] = ['off', 'tokens', 'full'];

    if (mode && validModes.includes(mode)) {
      const level = mode === 'off' ? 0 : mode === 'tokens' ? 1 : 2;
      this.updateSessionConfig(context.conversationId, { verboseLevel: level });
      return { response: `Usage display: **${mode}**`, success: true };
    }

    const usage = this.usageStats.get(context.conversationId) || { tokens: 0, messages: 0 };
    return {
      response: `**Usage Tracking**
- Mode: ${args[0] || 'current'}
- Messages: ${usage.messages}
- Tokens: ${usage.tokens}
${usage.cost ? `- Cost: $${usage.cost.toFixed(4)}` : ''}

Usage: /usage off|tokens|full`,
      success: false,
    };
  }

  private async cmdRestart(
    args: string[],
    context: ChatCommandContext
  ): Promise<{ response: string; success: boolean }> {
    if (!context.isOwner && context.isGroup) {
      return { response: 'Only the owner can restart the gateway in group chats.', success: false };
    }

    await taskQueue.add('message:respond' as any, {
      response: 'Gateway restart requested. This may take a few moments.',
    });

    return { response: 'Gateway restart requested. This may take a few moments.', success: true };
  }

  private async cmdActivation(
    args: string[],
    context: ChatCommandContext
  ): Promise<{ response: string; success: boolean }> {
    if (!context.isGroup) {
      return { response: 'Activation settings only apply to group chats.', success: false };
    }

    const mode = args[0]?.toLowerCase() as 'mention' | 'always' | undefined;

    if (mode && (mode === 'mention' || mode === 'always')) {
      this.updateSessionConfig(context.conversationId, { groupActivation: mode });
      return { response: `Group activation set to: **${mode}**`, success: true };
    }

    const config = this.getSessionConfig(context.conversationId);
    return {
      response: `Current activation mode: **${config.groupActivation}**\n\nUsage: /activation mention|always`,
      success: false,
    };
  }

  private async cmdHelp(
    args: string[],
    context: ChatCommandContext
  ): Promise<{ response: string; success: boolean }> {
    const helpText = `**Available Commands**

- \`/status\` - Show session status (model, tokens, cost)
- \`/new\` or \`/reset\` - Start a new conversation
- \`/compact\` - Compact conversation context
- \`/think <level>\` - Set thinking level (off|minimal|low|medium|high|xhigh)
- \`/verbose on|off\` - Toggle verbose output
- \`/usage off|tokens|full\` - Set usage display
- \`/restart\` - Restart gateway (owner only in groups)
- \`/activation mention|always\` - Group activation mode
- \`/help\` - Show this help message

All commands work in WhatsApp, Telegram, Slack, Discord, Google Chat, Microsoft Teams, and WebChat.`;

    return { response: helpText, success: true };
  }

  private getSessionConfig(conversationId: string): SessionConfig {
    if (!this.sessions.has(conversationId)) {
      this.sessions.set(conversationId, {
        thinkingLevel: 'medium',
        verboseLevel: 0,
        model: 'anthropic/claude-opus-4-6',
        sendPolicy: 'always',
        groupActivation: 'mention',
      });
    }
    return this.sessions.get(conversationId)!;
  }

  private updateSessionConfig(conversationId: string, updates: Partial<SessionConfig>): void {
    const config = this.getSessionConfig(conversationId);
    this.sessions.set(conversationId, { ...config, ...updates });
  }

  private async summarizeConversation(conversation: any): Promise<string> {
    const messages = conversation.messages.slice(-20);
    const summaryParts = messages.map((m: any) => {
      const role = m.role === 'user' ? 'User' : m.role === 'assistant' ? 'Assistant' : 'System';
      return `[${role}]: ${m.content.substring(0, 200)}${m.content.length > 200 ? '...' : ''}`;
    });

    return summaryParts.join('\n\n');
  }

  async updateUsage(conversationId: string, tokens: number, cost?: number): Promise<void> {
    const current = this.usageStats.get(conversationId) || { tokens: 0, messages: 0 };
    this.usageStats.set(conversationId, {
      tokens: current.tokens + tokens,
      messages: current.messages + 1,
      cost: (current.cost || 0) + (cost || 0),
    });
  }
}

export const chatCommandHandler = new ChatCommandHandler(new Agent({} as any));
