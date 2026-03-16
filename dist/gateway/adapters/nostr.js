import { randomUUID } from 'crypto';
import WebSocket from 'ws';
export class NostrAdapter {
    router;
    relayUrls;
    privateKey;
    relays = new Map();
    subscriptions = new Map();
    isRunning = false;
    constructor(options) {
        this.router = options.router;
        this.relayUrls = options.relayUrls;
        this.privateKey = options.privateKey;
    }
    async start() {
        console.log('Nostr adapter starting...');
        for (const url of this.relayUrls) {
            this.connectToRelay(url);
        }
        this.isRunning = true;
    }
    async stop() {
        for (const ws of this.relays.values()) {
            ws.close();
        }
        this.relays.clear();
        this.isRunning = false;
    }
    connectToRelay(url) {
        try {
            const ws = new WebSocket(url);
            ws.on('open', () => {
                console.log(`Connected to Nostr relay: ${url}`);
                this.relays.set(url, ws);
                this.subscribe(url);
            });
            ws.on('message', (data) => {
                const msg = JSON.parse(data.toString());
                this.handleMessage(msg);
            });
            ws.on('error', (error) => {
                console.error(`Nostr relay error (${url}):`, error);
            });
            ws.on('close', () => {
                console.log(`Disconnected from Nostr relay: ${url}`);
                this.relays.delete(url);
                setTimeout(() => this.connectToRelay(url), 5000);
            });
        }
        catch (error) {
            console.error(`Failed to connect to Nostr relay (${url}):`, error);
        }
    }
    subscribe(relayUrl) {
        const subscriptionId = randomUUID();
        const filter = {
            kinds: [1, 4],
            since: Math.floor(Date.now() / 1000) - 3600,
        };
        const ws = this.relays.get(relayUrl);
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(['REQ', subscriptionId, filter]));
            this.subscriptions.set(subscriptionId, new Set([relayUrl]));
        }
    }
    handleMessage(msg) {
        if (msg[0] === 'EVENT' && msg[2]) {
            const event = msg[2];
            this.processEvent(event);
        }
    }
    async processEvent(event) {
        if (event.kind !== 1 && event.kind !== 4)
            return;
        const content = event.content;
        const senderPubkey = event.pubkey;
        try {
            await this.router.handleFromWebSocket(senderPubkey, content, `nostr:${senderPubkey}`);
        }
        catch (error) {
            console.error('Failed to process Nostr message:', error);
        }
    }
    async publish(content, kind = 1, tags = []) {
        const event = {
            id: '',
            pubkey: this.getPublicKey(),
            created_at: Math.floor(Date.now() / 1000),
            kind,
            tags,
            content,
            sig: '',
        };
        event.id = this.getEventHash(event);
        event.sig = this.signEvent(event);
        for (const ws of this.relays.values()) {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(['EVENT', event]));
            }
        }
    }
    getPublicKey() {
        return '';
    }
    getEventHash(event) {
        return '';
    }
    signEvent(event) {
        return '';
    }
    isActive() {
        return this.isRunning;
    }
}
//# sourceMappingURL=nostr.js.map