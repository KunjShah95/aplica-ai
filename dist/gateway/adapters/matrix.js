export class MatrixAdapter {
    homeserverUrl;
    accessToken;
    userId;
    router;
    isRunning = false;
    syncToken;
    syncInterval;
    constructor(options) {
        this.homeserverUrl = options.homeserverUrl;
        this.accessToken = options.accessToken;
        this.userId = options.userId;
        this.router = options.router;
    }
    async sync() {
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
            const data = (await response.json());
            this.syncToken = data.next_batch || '';
            const rooms = data.rooms?.join || {};
            for (const [roomId, roomData] of Object.entries(rooms)) {
                const events = roomData?.timeline?.events || [];
                for (const event of events) {
                    if (event.type === 'm.room.message' && event.content?.msgtype === 'm.text.text') {
                        await this.handleMessage(roomId, event);
                    }
                }
            }
        }
        catch (error) {
            console.error('Matrix sync error:', error);
        }
    }
    async handleMessage(roomId, event) {
        if (event.sender === this.userId)
            return;
        const content = event.content.body || event.content.formatted_body || '';
        if (!content)
            return;
        try {
            const response = await this.router.handleFromMatrix(event.sender, content);
            await this.sendMessage(roomId, response.content);
        }
        catch (error) {
            console.error('Error handling Matrix message:', error);
        }
    }
    async start() {
        if (this.isRunning) {
            console.log('Matrix adapter is already running');
            return;
        }
        this.sync();
        this.syncInterval = setInterval(() => this.sync(), 30000);
        this.isRunning = true;
        console.log('Matrix adapter started');
    }
    async stop() {
        if (!this.isRunning)
            return;
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        this.isRunning = false;
        console.log('Matrix adapter stopped');
    }
    isActive() {
        return this.isRunning;
    }
    async sendMessage(roomId, content) {
        try {
            const response = await fetch(`${this.homeserverUrl}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/send/m.room.message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.accessToken}`,
                },
                body: JSON.stringify({
                    msgtype: 'm.text',
                    body: content,
                }),
            });
            if (!response.ok) {
                throw new Error(`Matrix send failed: ${response.statusText}`);
            }
            const result = (await response.json());
            return result.event_id || null;
        }
        catch (error) {
            console.error('Failed to send Matrix message:', error);
            return null;
        }
    }
    async joinRoom(roomId) {
        try {
            const response = await fetch(`${this.homeserverUrl}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/join`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.accessToken}`,
                },
                body: JSON.stringify({}),
            });
            return response.ok;
        }
        catch (error) {
            console.error('Failed to join Matrix room:', error);
            return false;
        }
    }
    async getUserInfo() {
        try {
            const response = await fetch(`${this.homeserverUrl}/_matrix/client/v3/profile/${encodeURIComponent(this.userId)}`, {
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                },
            });
            if (!response.ok)
                return null;
            return (await response.json());
        }
        catch {
            return null;
        }
    }
}
//# sourceMappingURL=matrix.js.map