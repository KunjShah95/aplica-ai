import axios from 'axios';
export class OCRTool {
    googleVisionApiKey;
    constructor(options) {
        this.googleVisionApiKey = options?.googleVisionApiKey || process.env.GOOGLE_VISION_API_KEY;
    }
    async recognizeFromUrl(imageUrl, language) {
        try {
            const response = await axios.post(`https://vision.googleapis.com/v1/images:annotate?key=${this.googleVisionApiKey}`, {
                requests: [
                    {
                        image: { source: { imageUri: imageUrl } },
                        features: [{ type: 'TEXT_DETECTION' }],
                        imageContext: language ? { languageHints: [language] } : {},
                    },
                ],
            });
            const text = response.data.responses[0]?.textAnnotations?.[0]?.description || '';
            const confidence = response.data.responses[0]?.textAnnotations?.[0]?.confidence;
            return {
                success: true,
                text,
                confidence,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    async recognizeFromBase64(base64Image, language) {
        try {
            const response = await axios.post(`https://vision.googleapis.com/v1/images:annotate?key=${this.googleVisionApiKey}`, {
                requests: [
                    {
                        image: { content: base64Image },
                        features: [{ type: 'TEXT_DETECTION' }],
                        imageContext: language ? { languageHints: [language] } : {},
                    },
                ],
            });
            const text = response.data.responses[0]?.textAnnotations?.[0]?.description || '';
            const confidence = response.data.responses[0]?.textAnnotations?.[0]?.confidence;
            return {
                success: true,
                text,
                confidence,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    async analyzeImage(imageUrl) {
        if (!this.googleVisionApiKey) {
            return { success: false, error: 'Google Vision API key not configured' };
        }
        try {
            const response = await axios.post(`https://vision.googleapis.com/v1/images:annotate?key=${this.googleVisionApiKey}`, {
                requests: [
                    {
                        image: { source: { imageUri: imageUrl } },
                        features: [{ type: 'LABEL_DETECTION', maxResults: 10 }, { type: 'TEXT_DETECTION' }],
                    },
                ],
            });
            const labels = response.data.responses[0]?.labelAnnotations?.map((label) => ({
                description: label.description,
                score: label.score,
            }));
            const text = response.data.responses[0]?.textAnnotations?.[0]?.description;
            return {
                success: true,
                labels,
                text,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    async detectFaces(imageUrl) {
        if (!this.googleVisionApiKey) {
            return { success: false, error: 'Google Vision API key not configured' };
        }
        try {
            const response = await axios.post(`https://vision.googleapis.com/v1/images:annotate?key=${this.googleVisionApiKey}`, {
                requests: [
                    {
                        image: { source: { imageUri: imageUrl } },
                        features: [{ type: 'FACE_DETECTION', maxResults: 5 }],
                    },
                ],
            });
            const faces = response.data.responses[0]?.faceAnnotations?.map((face) => ({
                joy: face.joyLikelihood,
                sorrow: face.sorrowLikelihood,
                anger: face.angerLikelihood,
                surprise: face.surpriseLikelihood,
                bbox: face.boundingPoly,
            }));
            return { success: true, faces };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    async detectLogos(imageUrl) {
        if (!this.googleVisionApiKey) {
            return { success: false, error: 'Google Vision API key not configured' };
        }
        try {
            const response = await axios.post(`https://vision.googleapis.com/v1/images:annotate?key=${this.googleVisionApiKey}`, {
                requests: [
                    {
                        image: { source: { imageUri: imageUrl } },
                        features: [{ type: 'LOGO_DETECTION', maxResults: 5 }],
                    },
                ],
            });
            const logos = response.data.responses[0]?.logoAnnotations?.map((logo) => ({
                description: logo.description,
                score: logo.score,
                bbox: logo.boundingPoly,
            }));
            return { success: true, logos };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    async detectLandmarks(imageUrl) {
        if (!this.googleVisionApiKey) {
            return { success: false, error: 'Google Vision API key not configured' };
        }
        try {
            const response = await axios.post(`https://vision.googleapis.com/v1/images:annotate?key=${this.googleVisionApiKey}`, {
                requests: [
                    {
                        image: { source: { imageUri: imageUrl } },
                        features: [{ type: 'LANDMARK_DETECTION', maxResults: 5 }],
                    },
                ],
            });
            const landmarks = response.data.responses[0]?.landmarkAnnotations?.map((landmark) => ({
                description: landmark.description,
                score: landmark.score,
                location: landmark.locations,
            }));
            return { success: true, landmarks };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    async safeSearch(imageUrl) {
        if (!this.googleVisionApiKey) {
            return { success: false, error: 'Google Vision API key not configured' };
        }
        try {
            const response = await axios.post(`https://vision.googleapis.com/v1/images:annotate?key=${this.googleVisionApiKey}`, {
                requests: [
                    {
                        image: { source: { imageUri: imageUrl } },
                        features: [{ type: 'SAFE_SEARCH_DETECTION' }],
                    },
                ],
            });
            const safe = response.data.responses[0]?.safeSearchAnnotation;
            return {
                success: true,
                adult: safe?.adult,
                violence: safe?.violence,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
}
export const ocrTool = new OCRTool();
export default ocrTool;
//# sourceMappingURL=ocr.js.map