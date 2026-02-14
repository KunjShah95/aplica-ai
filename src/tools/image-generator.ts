import axios from 'axios';
import FormData from 'form-data';

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

export class ImageGenerator {
  private openaiApiKey?: string;
  private stabilityApiKey?: string;

  constructor(options?: { openaiApiKey?: string; stabilityApiKey?: string }) {
    this.openaiApiKey = options?.openaiApiKey || process.env.OPENAI_API_KEY;
    this.stabilityApiKey = options?.stabilityApiKey || process.env.STABILITY_API_KEY;
  }

  async generateWithDALL_E(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
    if (!this.openaiApiKey) {
      return { success: false, error: 'OpenAI API key not configured' };
    }

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/images/generations',
        {
          prompt: options.prompt,
          model: options.model || 'dall-e-3',
          size: options.size || '1024x1024',
          quality: options.quality || 'standard',
          style: options.style || 'vivid',
          n: options.n || 1,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.openaiApiKey}`,
          },
        }
      );

      const imageData = response.data.data[0];
      return {
        success: true,
        imageUrl: imageData.url,
        revisedPrompt: imageData.revised_prompt,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async generateWithStability(
    prompt: string,
    options?: {
      width?: number;
      height?: number;
      steps?: number;
      seed?: number;
    }
  ): Promise<ImageGenerationResult> {
    if (!this.stabilityApiKey) {
      return { success: false, error: 'Stability API key not configured' };
    }

    try {
      const formData = new FormData();
      formData.append('prompt', prompt);
      formData.append('width', String(options?.width || 1024));
      formData.append('height', String(options?.height || 1024));
      formData.append('steps', String(options?.steps || 30));
      if (options?.seed) {
        formData.append('seed', String(options.seed));
      }

      const response = await axios.post(
        'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            Authorization: `Bearer ${this.stabilityApiKey}`,
          },
        }
      );

      const base64Image = response.data.artifacts[0].base64;
      return {
        success: true,
        imageUrl: `data:image/png;base64,${base64Image}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async generate(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
    if (options.model === 'stable-diffusion') {
      return this.generateWithStability(options.prompt);
    }
    return this.generateWithDALL_E(options);
  }
}

export const imageGenerator = new ImageGenerator();

export default imageGenerator;
