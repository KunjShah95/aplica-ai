export interface TTSOptions {
    text: string;
    voice?: string;
    model?: 'tts-1' | 'tts-1-hd';
    speed?: number;
    outputFormat?: 'mp3' | 'opus' | 'aac' | 'flac';
}
export interface TTSResult {
    success: boolean;
    audioBase64?: string;
    audioPath?: string;
    error?: string;
}
export interface STTOptions {
    audioUrl?: string;
    audioPath?: string;
    audioBase64?: string;
    language?: string;
    model?: 'whisper-1';
}
export interface STTResult {
    success: boolean;
    text?: string;
    error?: string;
}
export declare class VoiceTool {
    private openaiApiKey?;
    private elevenLabsApiKey?;
    private outputDir;
    constructor(options?: {
        openaiApiKey?: string;
        elevenLabsApiKey?: string;
        outputDir?: string;
    });
    textToSpeech(options: TTSOptions): Promise<TTSResult>;
    textToSpeechElevenLabs(options: TTSOptions & {
        voiceId?: string;
    }): Promise<TTSResult>;
    speechToText(options: STTOptions): Promise<STTResult>;
    getVoices(): Promise<{
        success: boolean;
        voices?: any[];
        error?: string;
    }>;
    setOutputDir(dir: string): void;
}
export declare const voiceTool: VoiceTool;
export default voiceTool;
//# sourceMappingURL=voice.d.ts.map