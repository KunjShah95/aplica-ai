import { AppConfig } from '../config/types.js';
import { MessageRouter } from './router.js';
import { WebSocketGateway } from './websocket.js';
import { TelegramAdapter } from './adapters/telegram.js';
import { DiscordAdapter } from './adapters/discord.js';
import { SlackAdapter } from './adapters/slack.js';
import { WhatsAppAdapter } from './adapters/whatsapp/index.js';
import { SignalAdapter } from './adapters/signal.js';
import { GoogleChatAdapter } from './adapters/googlechat.js';
import { MSTeamsAdapter } from './adapters/msteams.js';
import { MatrixAdapter } from './adapters/matrix.js';
import { WebChatAdapter } from './adapters/webchat.js';
import { createProvider } from '../core/llm/index.js';
import { createAgent } from '../core/agent.js';

export class GatewayServer {
  private config: AppConfig;
  private router: MessageRouter;
  private agent: ReturnType<typeof createAgent>;

  public wsGateway: WebSocketGateway | null = null;
  public telegramAdapter: TelegramAdapter | null = null;
  public discordAdapter: DiscordAdapter | null = null;
  public slackAdapter: SlackAdapter | null = null;
  public whatsappAdapter: WhatsAppAdapter | null = null;
  public signalAdapter: SignalAdapter | null = null;
  public googleChatAdapter: GoogleChatAdapter | null = null;
  public msTeamsAdapter: MSTeamsAdapter | null = null;
  public matrixAdapter: MatrixAdapter | null = null;
  public webChatAdapter: WebChatAdapter | null = null;

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

    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║           Alpicia Gateway - Starting Platforms               ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    await Promise.all([
      this.startWebSocket(),
      this.startTelegram(),
      this.startDiscord(),
      this.startSlack(),
      this.startWhatsApp(),
      this.startSignal(),
      this.startGoogleChat(),
      this.startMSTeams(),
      this.startMatrix(),
      this.startWebChat(),
    ]);

    this.isRunning = true;

