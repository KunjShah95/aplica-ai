export interface ImageGenerationRequest {
    prompt: string;
    model?: 'dall-e-3' | 'dall-e-2' | 'flux';
    size?: '1024x1024' | '1792x1024' | '1024x1792';
    quality?: 'standard' | 'hd';
    style?: 'vivid' | 'natural';
    iterations?: number;
}
export interface GeneratedImage {
    id: string;
    url: string;
    prompt: string;
    model: string;
    createdAt: Date;
    iterations: number;
    feedback?: string;
}
export declare class ImageGenerator {
    private galleryPath;
    private openaiApiKey?;
    private cache;
    constructor(options?: {
        galleryPath?: string;
        openaiApiKey?: string;
    });
    generate(request: ImageGenerationRequest): Promise<GeneratedImage>;
    private callAPI;
    private generateWithDALL;
}
export declare const imageGenerator: ImageGenerator;
export interface MusicRequest {
    mood: string;
    duration?: number;
    tempo?: number;
    instruments?: string[];
    genre?: string;
}
export interface GeneratedMusic {
    id: string;
    url: string;
    waveform?: string;
    duration: number;
    prompt: string;
    createdAt: Date;
}
export declare class MusicComposer {
    private sunoApiKey?;
    constructor(options?: {
        sunoApiKey?: string;
    });
    compose(request: MusicRequest): Promise<GeneratedMusic>;
    private buildPrompt;
    private composeWithSuno;
    private composeLocally;
}
export declare const musicComposer: MusicComposer;
export interface VideoStoryboardRequest {
    topic: string;
    duration?: number;
    style?: 'documentary' | 'educational' | 'entertainment' | 'tutorial';
}
export interface StoryboardScene {
    sceneNumber: number;
    title: string;
    duration: number;
    visualDescription: string;
    audioDescription: string;
    script?: string;
}
export interface GeneratedStoryboard {
    id: string;
    topic: string;
    totalDuration: number;
    scenes: StoryboardScene[];
    fullScript: string;
    createdAt: Date;
}
export declare class VideoStoryboard {
    private llmApiKey?;
    constructor(options?: {
        llmApiKey?: string;
    });
    generate(request: VideoStoryboardRequest): Promise<GeneratedStoryboard>;
    private generateVisualDescription;
    private generateAudioDescription;
    private generateFullScript;
    exportToJSON(storyboard: GeneratedStoryboard): Promise<string>;
    exportToMarkdown(storyboard: GeneratedStoryboard): Promise<string>;
}
export declare const videoStoryboard: VideoStoryboard;
//# sourceMappingURL=index.d.ts.map