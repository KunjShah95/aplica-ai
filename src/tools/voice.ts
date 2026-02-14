import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuid } from 'uuid';

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

export class VoiceTool {
  private openaiApiKey?: string;
  private elevenLabsApiKey?: string;
  private outputDir: string;

  constructor(options?: { openaiApiKey?: string; elevenLabsApiKey?: string; outputDir?: string }) {
    this.openaiApiKey = options?.openaiApiKey || process.env.OPENAI_API_KEY;
    this.elevenLabsApiKey = options?.elevenLabsApiKey || process.env.ELEVEN_LABS_API_KEY;
    this.outputDir = options?.outputDir || './output/audio';

    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async textToSpeech(options: TTSOptions): Promise<TTSResult> {
    if (!this.openaiApiKey) {
      return { success: false, error: 'OpenAI API key not configured' };
    }

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/audio/speech',
        {
          model: options.model || 'tts-1',
          voice: options.voice || 'alloy',
          input: options.text,
          speed: options.speed || 1.0,
          response_format: options.outputFormat || 'mp3',
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          responseType: 'arraybuffer',
        }
      );

      const audioBuffer = Buffer.from(response.data, 'binary');
      const fileName = `tts-${uuid()}.${options.outputFormat || 'mp3'}`;
      const filePath = path.join(this.outputDir, fileName);

      fs.writeFileSync(filePath, audioBuffer);

      return {
        success: true,
        audioBase64: audioBuffer.toString('base64'),
        audioPath: filePath,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async textToSpeechElevenLabs(options: TTSOptions & { voiceId?: string }): Promise<TTSResult> {
    if (!this.elevenLabsApiKey) {
      return { success: false, error: 'ElevenLabs API key not configured' };
    }

    try {
      const voiceId = options.voiceId || '21m00Tcm4TlvDq8ikWAM';

      const response = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          text: options.text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': this.elevenLabsApiKey,
          },
          responseType: 'arraybuffer',
        }
      );

      const audioBuffer = Buffer.from(response.data, 'binary');
      const fileName = `tts-eleven-${uuid()}.mp3`;
      const filePath = path.join(this.outputDir, fileName);

      fs.writeFileSync(filePath, audioBuffer);

      return {
        success: true,
        audioBase64: audioBuffer.toString('base64'),
        audioPath: filePath,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async speechToText(options: STTOptions): Promise<STTResult> {
    if (!this.openaiApiKey) {
      return { success: false, error: 'OpenAI API key not configured' };
    }

    try {
      let audioData: Buffer;

      if (options.audioPath) {
        audioData = fs.readFileSync(options.audioPath);
      } else if (options.audioBase64) {
        audioData = Buffer.from(options.audioBase64, 'base64');
      } else if (options.audioUrl) {
        const response = await axios.get(options.audioUrl, { responseType: 'arraybuffer' });
        audioData = Buffer.from(response.data, 'binary');
      } else {
        return { success: false, error: 'No audio source provided' };
      }

      const formData = new (await import('form-data')).default();
      formData.append('file', audioData, { filename: 'audio.mp3', contentType: 'audio/mp3' });
      formData.append('model', options.model || 'whisper-1');
      if (options.language) {
        formData.append('language', options.language);
      }

      const response = await axios.post(
        'https://api.openai.com/v1/audio/transcriptions',
        formData,
        {
          headers: {
            Authorization: `Bearer ${this.openaiApiKey}`,
            ...formData.getHeaders(),
          },
        }
      );

      return {
        success: true,
        text: response.data.text,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async getVoices(): Promise<{ success: boolean; voices?: any[]; error?: string }> {
    if (!this.elevenLabsApiKey) {
      return { success: false, error: 'ElevenLabs API key not configured' };
    }

    try {
      const response = await axios.get('https://api.elevenlabs.io/v1/voices', {
        headers: { 'xi-api-key': this.elevenLabsApiKey },
      });

      return {
        success: true,
        voices: response.data.voices,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  setOutputDir(dir: string): void {
    this.outputDir = dir;
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }
}

export const voiceTool = new VoiceTool();

export default voiceTool;
