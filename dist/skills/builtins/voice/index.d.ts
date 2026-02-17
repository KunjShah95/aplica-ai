import { EventEmitter } from 'events';
export interface VoiceConfig {
    enabled: boolean;
    sttProvider: 'openai' | 'whisper' | 'browser';
    ttsProvider: 'openai' | 'elevenlabs' | 'browser';
    language: string;
    voiceId?: string;
    apiKey?: string;
}
export interface VoiceMessage {
    transcript: string;
    confidence: number;
    language: string;
    duration: number;
    timestamp: number;
}
export interface SpeechOptions {
    text: string;
    voice?: string;
    speed?: number;
    pitch?: number;
    format?: 'mp3' | 'wav' | 'ogg';
}
export declare class VoiceManager extends EventEmitter {
    private config;
    private synthesis;
    private recognition;
    private isListening;
    constructor(config?: Partial<VoiceConfig>);
    initialize(): void;
    private initializeBrowserSpeech;
    startListening(): Promise<void>;
    stopListening(): void;
    speak(options: SpeechOptions): Promise<void>;
    private browserSpeak;
    private apiSpeak;
    transcribe(audioBuffer: Buffer): Promise<VoiceMessage>;
    private browserTranscribe;
    private apiTranscribe;
    getVoices(): SpeechSynthesisVoice[];
    setLanguage(lang: string): void;
    isActive(): boolean;
}
export default VoiceManager;
//# sourceMappingURL=index.d.ts.map