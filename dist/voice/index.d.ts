export type VoiceProvider = 'openai' | 'elevenlabs' | 'sarvam' | 'coqui';
export interface VoiceConfig {
    provider: VoiceProvider;
    model?: string;
    voice?: string;
    apiKey?: string;
    region?: string;
}
export interface TTSOptions {
    text: string;
    voice?: string;
    model?: string;
    speed?: number;
    outputFormat?: 'mp3' | 'opus' | 'aac' | 'flac';
    stability?: number;
    similarityBoost?: number;
    style?: number;
    useSpeakerBoost?: boolean;
}
export interface STTOptions {
    audio: Buffer | string;
    language?: string;
    model?: string;
    prompt?: string;
    responseFormat?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
    diarize?: boolean;
    numSpeakers?: number;
}
export interface VoiceMessage {
    id: string;
    type: 'tts' | 'stt';
    audioUrl?: string;
    text?: string;
    duration?: number;
    provider: VoiceProvider;
    createdAt: Date;
}
export interface VoiceModel {
    id: string;
    name: string;
    provider: VoiceProvider;
    description: string;
    supportsTTS: boolean;
    supportsSTT: boolean;
    languages?: string[];
}
export declare class ElevenLabsVoice {
    private apiKey;
    private baseUrl;
    constructor(apiKey: string);
    textToSpeech(text: string, options?: {
        voice?: string;
        model?: string;
        stability?: number;
        similarityBoost?: number;
        style?: number;
        useSpeakerBoost?: boolean;
    }): Promise<Buffer>;
    getVoices(): Promise<Array<{
        id: string;
        name: string;
        category: string;
    }>>;
    getModels(): Promise<Array<{
        id: string;
        name: string;
    }>>;
}
export declare class SarvamVoice {
    private apiKey;
    private baseUrl;
    constructor(apiKey: string);
    textToSpeech(text: string, options?: {
        voice?: string;
        model?: string;
        languageCode?: string;
        pace?: number;
        pitch?: number;
        volume?: number;
    }): Promise<Buffer>;
    speechToText(audio: Buffer, options?: {
        languageCode?: string;
        model?: string;
    }): Promise<string>;
    getVoices(): Promise<Array<{
        id: string;
        name: string;
        language: string;
    }>>;
    getSupportedLanguages(): string[];
}
export declare class VoiceService {
    private openai;
    private elevenLabs;
    private sarvam;
    private config;
    private cacheDir;
    constructor(config?: Partial<VoiceConfig>);
    private ensureCacheDir;
    private initializeProviders;
    setProvider(provider: VoiceProvider, config?: Partial<VoiceConfig>): void;
    textToSpeech(options: TTSOptions): Promise<Buffer>;
    textToSpeechAndSave(options: TTSOptions): Promise<VoiceMessage>;
    speechToText(options: STTOptions): Promise<string>;
    speechToTextAndSave(options: STTOptions): Promise<VoiceMessage>;
    getVoices(provider?: VoiceProvider): Array<VoiceModel>;
    streamTextToSpeech(options: TTSOptions, onChunk: (chunk: Buffer) => void): Promise<void>;
}
export declare const voiceService: VoiceService;
//# sourceMappingURL=index.d.ts.map