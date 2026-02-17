export interface OCRResult {
    success: boolean;
    text?: string;
    confidence?: number;
    words?: Array<{
        word: string;
        confidence: number;
        bbox: {
            x0: number;
            y0: number;
            x1: number;
            y1: number;
        };
    }>;
    error?: string;
}
export interface ImageAnalysisResult {
    success: boolean;
    labels?: Array<{
        description: string;
        score: number;
    }>;
    text?: string;
    error?: string;
}
export declare class OCRTool {
    private googleVisionApiKey?;
    constructor(options?: {
        googleVisionApiKey?: string;
    });
    recognizeFromUrl(imageUrl: string, language?: string): Promise<OCRResult>;
    recognizeFromBase64(base64Image: string, language?: string): Promise<OCRResult>;
    analyzeImage(imageUrl: string): Promise<ImageAnalysisResult>;
    detectFaces(imageUrl: string): Promise<{
        success: boolean;
        faces?: Array<{
            joy: number;
            sorrow: number;
            anger: number;
            surprise: number;
            bbox: any;
        }>;
        error?: string;
    }>;
    detectLogos(imageUrl: string): Promise<{
        success: boolean;
        logos?: Array<{
            description: string;
            score: number;
            bbox: any;
        }>;
        error?: string;
    }>;
    detectLandmarks(imageUrl: string): Promise<{
        success: boolean;
        landmarks?: Array<{
            description: string;
            score: number;
            location: any;
        }>;
        error?: string;
    }>;
    safeSearch(imageUrl: string): Promise<{
        success: boolean;
        adult?: string;
        violence?: string;
        error?: string;
    }>;
}
export declare const ocrTool: OCRTool;
export default ocrTool;
//# sourceMappingURL=ocr.d.ts.map