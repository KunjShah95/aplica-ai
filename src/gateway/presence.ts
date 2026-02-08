import { EventEmitter } from 'events';

export type PresenceStatus = 'online' | 'away' | 'busy' | 'dnd' | 'offline' | 'invisible';

export interface UserPresence {
  userId: string;
  status: PresenceStatus;
  statusMessage?: string;
  lastSeen: Date;
  platform?: string;
  device?: string;
}

export interface TypingIndicator {
  conversationId: string;
  userId: string;
  isTyping: boolean;
  startedAt?: Date;
}

export class PresenceManager extends EventEmitter {
  private presence: Map<string, UserPresence> = new Map();
  private typing: Map<string, Map<string, TypingIndicator>> = new Map();
  private activityTimeout: number;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(activityTimeout: number = 300000) {
    super();
    this.activityTimeout = activityTimeout;
    this.startCleanup();
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.pruneInactive();
    }, 60000);
  }

  async setPresence(
    userId: string,
    status: PresenceStatus,
    options?: { statusMessage?: string; platform?: string; device?: string }
  ): Promise<UserPresence> {
    const oldPresence = this.presence.get(userId);
    const oldStatus = oldPresence?.status || 'offline';

    const presenceData: UserPresence = {
      userId,
      status,
      statusMessage: options?.statusMessage,
      lastSeen: new Date(),
      platform: options?.platform,
      device: options?.device,
    };

    this.presence.set(userId, presenceData);

    if (oldStatus !== status) {
      this.emit('presence_change', { userId, oldStatus, newStatus: status });

      if (status === 'online') {
        this.emit('user_online', { userId, platform: options?.platform });
      } else if (status === 'offline' || status === 'invisible') {
        this.emit('user_offline', { userId });
      }
    }

    if (options?.statusMessage) {
      this.emit('status_update', { userId, statusMessage: options?.statusMessage });
    }

    console.log(`Presence updated for ${userId}: ${status}`);
    return presenceData;
  }

  getPresence(userId: string): UserPresence | undefined {
    return this.presence.get(userId);
  }

  async updateActivity(userId: string): Promise<void> {
    const presenceData = this.presence.get(userId);
    if (presenceData) {
      presenceData.lastSeen = new Date();
      this.presence.set(userId, presenceData);
    }
  }

  async startTyping(conversationId: string, userId: string): Promise<void> {
    if (!this.typing.has(conversationId)) {
      this.typing.set(conversationId, new Map());
    }

    const conversationTyping = this.typing.get(conversationId)!;
    const existing = conversationTyping.get(userId);

    if (!existing || !existing.isTyping) {
      conversationTyping.set(userId, {
        conversationId,
        userId,
        isTyping: true,
        startedAt: new Date(),
      });

      this.emit('typing_start', { conversationId, userId });
    }
  }

  async stopTyping(conversationId: string, userId: string): Promise<void> {
    const conversationTyping = this.typing.get(conversationId);
    if (!conversationTyping) return;

    const existing = conversationTyping.get(userId);
    if (existing && existing.isTyping) {
      conversationTyping.set(userId, {
        conversationId,
        userId,
        isTyping: false,
      });

      this.emit('typing_stop', { conversationId, userId });
    }
  }

  async stopAllTyping(conversationId: string): Promise<void> {
    const conversationTyping = this.typing.get(conversationId);
    if (!conversationTyping) return;

    for (const [userId, indicator] of conversationTyping.entries()) {
      if (indicator.isTyping) {
        this.emit('typing_stop', { conversationId, userId });
      }
    }

    this.typing.delete(conversationId);
  }

  isTyping(conversationId: string, userId: string): boolean {
    const conversationTyping = this.typing.get(conversationId);
    if (!conversationTyping) return false;

    const indicator = conversationTyping.get(userId);
    return indicator?.isTyping || false;
  }

  getTypingUsers(conversationId: string): string[] {
    const conversationTyping = this.typing.get(conversationId);
    if (!conversationTyping) return [];

    const typingUsers: string[] = [];
    for (const [userId, indicator] of conversationTyping.entries()) {
      if (indicator.isTyping) {
        typingUsers.push(userId);
      }
    }

    return typingUsers;
  }

  async getConversationPresence(conversationId: string): Promise<Map<string, PresenceStatus>> {
    const presenceMap = new Map<string, PresenceStatus>();

    const conversationTyping = this.typing.get(conversationId);
    if (conversationTyping) {
      for (const userId of conversationTyping.keys()) {
        const presenceData = this.presence.get(userId);
        if (presenceData) {
          presenceMap.set(userId, presenceData.status);
        } else {
          presenceMap.set(userId, 'offline');
        }
      }
    }

    return presenceMap;
  }

  private pruneInactive(): void {
    const cutoff = new Date(Date.now() - this.activityTimeout);

    for (const [userId, presenceData] of this.presence.entries()) {
      if (presenceData.lastSeen < cutoff && presenceData.status !== 'offline') {
        presenceData.status = 'offline';
        this.presence.set(userId, presenceData);
        this.emit('user_offline', { userId, reason: 'timeout' });
      }
    }
  }

  getAllPresence(): UserPresence[] {
    return Array.from(this.presence.values());
  }

  getOnlineUsers(): UserPresence[] {
    return Array.from(this.presence.values()).filter(
      (p) => p.status === 'online' || p.status === 'away' || p.status === 'busy'
    );
  }

  getStats(): {
    total: number;
    online: number;
    away: number;
    busy: number;
    offline: number;
    conversationsWithTyping: number;
  } {
    const stats = {
      total: this.presence.size,
      online: 0,
      away: 0,
      busy: 0,
      offline: 0,
      conversationsWithTyping: this.typing.size,
    };

    for (const presenceData of this.presence.values()) {
      switch (presenceData.status) {
        case 'online':
          stats.online++;
          break;
        case 'away':
          stats.away++;
          break;
        case 'busy':
        case 'dnd':
          stats.busy++;
          break;
        case 'offline':
        case 'invisible':
          stats.offline++;
          break;
      }
    }

    return stats;
  }

  async cleanup(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.presence.clear();
    this.typing.clear();
    console.log('Presence manager cleaned up');
  }
}

export const presenceManager = new PresenceManager();

export class TypingIndicatorHandler {
  private presenceManager: PresenceManager;
  private typingTimeout: number;

  constructor(presenceManager?: PresenceManager, typingTimeout: number = 5000) {
    this.presenceManager = presenceManager || new PresenceManager();
    this.typingTimeout = typingTimeout;
  }

  async handleTypingStart(conversationId: string, userId: string): Promise<void> {
    await this.presenceManager.startTyping(conversationId, userId);

    setTimeout(async () => {
      await this.presenceManager.stopTyping(conversationId, userId);
    }, this.typingTimeout);
  }

  async handleTypingStop(conversationId: string, userId: string): Promise<void> {
    await this.presenceManager.stopTyping(conversationId, userId);
  }
}

export const typingHandler = new TypingIndicatorHandler();
