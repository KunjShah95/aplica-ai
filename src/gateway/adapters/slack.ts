import { WebClient } from '@slack/web-api';
import { MessageRouter } from '../router.js';

export interface SlackAdapterOptions {
    token: string;
    signingSecret?: string; // For future event handling
    appToken?: string; // For Socket Mode
    router: MessageRouter;
}

export class SlackAdapter {
    private client: WebClient;
    private router: MessageRouter;
    private isRunning: boolean = false;
    private botInfo: { id?: string; name?: string } = {};

    constructor(options: SlackAdapterOptions) {
        this.router = options.router;
        this.client = new WebClient(options.token);
    }

    async start(): Promise<void> {
        if (this.isRunning) {
            console.log('Slack adapter is already running');
            return;
        }

        try {
            // Validate token and get bot info
            const authTest = await this.client.auth.test();
            if (!authTest.ok) {
                throw new Error(`Slack auth failed: ${authTest.error}`);
            }

            this.botInfo = {
                id: authTest.user_id,
                name: authTest.user,
            };

            this.isRunning = true;
            console.log(`Slack adapter started (Bot: @${this.botInfo.name})`);

            // Note: Incoming messages require configuring Events API or Socket Mode.
            // This adapter currently supports outgoing messages and commands via API.
        } catch (error) {
            console.error('Failed to start Slack adapter:', error);
            throw error;
        }
    }

    async stop(): Promise<void> {
        if (!this.isRunning) return;
        this.isRunning = false;
        console.log('Slack adapter stopped');
    }

    isActive(): boolean {
        return this.isRunning;
    }

    async sendMessage(channelId: string, content: string): Promise<string | null> {
        try {
            const result = await this.client.chat.postMessage({
                channel: channelId,
                text: content,
            });

            if (result.ok && result.message?.ts) {
                return result.message.ts;
            }
            return null;
        } catch (error) {
            console.error('Failed to send Slack message:', error);
            return null;
        }
    }

    async getBotInfo(): Promise<{ id?: string; name?: string }> {
        return this.botInfo;
    }
}
