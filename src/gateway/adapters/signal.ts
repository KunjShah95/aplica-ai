import { MessageRouter } from '../router.js';
import { randomUUID } from 'crypto';

export interface SignalAdapterOptions {
  signalServiceUrl: string;
  phoneNumber: string;
  router: MessageRouter;
}

export interface SignalMessage {
  envelope: {
    source: string;
    sourceNumber: string;
    sourceUuid: string;
    timestamp: number;
    message?: {
      timestamp: number;
      message: string;
    };
  };
}

export class SignalAdapter {
  private signalServiceUrl: string;
  private phoneNumber: string;
  private router: MessageRouter;
  private isRunning: boolean = false;
  private eventSource?: EventSource;

  constructor(options: SignalAdapterOptions) {
    this.signalServiceUrl = options.signalServiceUrl;
    this.phoneNumber = options.phoneNumber;
    this.router = options.router;
  }

  private setupHandlers(): void {
    this.eventSource = new EventSource(`${this.signalServiceUrl}/v1/events/${this.phoneNumber}`);

    this.eventSource.onmessage = async (event) => {
      try {
        const signalMessage: SignalMessage = JSON.parse(event.data);
        await this.handleMessage(signalMessage);
      } catch (error) {
        console.error('Error parsing Signal message:', error);
      }
    };

    this.eventSource.onerror = (error) => {
      console.error('Signal EventSource error:', error);
      this.isRunning = false;
    };
  }

  private async handleMessage(signalMessage: SignalMessage): Promise<void> {
    const { envelope } = signalMessage;
    const userId = envelope.sourceUuid || envelope.source;
    const content = envelope.message?.message || '';

    if (!content) return;

    try {
      const response = await this.router.handleFromSignal(userId, content);

      await this.sendMessage(userId, response.content);
    } catch (error) {
      console.error('Error handling Signal message:', error);
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Signal adapter is already running');
      return;
    }

    this.setupHandlers();
    this.isRunning = true;
    console.log('Signal adapter started');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    if (this.eventSource) {
      this.eventSource.close();
    }
    this.isRunning = false;
    console.log('Signal adapter stopped');
  }

  isActive(): boolean {
    return this.isRunning;
  }

  async sendMessage(recipientId: string, content: string): Promise<string | null> {
    try {
      const response = await fetch(`${this.signalServiceUrl}/v1/messages/${this.phoneNumber}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipients: [recipientId],
          message: content,
        }),
      });

      if (!response.ok) {
        throw new Error(`Signal send failed: ${response.statusText}`);
      }

      const result = (await response.json()) as { timestamp?: number };
      return result.timestamp?.toString() || null;
    } catch (error) {
      console.error('Failed to send Signal message:', error);
      return null;
    }
  }

  async getInfo(): Promise<{ number: string; deviceId: string } | null> {
    try {
      const response = await fetch(
        `${this.signalServiceUrl}/v1/accounts/${this.phoneNumber}/devices`,
        {
          headers: {
            Authorization: `Bearer ${process.env.SIGNAL_TOKEN}`,
          },
        }
      );

      if (!response.ok) return null;

      const devices = (await response.json()) as Array<{ id?: string }>;
      return {
        number: this.phoneNumber,
        deviceId: devices[0]?.id || 'unknown',
      };
    } catch {
      return null;
    }
  }
}
