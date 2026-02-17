import { EventEmitter } from 'events';
import { makeWASocket, Browsers, useMultiFileAuthState, DisconnectReason } from 'baileys';
import path from 'path';
import fs from 'fs';
export class WhatsAppAdapter extends EventEmitter {
    socket = null;
    config;
    reconnectAttempts = 0;
    maxReconnectAttempts = 5;
    constructor(config = {}) {
        super();
        this.config = {
            enabled: config.enabled ?? true,
            authDir: config.authDir ?? './auth/whatsapp',
            printQR: config.printQR ?? true,
            reactive: config.reactive ?? true,
        };
    }
    async initialize() {
        if (!this.config.enabled) {
            console.log('WhatsApp integration disabled');
            return;
        }
        const authDir = path.resolve(this.config.authDir);
        if (!fs.existsSync(authDir)) {
            fs.mkdirSync(authDir, { recursive: true });
        }
        const { state, saveCreds } = await useMultiFileAuthState(authDir);
        this.socket = makeWASocket({
            auth: state,
            printQRInTerminal: this.config.printQR,
            browser: Browsers.macOS('Desktop'),
            syncFullHistory: false,
        });
        this.socket.ev.on('creds.update', saveCreds);
        this.socket.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect } = update;
            if (connection === 'close') {
                const reason = lastDisconnect?.error?.output?.statusCode;
                console.log(`WhatsApp connection closed: ${reason}`);
                if (reason === DisconnectReason.loggedOut) {
                    this.emit('error', new Error('WhatsApp session expired. Please scan QR code again.'));
                }
                else if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    setTimeout(() => this.initialize(), 5000 * this.reconnectAttempts);
                }
                else {
                    this.emit('error', new Error('Max reconnection attempts reached'));
                }
            }
            else if (connection === 'open') {
                console.log('WhatsApp connected successfully');
                this.reconnectAttempts = 0;
                this.emit('connected');
            }
        });
        this.socket.ev.on('messages.upsert', async (event) => {
            for (const message of event.messages) {
                if (message.key.fromMe || event.type === 'append')
                    continue;
                await this.handleMessage(message);
            }
        });
        this.socket.ev.on('groups.update', (events) => {
            for (const event of events) {
                this.emit('groupUpdate', event);
            }
        });
    }
    async handleMessage(message) {
        const messageId = message.key.id;
        const remoteJid = message.key.remoteJid;
        if (!messageId || !remoteJid)
            return;
        const isGroup = remoteJid.endsWith('@g.us');
        const senderName = message.pushName || 'Unknown';
        const body = message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            message.message?.imageMessage?.caption ||
            message.message?.documentMessage?.caption ||
            '';
        const type = this.getMessageType(message.message);
        const formattedMessage = {
            id: messageId,
            from: remoteJid,
            body,
            type,
            timestamp: Number(message.messageTimestamp),
            isGroup,
            senderName,
        };
        this.emit('message', formattedMessage);
        if (this.config.reactive && body && !isGroup) {
            this.sendTypingIndicator(remoteJid);
        }
    }
    getMessageType(message) {
        if (!message)
            return 'unknown';
        if (message.conversation)
            return 'text';
        if (message.extendedTextMessage)
            return 'text';
        if (message.imageMessage)
            return 'image';
        if (message.videoMessage)
            return 'video';
        if (message.audioMessage)
            return 'audio';
        if (message.documentMessage)
            return 'document';
        if (message.locationMessage)
            return 'location';
        if (message.contactMessage)
            return 'contact';
        if (message.stickerMessage)
            return 'sticker';
        return 'unknown';
    }
    async sendMessage(to, text, options) {
        if (!this.socket) {
            throw new Error('WhatsApp socket not initialized');
        }
        await this.socket.sendMessage(to, { text }, options ?? {});
    }
    async sendTypingIndicator(jid) {
        if (!this.socket)
            return;
        await this.socket.sendPresenceUpdate('composing', jid);
    }
    async sendReadReceipt(jid, messageId) {
        if (!this.socket)
            return;
        await this.socket.readMessages([
            { key: { remoteJid: jid, id: messageId, fromMe: false, participant: undefined } },
        ]);
    }
    async getGroupInfo(groupJid) {
        if (!this.socket)
            return null;
        return await this.socket.groupMetadata(groupJid);
    }
    async leaveGroup(groupJid) {
        if (!this.socket)
            return;
        await this.socket.groupLeave(groupJid);
    }
    async addToGroup(groupJid, participants) {
        if (!this.socket)
            return;
        await this.socket.groupParticipantsUpdate(groupJid, participants, 'add');
    }
    async removeFromGroup(groupJid, participants) {
        if (!this.socket)
            return;
        await this.socket.groupParticipantsUpdate(groupJid, participants, 'remove');
    }
    async sendMedia(jid, media) {
        if (!this.socket)
            return;
        const mediaType = media.mimeType.startsWith('image/')
            ? 'image'
            : media.mimeType.startsWith('video/')
                ? 'video'
                : media.mimeType.startsWith('audio/')
                    ? 'audio'
                    : 'document';
        await this.socket.sendMessage(jid, {
            [mediaType]: media.buffer,
            caption: media.filename || '',
            mimetype: media.mimeType,
        });
    }
    async sendPoll(jid, question, options) {
        if (!this.socket)
            return;
        await this.socket.sendMessage(jid, {
            poll: {
                name: question,
                selectableCount: 1,
                values: options,
            },
        });
    }
    disconnect() {
        if (this.socket) {
            this.socket.end(null);
            this.socket = null;
        }
    }
    isConnected() {
        return this.socket !== null;
    }
}
export default WhatsAppAdapter;
//# sourceMappingURL=index.js.map