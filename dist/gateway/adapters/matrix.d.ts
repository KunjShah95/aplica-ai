import { MessageRouter } from '../router.js';
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
export declare class MatrixAdapter {
    private homeserverUrl;
    private accessToken;
    private userId;
    private router;
    private isRunning;
    private syncToken?;
    private syncInterval?;
    constructor(options: MatrixAdapterOptions);
    private sync;
    private handleMessage;
    start(): Promise<void>;
    stop(): Promise<void>;
    isActive(): boolean;
    sendMessage(roomId: string, content: string): Promise<string | null>;
    joinRoom(roomId: string): Promise<boolean>;
    getUserInfo(): Promise<{
        displayname?: string;
        avatar_url?: string;
    } | null>;
}
//# sourceMappingURL=matrix.d.ts.map