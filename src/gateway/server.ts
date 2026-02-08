import { AppConfig } from '../config/types.js';
import { MessageRouter } from './router.js';
import { WebSocketGateway } from './websocket.js';
import { TelegramAdapter } from './adapters/telegram.js';
import { DiscordAdapter } from './adapters/discord.js';
import { SlackAdapter } from './adapters/slack.js';
import { createProvider } from '../core/llm/index.js';
import { createAgent } from '../core/agent.js';

export class GatewayServer {
  private config: AppConfig;
  private router: MessageRouter;
  private agent: ReturnType<typeof createAgent>;
  private wsGateway: WebSocketGateway | null = null;
  private telegramAdapter: TelegramAdapter | null = null;
  private discordAdapter: DiscordAdapter | null = null;
  private slackAdapter: SlackAdapter | null = null;
  private isRunning: boolean = false;

  constructor(config: AppConfig) {
    this.config = config;
    const llmProvider = createProvider(config.llm);
    this.agent = createAgent(config, llmProvider);
    this.router = new MessageRouter(this.agent);
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Gateway is already running');
      return;
    }

    console.log('Starting Gateway Server...\n');

    await this.startWebSocket();
    await this.startTelegram();
    await this.startDiscord();
    await this.startSlack();

    this.isRunning = true;
    console.log('\nGateway Server is fully operational');
  }

  private async startWebSocket(): Promise<void> {
    const wsConfig = this.config.messaging.websocket;
    if (!wsConfig?.enabled) {
      console.log('WebSocket disabled');
      return;
    }

    this.wsGateway = new WebSocketGateway(this.agent, this.router, { port: wsConfig.port });
    await this.wsGateway.start();
  }

  private async startTelegram(): Promise<void> {
    const tgConfig = this.config.messaging.telegram;
    if (!tgConfig?.enabled || !tgConfig.token) {
      console.log('Telegram disabled or not configured');
      return;
    }

    this.telegramAdapter = new TelegramAdapter({
      token: tgConfig.token,
      router: this.router,
    });

    try {
      await this.telegramAdapter.start();
      const botInfo = await this.telegramAdapter.getBotInfo();
      if (botInfo) {
        console.log(`   Bot: @${botInfo.username} (${botInfo.name})`);
      }
    } catch (error) {
      console.error(
        'Failed to start Telegram bot:',
        error instanceof Error ? error.message : String(error)
      );
      this.telegramAdapter = null;
    }
  }

  private async startDiscord(): Promise<void> {
    const dcConfig = this.config.messaging.discord;
    if (!dcConfig?.enabled || !dcConfig.token || !dcConfig.guildId) {
      console.log('Discord disabled or not configured');
      return;
    }

    this.discordAdapter = new DiscordAdapter({
      token: dcConfig.token,
      guildId: dcConfig.guildId,
      router: this.router,
    });

    try {
      await this.discordAdapter.start();
      await this.discordAdapter.registerCommands();
    } catch (error) {
      console.error(
        'Failed to start Discord bot:',
        error instanceof Error ? error.message : String(error)
      );
      this.discordAdapter = null;
    }
  }


  private async startSlack(): Promise<void> {
    const slackConfig = this.config.messaging.slack;
    if (!slackConfig?.enabled || !slackConfig.token) {
      console.log('Slack disabled or not configured');
      return;
    }

    this.slackAdapter = new SlackAdapter({
      token: slackConfig.token,
      signingSecret: slackConfig.signingSecret,
      appToken: slackConfig.appToken,
      router: this.router,
    });

    try {
      await this.slackAdapter.start();
    } catch (error) {
      console.error(
        'Failed to start Slack bot:',
        error instanceof Error ? error.message : String(error)
      );
      this.slackAdapter = null;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('\nStopping Gateway Server...');

    if (this.telegramAdapter) {
      await this.telegramAdapter.stop();
      this.telegramAdapter = null;
    }

    if (this.discordAdapter) {
      await this.discordAdapter.stop();
      this.discordAdapter = null;
    }

    if (this.slackAdapter) {
      await this.slackAdapter.stop();
      this.slackAdapter = null;
    }

    if (this.wsGateway) {
      await this.wsGateway.stop();
      this.wsGateway = null;
    }

    this.isRunning = false;
    console.log('Gateway Server stopped');
  }

  getStatus(): {
    running: boolean;
    websocket: boolean;
    telegram: boolean;
    discord: boolean;
    slack: boolean;
  } {
    return {
      running: this.isRunning,
      websocket: this.wsGateway?.getStats ? true : false,
      telegram: this.telegramAdapter?.isActive() ?? false,
      discord: this.discordAdapter?.isActive() ?? false,
      slack: this.slackAdapter?.isActive() ?? false,
    };
  }

  getRouter(): MessageRouter {
    return this.router;
  }
}
