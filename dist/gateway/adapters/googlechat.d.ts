import { MessageRouter } from '../router.js';
export interface GoogleChatAdapterOptions {
    projectId: string;
    location: string;
    subscriptionId: string;
    router: MessageRouter;
}
export interface GoogleChatMessage {
    name: string;
    sender: {
        name: string;
        displayName: string;
    };
    message: {
        text: string;
        argumentText: string;
    };
    space: {
        name: string;
        displayName: string;
        type: string;
    };
    thread?: {
        name: string;
    };
}
export declare class GoogleChatAdapter {
    private projectId;
    private location;
    private subscriptionId;
    private router;
    private isRunning;
    private messageCallback?;
    constructor(options: GoogleChatAdapterOptions);
    private setupPubSub;
    private handleMessage;
    start(): Promise<void>;
    stop(): Promise<void>;
    isActive(): boolean;
    sendMessage(spaceId: string, content: string, threadId?: string): Promise<string | null>;
    createSpace(name: string): Promise<string | null>;
}
//# sourceMappingURL=googlechat.d.ts.map