export interface TTSOptions {
    voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
    model?: 'tts-1' | 'tts-1-hd';
    speed?: number;
    format?: 'mp3' | 'opus' | 'aac' | 'flac';
}
export interface STTOptions {
    model?: 'whisper-1';
    language?: string;
    prompt?: string;
    temperature?: number;
}
export interface TranscriptionResult {
    text: string;
    language?: string;
    duration?: number;
    segments?: {
        start: number;
        end: number;
        text: string;
    }[];
}
export declare class VoiceService {
    private client;
    private outputDir;
    constructor(apiKey?: string, outputDir?: string);
    textToSpeech(text: string, options?: TTSOptions): Promise<Buffer>;
    textToSpeechFile(text: string, filename: string, options?: TTSOptions): Promise<string>;
    speechToText(audioBuffer: Buffer, options?: STTOptions): Promise<TranscriptionResult>;
    speechToTextFile(filePath: string, options?: STTOptions): Promise<TranscriptionResult>;
    translate(audioBuffer: Buffer, options?: Omit<STTOptions, 'language'>): Promise<TranscriptionResult>;
}
export declare class OllamaVoiceService {
    private baseUrl;
    constructor(baseUrl?: string);
    textToSpeech(text: string): Promise<Buffer>;
    speechToText(audioBuffer: Buffer): Promise<TranscriptionResult>;
}
export declare function createVoiceService(type?: 'openai' | 'ollama'): VoiceService | OllamaVoiceService;
export declare const voiceService: VoiceService;
//# sourceMappingURL=voice.d.ts.map