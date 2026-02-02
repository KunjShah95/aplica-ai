import { Bot, Context, GrammyError, HttpError, session, SessionFlavor } from 'grammy';
import { MessageRouter } from '../router.js';
import { randomUUID } from 'crypto';

interface BotSession {
  conversationId?: string;
  lastActivity: number;
}

type BotContext = Context & SessionFlavor<BotSession>;

export interface TelegramAdapterOptions {
  token: string;
  router: MessageRouter;
}

export class TelegramAdapter {
  private bot: Bot<BotContext>;
  private router: MessageRouter;
  private isRunning: boolean = false;

  constructor(options: TelegramAdapterOptions) {
    this.router = options.router;

    this.bot = new Bot<BotContext>(options.token);

    this.bot.use(
      session({
        initial: () => ({ lastActivity: Date.now() }),
      })
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.bot.on('message:text', async (ctx) => {
      const userId = String(ctx.from?.id);
      const messageText = ctx.message.text;
      const conversationId = ctx.session.conversationId;

      ctx.session.lastActivity = Date.now();

      try {
        const response = await this.router.handleFromTelegram(userId, messageText, conversationId);

        if (!conversationId && response.conversationId) {
          ctx.session.conversationId = response.conversationId;
        }

        await ctx.reply(response.content, {
          reply_parameters: { message_id: ctx.message.message_id },
        });
      } catch (error) {
        console.error('Telegram message handling failed:', error);
        await ctx.reply('Sorry, I encountered an error processing your message.');
      }
    });

    this.bot.on('message', async (ctx) => {
      await ctx.reply('I can only process text messages. Please send text instead.');
    });

    this.bot.catch((error) => {
      const ctx = error.ctx;
      console.error(`Error in Telegram bot:`, error.error);
      if (error.error instanceof GrammyError) {
        console.error('Telegram Grammy error:', error.error.message);
      } else if (error.error instanceof HttpError) {
        console.error('Telegram HTTP error:', error.error.message);
      }
    });
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Telegram adapter is already running');
      return;
    }

    this.bot.start();
    this.isRunning = true;
    console.log('Telegram bot started');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    await this.bot.stop();
    this.isRunning = false;
    console.log('Telegram bot stopped');
  }

  isActive(): boolean {
    return this.isRunning;
  }

  async sendMessage(chatId: string, content: string): Promise<string | null> {
    try {
      const message = await this.bot.api.sendMessage(chatId, content);
      return String(message.message_id);
    } catch (error) {
      console.error('Failed to send Telegram message:', error);
      return null;
    }
  }

  async getBotInfo(): Promise<{ id: number; username: string; name: string } | null> {
    try {
      const me = await this.bot.api.getMe();
      return {
        id: me.id,
        username: me.username || 'unknown',
        name: me.first_name || 'Unknown',
      };
    } catch {
      return null;
    }
  }
}
