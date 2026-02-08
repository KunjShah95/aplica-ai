export interface VoiceConfig {
    openaiApiKey?: string;
    ElevenLabsApiKey?: string;
    ElevenLabsVoiceId?: string;
    ElevenLabsModel?: string;
    defaultVoice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
    defaultLanguage?: string;
}
export interface TTSOptions {
    text: string;
    voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
    model?: 'tts-1' | 'tts-1-hd';
    speed?: number;
    responseFormat?: 'mp3' | 'opus' | 'aac' | 'flac';
    outputPath?: string;
    returnBuffer?: boolean;
}
export interface STTOptions {
    audioBuffer: Buffer;
    model?: 'whisper-1';
    language?: string;
    prompt?: string;
    temperature?: number;
    responseFormat?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
}
export interface TranscriptionResult {
    text: string;
    duration?: number;
    language?: string;
}
export interface VoicePreset {
    name: string;
    voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
    speed: number;
}
export declare class VoiceService {
    private openai;
    private config;
    private presets;
    constructor(config: VoiceConfig);
    setApiKey(apiKey: string): void;
    textToSpeech(options: TTSOptions): Promise<Buffer | string>;
    speechToText(options: STTOptions): Promise<TranscriptionResult>;
    translateAudio(audioBuffer: Buffer): Promise<TranscriptionResult>;
    saveAudio(buffer: Buffer, filePath: string, format?: 'mp3' | 'wav' | 'ogg'): Promise<string>;
    loadAudio(filePath: string): Promise<Buffer>;
    addPreset(preset: VoicePreset): void;
    getPreset(name: string): VoicePreset | undefined;
    listPresets(): VoicePreset[];
    generateSpeechWithPreset(text: string, presetName: string, options?: Partial<TTSOptions>): Promise<Buffer | string>;
    createSsml(text: string, options?: {
        voice?: string;
        rate?: 'slow' | 'medium' | 'fast';
        pitch?: string;
    }): Promise<string>;
    textToSpeechSsml(ssml: string, options?: Partial<TTSOptions>): Promise<Buffer | string>;
    getAudioDuration(audioBuffer: Buffer): Promise<number>;
    private parseMp3Header;
}
export declare function createVoiceService(config: VoiceConfig): VoiceService;
//# sourceMappingURL=voice.d.ts.map