import { MessageRouter } from '../router.js';
export interface NostrAdapterOptions {
    relayUrls: string[];
    privateKey: string;
    router: MessageRouter;
    filter?: {
        kinds?: number[];
        since?: number;
    };
}
export declare class NostrAdapter {
    private router;
    private relayUrls;
    private privateKey;
    private relays;
    private subscriptions;
    private isRunning;
    constructor(options: NostrAdapterOptions);
    start(): Promise<void>;
    stop(): Promise<void>;
    private connectToRelay;
    private subscribe;
    private handleMessage;
    private processEvent;
    publish(content: string, kind?: number, tags?: string[][]): Promise<void>;
    private getPublicKey;
    private getEventHash;
    private signEvent;
    isActive(): boolean;
}
//# sourceMappingURL=nostr.d.ts.map