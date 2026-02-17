export interface ImageGenerationOptions {
    prompt: string;
    model?: 'dall-e-2' | 'dall-e-3' | 'stable-diffusion';
    size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
    quality?: 'standard' | 'hd';
    style?: 'vivid' | 'natural';
    n?: number;
}
export interface ImageGenerationResult {
    success: boolean;
    imageUrl?: string;
    revisedPrompt?: string;
    error?: string;
}
export declare class ImageGenerator {
    private openaiApiKey?;
    private stabilityApiKey?;
    constructor(options?: {
        openaiApiKey?: string;
        stabilityApiKey?: string;
    });
    generateWithDALL_E(options: ImageGenerationOptions): Promise<ImageGenerationResult>;
    generateWithStability(prompt: string, options?: {
        width?: number;
        height?: number;
        steps?: number;
        seed?: number;
    }): Promise<ImageGenerationResult>;
    generate(options: ImageGenerationOptions): Promise<ImageGenerationResult>;
}
export declare const imageGenerator: ImageGenerator;
export default imageGenerator;
//# sourceMappingURL=image-generator.d.ts.map