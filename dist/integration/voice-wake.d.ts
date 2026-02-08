import { EventEmitter } from 'events';
export interface VoiceWakeConfig {
    enabled: boolean;
    wakeWord: string;
    sensitivity: number;
    audioDevice?: string;
    silenceTimeout: number;
    maxRecordingDuration: number;
}
export interface ElevenLabsConfig {
    apiKey: string;
    voiceId: string;
    modelId: string;
    stability: number;
    similarityBoost: number;
    style: number;
}
export interface SpeechToTextConfig {
    provider: 'openai' | 'google' | 'whisper';
    language: string;
    prompt?: string;
}
export interface VoiceSession {
    id: string;
    isActive: boolean;
    isListening: boolean;
    startTime: Date;
    transcripts: VoiceTranscript[];
}
export interface VoiceTranscript {
    role: 'user' | 'assistant';
    text: string;
    timestamp: Date;
    audioUrl?: string;
}
export declare class VoiceWake extends EventEmitter {
    private config;
    private isListening;
    private wakeWordProcess?;
    private silenceTimer?;
    private sessionId;
    private sessionStart;
    constructor(config: VoiceWakeConfig);
    initialize(): Promise<void>;
    startSession(): string;
    stopSession(): void;
    private resetSilenceTimer;
    private handleSilence;
    detectWakeWord(audioData: Buffer): Promise<boolean>;
    startListeningMode(): Promise<void>;
    stop(): Promise<void>;
    isActive(): boolean;
    getSessionId(): string;
}
export declare class TalkMode extends EventEmitter {
    private wake;
    private stt;
    private tts;
    private conversationMode;
    private currentSession?;
    constructor(wakeConfig: VoiceWakeConfig, sttConfig: SpeechToTextConfig, elevenLabsConfig: ElevenLabsConfig, conversationMode?: boolean);
    private setupEventHandlers;
    initialize(): Promise<void>;
    startConversation(): Promise<string>;
    stopConversation(): Promise<void>;
    private processUserInput;
    private handleResponse;
    private getAssistantResponse;
    speak(sessionId: string, text: string): Promise<void>;
    private handleSilence;
    stop(): Promise<void>;
    isConversationActive(): boolean;
    getCurrentSession(): VoiceSession | undefined;
}
export declare const createVoiceWake: (config: VoiceWakeConfig) => VoiceWake;
export declare const createTalkMode: (wakeConfig: VoiceWakeConfig, sttConfig: SpeechToTextConfig, elevenLabsConfig: ElevenLabsConfig, conversationMode?: boolean) => TalkMode;
//# sourceMappingURL=voice-wake.d.ts.map