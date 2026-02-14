import axios from 'axios';

export interface OCRResult {
  success: boolean;
  text?: string;
  confidence?: number;
  words?: Array<{
    word: string;
    confidence: number;
    bbox: { x0: number; y0: number; x1: number; y1: number };
  }>;
  error?: string;
}

export interface ImageAnalysisResult {
  success: boolean;
  labels?: Array<{ description: string; score: number }>;
  text?: string;
  error?: string;
}

export class OCRTool {
  private googleVisionApiKey?: string;

  constructor(options?: { googleVisionApiKey?: string }) {
    this.googleVisionApiKey = options?.googleVisionApiKey || process.env.GOOGLE_VISION_API_KEY;
  }

  async recognizeFromUrl(imageUrl: string, language?: string): Promise<OCRResult> {
    try {
      const response = await axios.post(
        `https://vision.googleapis.com/v1/images:annotate?key=${this.googleVisionApiKey}`,
        {
          requests: [
            {
              image: { source: { imageUri: imageUrl } },
              features: [{ type: 'TEXT_DETECTION' }],
              imageContext: language ? { languageHints: [language] } : {},
            },
          ],
        }
      );

      const text = response.data.responses[0]?.textAnnotations?.[0]?.description || '';
      const confidence = response.data.responses[0]?.textAnnotations?.[0]?.confidence;

      return {
        success: true,
        text,
        confidence,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async recognizeFromBase64(base64Image: string, language?: string): Promise<OCRResult> {
    try {
      const response = await axios.post(
        `https://vision.googleapis.com/v1/images:annotate?key=${this.googleVisionApiKey}`,
        {
          requests: [
            {
              image: { content: base64Image },
              features: [{ type: 'TEXT_DETECTION' }],
              imageContext: language ? { languageHints: [language] } : {},
            },
          ],
        }
      );

      const text = response.data.responses[0]?.textAnnotations?.[0]?.description || '';
      const confidence = response.data.responses[0]?.textAnnotations?.[0]?.confidence;

      return {
        success: true,
        text,
        confidence,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async analyzeImage(imageUrl: string): Promise<ImageAnalysisResult> {
    if (!this.googleVisionApiKey) {
      return { success: false, error: 'Google Vision API key not configured' };
    }

    try {
      const response = await axios.post(
        `https://vision.googleapis.com/v1/images:annotate?key=${this.googleVisionApiKey}`,
        {
          requests: [
            {
              image: { source: { imageUri: imageUrl } },
              features: [{ type: 'LABEL_DETECTION', maxResults: 10 }, { type: 'TEXT_DETECTION' }],
            },
          ],
        }
      );

      const labels = response.data.responses[0]?.labelAnnotations?.map((label: any) => ({
        description: label.description,
        score: label.score,
      }));

      const text = response.data.responses[0]?.textAnnotations?.[0]?.description;

      return {
        success: true,
        labels,
        text,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async detectFaces(imageUrl: string): Promise<{
    success: boolean;
    faces?: Array<{ joy: number; sorrow: number; anger: number; surprise: number; bbox: any }>;
    error?: string;
  }> {
    if (!this.googleVisionApiKey) {
      return { success: false, error: 'Google Vision API key not configured' };
    }

    try {
      const response = await axios.post(
        `https://vision.googleapis.com/v1/images:annotate?key=${this.googleVisionApiKey}`,
        {
          requests: [
            {
              image: { source: { imageUri: imageUrl } },
              features: [{ type: 'FACE_DETECTION', maxResults: 5 }],
            },
          ],
        }
      );

      const faces = response.data.responses[0]?.faceAnnotations?.map((face: any) => ({
        joy: face.joyLikelihood,
        sorrow: face.sorrowLikelihood,
        anger: face.angerLikelihood,
        surprise: face.surpriseLikelihood,
        bbox: face.boundingPoly,
      }));

      return { success: true, faces };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async detectLogos(imageUrl: string): Promise<{
    success: boolean;
    logos?: Array<{ description: string; score: number; bbox: any }>;
    error?: string;
  }> {
    if (!this.googleVisionApiKey) {
      return { success: false, error: 'Google Vision API key not configured' };
    }

    try {
      const response = await axios.post(
        `https://vision.googleapis.com/v1/images:annotate?key=${this.googleVisionApiKey}`,
        {
          requests: [
            {
              image: { source: { imageUri: imageUrl } },
              features: [{ type: 'LOGO_DETECTION', maxResults: 5 }],
            },
          ],
        }
      );

      const logos = response.data.responses[0]?.logoAnnotations?.map((logo: any) => ({
        description: logo.description,
        score: logo.score,
        bbox: logo.boundingPoly,
      }));

      return { success: true, logos };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async detectLandmarks(imageUrl: string): Promise<{
    success: boolean;
    landmarks?: Array<{ description: string; score: number; location: any }>;
    error?: string;
  }> {
    if (!this.googleVisionApiKey) {
      return { success: false, error: 'Google Vision API key not configured' };
    }

    try {
      const response = await axios.post(
        `https://vision.googleapis.com/v1/images:annotate?key=${this.googleVisionApiKey}`,
        {
          requests: [
            {
              image: { source: { imageUri: imageUrl } },
              features: [{ type: 'LANDMARK_DETECTION', maxResults: 5 }],
            },
          ],
        }
      );

      const landmarks = response.data.responses[0]?.landmarkAnnotations?.map((landmark: any) => ({
        description: landmark.description,
        score: landmark.score,
        location: landmark.locations,
      }));

      return { success: true, landmarks };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async safeSearch(imageUrl: string): Promise<{
    success: boolean;
    adult?: string;
    violence?: string;
    error?: string;
  }> {
    if (!this.googleVisionApiKey) {
      return { success: false, error: 'Google Vision API key not configured' };
    }

    try {
      const response = await axios.post(
        `https://vision.googleapis.com/v1/images:annotate?key=${this.googleVisionApiKey}`,
        {
          requests: [
            {
              image: { source: { imageUri: imageUrl } },
              features: [{ type: 'SAFE_SEARCH_DETECTION' }],
            },
          ],
        }
      );

      const safe = response.data.responses[0]?.safeSearchAnnotation;

      return {
        success: true,
        adult: safe?.adult,
        violence: safe?.violence,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

export const ocrTool = new OCRTool();

export default ocrTool;
