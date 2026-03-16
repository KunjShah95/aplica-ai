export class TwitchAdapter {
    router;
    clientId;
    clientSecret;
    botUsername;
    oauthToken;
    channels = new Set();
    ws;
    isRunning = false;
    reconnectTimer;
    constructor(options) {
        this.router = options.router;
        this.clientId = options.clientId;
        this.clientSecret = options.clientSecret;
        this.botUsername = options.botUsername;
        this.oauthToken = options.oauthToken;
        if (options.channels) {
            options.channels.forEach((ch) => this.channels.add(ch.toLowerCase()));
        }
    }
    async start() {
        console.log('Twitch adapter starting...');
        await this.connect();
        this.isRunning = true;
    }
    async stop() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }
        if (this.ws) {
            this.ws.close();
        }
        this.isRunning = false;
    }
    async connect() {
        try {
            const response = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${this.clientId}&client_secret=${this.clientSecret}&grant_type=client_credentials`, {
                method: 'POST',
            });
            const tokenData = await response.json();
            const accessToken = tokenData.access_token;
            this.ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');
            this.ws.on('open', () => {
                console.log('Connected to Twitch IRC');
                this.ws?.send(`PASS oauth:${accessToken}`);
                this.ws?.send(`NICK ${this.botUsername}`);
                for (const channel of this.channels) {
                    this.joinChannel(channel);
                }
            });
            this.ws.on('message', (data) => {
                this.handleMessage(data.toString());
            });
            this.ws.on('error', (error) => {
                console.error('Twitch IRC error:', error);
            });
            this.ws.on('close', () => {
                console.log('Disconnected from Twitch IRC, reconnecting...');
                this.scheduleReconnect();
            });
        }
        catch (error) {
            console.error('Failed to connect to Twitch:', error);
            this.scheduleReconnect();
        }
    }
    scheduleReconnect() {
        if (this.reconnectTimer)
            return;
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = undefined;
            this.connect();
        }, 5000);
    }
    handleMessage(data) {
        const lines = data.split('\r\n');
        for (const line of lines) {
            if (!line)
                continue;
            if (line.startsWith('PING')) {
                this.ws?.send('PONG :tmi.twitch.tv');
                continue;
            }
            const match = line.match(/^:(\w+)!\w+@\w+\.tmi\.twitch\.tv PRIVMSG (#?\w+) :(.+)$/);
            if (match) {
                const [, username, channel, message] = match;
                if (!this.channels.has(channel.toLowerCase()))
                    return;
                this.processMessage({
                    channel: channel.toLowerCase(),
                    username,
                    message,
                });
            }
        }
    }
    async processMessage(msg) {
        const content = msg.message;
        const peerId = `${msg.channel}:${msg.username}`;
        try {
            await this.router.handleFromWebSocket(peerId, content, msg.channel);
        }
        catch (error) {
            console.error('Failed to process Twitch message:', error);
        }
    }
    joinChannel(channel) {
        const ch = channel.toLowerCase().replace('#', '');
        this.channels.add(ch);
        this.ws?.send(`JOIN #${ch}`);
    }
    partChannel(channel) {
        const ch = channel.toLowerCase().replace('#', '');
        this.channels.delete(ch);
        this.ws?.send(`PART #${ch}`);
    }
    async sendMessage(channel, message) {
        this.ws?.send(`PRIVMSG #${channel.toLowerCase()} :${message}`);
    }
    isActive() {
        return this.isRunning;
    }
}
import WebSocket from 'ws';
//# sourceMappingURL=twitch.js.map