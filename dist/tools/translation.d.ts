export interface TranslationOptions {
    text: string;
    targetLanguage: string;
    sourceLanguage?: string;
}
export interface TranslationResult {
    success: boolean;
    translatedText?: string;
    detectedLanguage?: string;
    error?: string;
}
export declare class TranslationTool {
    private googleTranslateApiKey?;
    private deepLApiKey?;
    constructor(options?: {
        googleTranslateApiKey?: string;
        deepLApiKey?: string;
    });
    translateWithGoogle(options: TranslationOptions): Promise<TranslationResult>;
    translateWithDeepL(options: TranslationOptions): Promise<TranslationResult>;
    translate(options: TranslationOptions): Promise<TranslationResult>;
    detectLanguage(text: string): Promise<{
        success: boolean;
        language?: string;
        confidence?: number;
        error?: string;
    }>;
    getSupportedLanguages(): Array<{
        code: string;
        name: string;
    }>;
}
export declare const translationTool: TranslationTool;
export default translationTool;
//# sourceMappingURL=translation.d.ts.map