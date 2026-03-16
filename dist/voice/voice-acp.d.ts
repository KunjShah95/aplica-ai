export interface WakeWordConfig {
    enabled: boolean;
    keywords: string[];
    sensitivity?: number;
    modelPath?: string;
}
export interface LocalSTTConfig {
    enabled: boolean;
    model: string;
    device?: 'cpu' | 'cuda' | 'mps';
    computeType?: 'int8' | 'int16' | 'float32';
}
export interface LocalTTSConfig {
    enabled: boolean;
    voice: string;
    model?: string;
    speed?: number;
}
export interface ACPMessage {
    jsonrpc: '2.0';
    id?: string;
    method?: string;
    params?: Record<string, unknown>;
    result?: unknown;
    error?: ACPError;
}
export interface ACPError {
    code: number;
    message: string;
    data?: unknown;
}
export interface ACPHeaders {
    'x-agent-id': string;
    'x-session-trace-id': string;
    'x-provenance'?: string;
    'x-parent-agent-id'?: string;
    'x-timestamp': string;
}
export interface ACPConnection {
    agentId: string;
    sessionTraceId: string;
    connectedAt: Date;
    lastActivity: Date;
}
export declare class WakeWordDetector {
    private config;
    private process?;
    private listeners;
    private isListening;
    constructor(config: WakeWordConfig);
    initialize(): Promise<void>;
    start(): void;
    stop(): void;
    onWakeWord(listener: (keyword: string) => void): () => void;
    private notifyWakeWord;
    isActive(): boolean;
}
export declare class LocalSTT {
    private config;
    private modelPath;
    constructor(config: LocalSTTConfig);
    initialize(): Promise<void>;
    transcribe(audioBuffer: Buffer): Promise<string>;
    transcribeFile(audioPath: string): Promise<string>;
}
export declare class LocalTTS {
    private config;
    private voicesPath;
    constructor(config: LocalTTSConfig);
    initialize(): Promise<void>;
    speak(text: string): Promise<Buffer>;
    speakToFile(text: string, outputPath: string): Promise<string>;
}
export declare class ACPProtocol {
    private connections;
    private messageHandlers;
    private listeners;
    constructor();
    private registerDefaultHandlers;
    registerHandler(method: string, handler: (message: ACPMessage, headers: ACPHeaders) => Promise<ACPMessage>): void;
    handleMessage(message: ACPMessage, headers: ACPHeaders): Promise<ACPMessage>;
    createMessage(method: string, params?: Record<string, unknown>, id?: string): ACPMessage;
    sendToAgent(agentId: string, message: ACPMessage, headers: ACPHeaders): Promise<ACPMessage>;
    registerAgent(agentId: string, sessionTraceId: string): ACPConnection;
    unregisterAgent(agentId: string): boolean;
    getConnections(): ACPConnection[];
    on(agentId: string, listener: (message: ACPMessage, headers: ACPHeaders) => void): () => void;
}
export declare class VoicePlusACP {
    private wakeWord;
    private localSTT;
    private localTTS;
    private acp;
    private fallbackSTT?;
    private fallbackTTS?;
    constructor(options?: {
        wakeWord?: Partial<WakeWordConfig>;
        localSTT?: Partial<LocalSTTConfig>;
        localTTS?: Partial<LocalTTSConfig>;
        fallbackSTT?: any;
        fallbackTTS?: any;
    });
    initialize(): Promise<void>;
    startListening(): void;
    stopListening(): void;
    onWakeWord(listener: (keyword: string) => void): () => void;
    speechToText(audio: Buffer | string): Promise<string>;
    textToSpeech(text: string): Promise<Buffer>;
    getACP(): ACPProtocol;
}
export declare const voicePlusACP: VoicePlusACP;
//# sourceMappingURL=voice-acp.d.ts.map