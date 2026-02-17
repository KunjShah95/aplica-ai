import { EventEmitter } from 'events';
import type { WAMessage } from 'baileys';
export interface WhatsAppConfig {
    enabled: boolean;
    authDir: string;
    printQR: boolean;
    reactive: boolean;
}
export interface WhatsAppMessage {
    id: string;
    from: string;
    body: string;
    type: string;
    timestamp: number;
    isGroup: boolean;
    senderName?: string;
}
export declare class WhatsAppAdapter extends EventEmitter {
    private socket;
    private config;
    private reconnectAttempts;
    private maxReconnectAttempts;
    constructor(config?: Partial<WhatsAppConfig>);
    initialize(): Promise<void>;
    private handleMessage;
    private getMessageType;
    sendMessage(to: string, text: string, options?: {
        preview?: boolean;
        quoted?: WAMessage;
    }): Promise<void>;
    sendTypingIndicator(jid: string): Promise<void>;
    sendReadReceipt(jid: string, messageId: string): Promise<void>;
    getGroupInfo(groupJid: string): Promise<any>;
    leaveGroup(groupJid: string): Promise<void>;
    addToGroup(groupJid: string, participants: string[]): Promise<void>;
    removeFromGroup(groupJid: string, participants: string[]): Promise<void>;
    sendMedia(jid: string, media: {
        buffer: Buffer;
        mimeType: string;
        filename?: string;
    }): Promise<void>;
    sendPoll(jid: string, question: string, options: string[]): Promise<void>;
    disconnect(): void;
    isConnected(): boolean;
}
export default WhatsAppAdapter;
//# sourceMappingURL=index.d.ts.map