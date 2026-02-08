import { MessageRouter } from '../router.js';
import { randomUUID } from 'crypto';

export interface MatrixAdapterOptions {
  homeserverUrl: string;
  accessToken: string;
  userId: string;
  router: MessageRouter;
}

export interface MatrixEvent {
  event_id: string;
  type: string;
  sender: string;
  content: {
    msgtype?: string;
    body?: string;
    formatted_body?: string;
  };
  unsigned?: {
    age?: number;
  };
  room_id?: string;
}

export class MatrixAdapter {
  private homeserverUrl: string;
  private accessToken: string;
  private userId: string;
  private router: MessageRouter;
  private isRunning: boolean = false;
  private syncToken?: string;
  private syncInterval?: NodeJS.Timeout;

  constructor(options: MatrixAdapterOptions) {
    this.homeserverUrl = options.homeserverUrl;
    this.accessToken = options.accessToken;
    this.userId = options.userId;
    this.router = options.router;
  }

  private async sync(): Promise<void> {
    try {
      const url = new URL(`/_matrix/client/v3/sync`);
      url.searchParams.set('access_token', this.accessToken);
      if (this.syncToken) {
        url.searchParams.set('since', this.syncToken);
      }
      url.searchParams.set('timeout', '30000');

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`Matrix sync failed: ${response.statusText}`);
      }

      const data = (await response.json()) as {
        next_batch?: string;
        rooms?: Record<string, { timeline?: { events?: MatrixEvent[] } }>;
      };
      this.syncToken = data.next_batch || '';

      const rooms = data.rooms?.join || {};
      for (const [roomId, roomData] of Object.entries(rooms)) {
        const events =
          (roomData as { timeline?: { events?: MatrixEvent[] } })?.timeline?.events || [];
        for (const event of events) {
          if (event.type === 'm.room.message' && event.content?.msgtype === 'm.text.text') {
            await this.handleMessage(roomId, event);
          }
        }
      }
    } catch (error) {
      console.error('Matrix sync error:', error);
    }
  }

  private async handleMessage(roomId: string, event: MatrixEvent): Promise<void> {
    if (event.sender === this.userId) return;

    const content = event.content.body || event.content.formatted_body || '';
    if (!content) return;

    try {
      const response = await this.router.handleFromMatrix(event.sender, content);

      await this.sendMessage(roomId, response.content);
    } catch (error) {
      console.error('Error handling Matrix message:', error);
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Matrix adapter is already running');
      return;
    }

    this.sync();
    this.syncInterval = setInterval(() => this.sync(), 30000);
    this.isRunning = true;
    console.log('Matrix adapter started');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    this.isRunning = false;
    console.log('Matrix adapter stopped');
  }

  isActive(): boolean {
    return this.isRunning;
  }

  async sendMessage(roomId: string, content: string): Promise<string | null> {
    try {
      const response = await fetch(
        `${this.homeserverUrl}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/send/m.room.message`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.accessToken}`,
          },
          body: JSON.stringify({
            msgtype: 'm.text',
            body: content,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Matrix send failed: ${response.statusText}`);
      }

      const result = (await response.json()) as { event_id?: string };
      return result.event_id || null;
    } catch (error) {
      console.error('Failed to send Matrix message:', error);
      return null;
    }
  }

  async joinRoom(roomId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.homeserverUrl}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/join`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.accessToken}`,
          },
          body: JSON.stringify({}),
        }
      );

      return response.ok;
    } catch (error) {
      console.error('Failed to join Matrix room:', error);
      return false;
    }
  }

  async getUserInfo(): Promise<{ displayname?: string; avatar_url?: string } | null> {
    try {
      const response = await fetch(
        `${this.homeserverUrl}/_matrix/client/v3/profile/${encodeURIComponent(this.userId)}`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      if (!response.ok) return null;
      return (await response.json()) as { displayname?: string; avatar_url?: string };
    } catch {
      return null;
    }
  }
}