    const status = this.getStatus();
    const activeCount = Object.values(status.platforms).filter(Boolean).length;

    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║           Gateway Server Status                              ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log(`\n✅ Active Platforms: ${activeCount}/10`);
    console.log(`📊 Total Messages: ${status.stats.totalMessages}`);
    console.log('\nGateway Server is fully operational\n');
  }

  private async startWebSocket(): Promise<void> {
    const wsConfig = this.config.messaging.websocket;
    if (!wsConfig?.enabled) {
      console.log('   ○ WebSocket  - disabled');
      return;
    }

    this.wsGateway = new WebSocketGateway(this.agent, this.router, { port: wsConfig.port });
    await this.wsGateway.start();
    console.log(`   ✓ WebSocket  - port ${wsConfig.port}`);
  }

  private async startTelegram(): Promise<void> {
    const tgConfig = this.config.messaging.telegram;
    if (!tgConfig?.enabled || !tgConfig.token) {
      console.log('   ○ Telegram   - disabled or not configured');
      return;
    }

    this.telegramAdapter = new TelegramAdapter({
      token: tgConfig.token,
      router: this.router,
    });

    try {
      await this.telegramAdapter.start();
      const botInfo = await this.telegramAdapter.getBotInfo();
      console.log(`   ✓ Telegram   - @${botInfo?.username || 'unknown'}`);
    } catch (error) {
      console.log(
        `   ✗ Telegram   - ${error instanceof Error ? error.message : 'failed to start'}`
      );
    }
  }

  private async startDiscord(): Promise<void> {
    const dcConfig = this.config.messaging.discord;
    if (!dcConfig?.enabled || !dcConfig.token || !dcConfig.guildId) {
      console.log('   ○ Discord    - disabled or not configured');
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
      console.log(`   ✓ Discord    - guild: ${dcConfig.guildId}`);
    } catch (error) {
      console.log(
        `   ✗ Discord    - ${error instanceof Error ? error.message : 'failed to start'}`
      );
    }
  }

  private async startSlack(): Promise<void> {
    const slackConfig = this.config.messaging.slack;
    if (!slackConfig?.enabled || !slackConfig.token) {
      console.log('   ○ Slack      - disabled or not configured');
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
      console.log(`   ✓ Slack      - connected`);
    } catch (error) {
      console.log(
        `   ✗ Slack      - ${error instanceof Error ? error.message : 'failed to start'}`
      );
    }
  }

  private async startWhatsApp(): Promise<void> {
    const waConfig = process.env.WHATSAPP_ENABLED === 'true';
    if (!waConfig) {
      console.log('   ○ WhatsApp   - disabled');
      return;
    }

    this.whatsappAdapter = new WhatsAppAdapter({
      enabled: true,
      authDir: process.env.WHATSAPP_AUTH_DIR || './auth/whatsapp',
      printQR: process.env.WHATSAPP_PRINT_QR !== 'false',
      reactive: process.env.WHATSAPP_REACTIVE !== 'false',
    });

    try {
      await this.whatsappAdapter.initialize();
      this.whatsappAdapter.on('message', async (msg) => {
        const response = await this.router.handleFromWhatsApp(msg.from, msg.body);
        if (msg.body && process.env.WHATSAPP_REACTIVE !== 'false') {
          await this.whatsappAdapter?.sendMessage(msg.from, response.content);
        }
      });
      console.log(`   ✓ WhatsApp   - connected`);
    } catch (error) {
      console.log(
        `   ✗ WhatsApp   - ${error instanceof Error ? error.message : 'failed to start'}`
      );
    }
  }

  private async startSignal(): Promise<void> {
    const signalConfig = process.env.SIGNAL_ENABLED === 'true';
    if (!signalConfig) {
      console.log('   ○ Signal     - disabled');
      return;
    }

    this.signalAdapter = new SignalAdapter({
      signalServiceUrl: process.env.SIGNAL_SERVICE_URL || 'http://localhost:8080',
      phoneNumber: process.env.SIGNAL_PHONE_NUMBER || '',
      router: this.router,
    });

    try {
      await this.signalAdapter.start();
      console.log(`   ✓ Signal     - connected`);
    } catch (error) {
      console.log(
        `   ✗ Signal     - ${error instanceof Error ? error.message : 'failed to start'}`
      );
    }
  }

  private async startGoogleChat(): Promise<void> {
    const gcConfig = process.env.GOOGLE_CHAT_ENABLED === 'true';
    if (!gcConfig) {
      console.log('   ○ Google Chat - disabled');
      return;
    }

    this.googleChatAdapter = new GoogleChatAdapter({
      projectId: process.env.GOOGLE_CLOUD_PROJECT || '',
      location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
      subscriptionId: process.env.GOOGLE_CHAT_SUBSCRIPTION || '',
      router: this.router,
    });

    try {
      await this.googleChatAdapter.start();
      console.log(`   ✓ Google Chat - connected`);
    } catch (error) {
      console.log(
        `   ✗ Google Chat - ${error instanceof Error ? error.message : 'failed to start'}`
      );
    }
  }

  private async startMSTeams(): Promise<void> {
    const teamsConfig = process.env.MSTEAMS_ENABLED === 'true';
    if (!teamsConfig) {
      console.log('   ○ MS Teams   - disabled');
      return;
    }

    this.msTeamsAdapter = new MSTeamsAdapter({
      tenantId: process.env.MSTEAMS_TENANT_ID || '',
      clientId: process.env.MSTEAMS_CLIENT_ID || '',
      clientSecret: process.env.MSTEAMS_CLIENT_SECRET || '',
      botId: process.env.MSTEAMS_BOT_ID || '',
      router: this.router,
    });

    try {
      await this.msTeamsAdapter.start();
      console.log(`   ✓ MS Teams   - connected`);
    } catch (error) {
      console.log(
        `   ✗ MS Teams   - ${error instanceof Error ? error.message : 'failed to start'}`
      );
    }
  }

  private async startMatrix(): Promise<void> {
    const matrixConfig = process.env.MATRIX_ENABLED === 'true';
    if (!matrixConfig) {
      console.log('   ○ Matrix     - disabled');
      return;
    }

    this.matrixAdapter = new MatrixAdapter({
      homeserverUrl: process.env.MATRIX_HOMESERVER || 'https://matrix.org',
      userId: process.env.MATRIX_USER_ID || '',
      accessToken: process.env.MATRIX_ACCESS_TOKEN || '',
      router: this.router,
    });

    try {
      await this.matrixAdapter.start();
      console.log(`   ✓ Matrix     - connected`);
    } catch (error) {
      console.log(
        `   ✗ Matrix     - ${error instanceof Error ? error.message : 'failed to start'}`
      );
    }
  }

  private async startWebChat(): Promise<void> {
    const webChatConfig = process.env.WEBCHAT_ENABLED === 'true';
    if (!webChatConfig) {
      console.log('   ○ Web Chat   - disabled');
      return;
    }

    const port = parseInt(process.env.WEBCHAT_PORT || '3003');

    this.webChatAdapter = new WebChatAdapter({
      router: this.router,
      port,
    });

    try {
      await this.webChatAdapter.start();
      console.log(`   ✓ Web Chat   - port ${port}`);
    } catch (error) {
      console.log(
        `   ✗ Web Chat   - ${error instanceof Error ? error.message : 'failed to start'}`
      );
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('\nStopping Gateway Server...');

    const stopPromises: Promise<void>[] = [];

    if (this.wsGateway) stopPromises.push(this.wsGateway.stop());
    if (this.telegramAdapter) stopPromises.push(this.telegramAdapter.stop());
    if (this.discordAdapter) stopPromises.push(this.discordAdapter.stop());
    if (this.slackAdapter) stopPromises.push(this.slackAdapter.stop());
    if (this.whatsappAdapter) this.whatsappAdapter.disconnect();
    if (this.signalAdapter) stopPromises.push(this.signalAdapter.stop());
    if (this.googleChatAdapter) stopPromises.push(this.googleChatAdapter.stop());
    if (this.msTeamsAdapter) stopPromises.push(this.msTeamsAdapter.stop());
    if (this.matrixAdapter) stopPromises.push(this.matrixAdapter.stop());
    if (this.webChatAdapter) stopPromises.push(this.webChatAdapter.stop());

    await Promise.allSettled(stopPromises);

    this.wsGateway = null;
    this.telegramAdapter = null;
    this.discordAdapter = null;
    this.slackAdapter = null;
    this.whatsappAdapter = null;
    this.signalAdapter = null;
    this.googleChatAdapter = null;
    this.msTeamsAdapter = null;
    this.matrixAdapter = null;
    this.webChatAdapter = null;

    this.isRunning = false;
    console.log('Gateway Server stopped');
  }

  getStatus(): GatewayStatus {
    return {
      running: this.isRunning,
      uptime: this.isRunning ? process.uptime() : 0,
      platforms: {
        websocket: !!this.wsGateway,
        telegram: this.telegramAdapter?.isActive() ?? false,
        discord: this.discordAdapter?.isActive() ?? false,
        slack: this.slackAdapter?.isActive() ?? false,
        whatsapp: this.whatsappAdapter?.isConnected() ?? false,
        signal: this.signalAdapter?.isActive() ?? false,
        googleChat: this.googleChatAdapter?.isActive() ?? false,
        msTeams: this.msTeamsAdapter?.isActive() ?? false,
        matrix: this.matrixAdapter?.isActive() ?? false,
        webChat: this.webChatAdapter?.isActive() ?? false,
      },
      stats: this.router.getStats(),
    };
  }

  getRouter(): MessageRouter {
    return this.router;
  }
}

export interface GatewayStatus {
  running: boolean;
  uptime: number;
  platforms: {
    websocket: boolean;
    telegram: boolean;
    discord: boolean;
    slack: boolean;
    whatsapp: boolean;
    signal: boolean;
    googleChat: boolean;
    msTeams: boolean;
    matrix: boolean;
    webChat: boolean;
  };
  stats: {
    totalMessages: number;
    successfulMessages: number;
    failedMessages: number;
    averageResponseTime: number;
  };
}
