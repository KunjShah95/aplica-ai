import OpenAI from 'openai';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export type VoiceProvider = 'openai' | 'elevenlabs' | 'sarvam' | 'coqui';

export interface VoiceConfig {
  provider: VoiceProvider;
  model?: string;
  voice?: string;
  apiKey?: string;
  region?: string;
}

export interface TTSOptions {
  text: string;
  voice?: string;
  model?: string;
  speed?: number;
  outputFormat?: 'mp3' | 'opus' | 'aac' | 'flac';
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
}

export interface STTOptions {
  audio: Buffer | string;
  language?: string;
  model?: string;
  prompt?: string;
  responseFormat?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
  diarize?: boolean;
  numSpeakers?: number;
}

export interface VoiceMessage {
  id: string;
  type: 'tts' | 'stt';
  audioUrl?: string;
  text?: string;
  duration?: number;
  provider: VoiceProvider;
  createdAt: Date;
}

export interface VoiceModel {
  id: string;
  name: string;
  provider: VoiceProvider;
  description: string;
  supportsTTS: boolean;
  supportsSTT: boolean;
  languages?: string[];
}

export class ElevenLabsVoice {
  private apiKey: string;
  private baseUrl = 'https://api.elevenlabs.io/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async textToSpeech(
    text: string,
    options?: {
      voice?: string;
      model?: string;
      stability?: number;
      similarityBoost?: number;
      style?: number;
      useSpeakerBoost?: boolean;
    }
  ): Promise<Buffer> {
    const voiceId = options?.voice || '21m00Tcm4TlvDq8ikWAM';
    const model = options?.model || 'eleven_multilingual_v2';

    const response = await fetch(`${this.baseUrl}/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': this.apiKey,
      },
      body: JSON.stringify({
        text,
        model,
        voice_settings: {
          stability: options?.stability ?? 0.5,
          similarity_boost: options?.similarityBoost ?? 0.75,
          style: options?.style ?? 0,
          use_speaker_boost: options?.useSpeakerBoost ?? false,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ElevenLabs TTS failed: ${error}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async getVoices(): Promise<Array<{ id: string; name: string; category: string }>> {
    const response = await fetch(`${this.baseUrl}/voices`, {
      headers: { 'xi-api-key': this.apiKey },
    });

    const data = await response.json();
    return data.voices.map((v: any) => ({
      id: v.voice_id,
      name: v.name,
      category: v.category,
    }));
  }

  async getModels(): Promise<Array<{ id: string; name: string }>> {
    return [
      { id: 'eleven_multilingual_v2', name: 'Eleven Multilingual v2' },
      { id: 'eleven_monolingual_v1', name: 'Eleven English v1' },
      { id: 'eleven_turbo_v2', name: 'Eleven Turbo v2' },
    ];
  }
}

export class SarvamVoice {
  private apiKey: string;
  private baseUrl = 'https://api.sarvam.ai';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async textToSpeech(
    text: string,
    options?: {
      voice?: string;
      model?: string;
      languageCode?: string;
      pace?: number;
      pitch?: number;
      volume?: number;
    }
  ): Promise<Buffer> {
    const languageCode = options?.languageCode || 'en-IN';
    const voiceId = options?.voice || 'musical';

    const response = await fetch(`${this.baseUrl}/text-to-speech`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/wav',
        'Content-Type': 'application/json',
        'api-subscription-key': this.apiKey,
      },
      body: JSON.stringify({
        inputs: [text],
        target_language_code: languageCode,
        speaker: voiceId,
        model: options?.model || 'bulbul:v1',
        pace: options?.pace || 1.0,
        pitch: options?.pitch || 0,
        volume: options?.volume || 0,
        audio_encoding: 'wav',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Sarvam TTS failed: ${error}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async speechToText(
    audio: Buffer,
    options?: {
      languageCode?: string;
      model?: string;
    }
  ): Promise<string> {
    const languageCode = options?.languageCode || 'en-IN';

    const response = await fetch(`${this.baseUrl}/speech-to-text`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'api-subscription-key': this.apiKey,
      },
      body: JSON.stringify({
        audio: audio.toString('base64'),
        language_code: languageCode,
        model: options?.model || 'saarika:v1',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Sarvam STT failed: ${error}`);
    }

    const data = await response.json();
    return data.transcripts?.[0] || '';
  }

  async getVoices(): Promise<Array<{ id: string; name: string; language: string }>> {
    return [
      { id: 'musical', name: 'Musical', language: 'en-IN' },
      { id: 'arthor', name: 'Arthor', language: 'en-IN' },
      { id: 'revanth', name: 'Revanth', language: 'en-IN' },
      { id: 'kutral', name: 'Kutral', language: 'ta-IN' },
      { id: 'madhur', name: 'Madhur', language: 'hi-IN' },
    ];
  }

  getSupportedLanguages(): string[] {
    return [
      'en-IN',
      'hi-IN',
      'ta-IN',
      'te-IN',
      'kn-IN',
      'ml-IN',
      'mr-IN',
      'gu-IN',
      'bn-IN',
      'pa-IN',
    ];
  }
}

export class VoiceService {
  private openai: OpenAI | null = null;
  private elevenLabs: ElevenLabsVoice | null = null;
  private sarvam: SarvamVoice | null = null;
  private config: VoiceConfig;
  private cacheDir: string;

  constructor(config?: Partial<VoiceConfig>) {
    this.config = {
      provider: config?.provider || 'openai',
      model: config?.model,
      voice: config?.voice || 'alloy',
      apiKey: config?.apiKey || process.env.OPENAI_API_KEY,
      region: config?.region,
    };

    this.cacheDir = process.env.VOICE_CACHE_DIR || './voice-cache';
    this.ensureCacheDir();

    this.initializeProviders();
  }

  private ensureCacheDir(): void {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  private initializeProviders(): void {
    if (this.config.apiKey) {
      this.openai = new OpenAI({ apiKey: this.config.apiKey });
    }

    const elevenKey = process.env.ELEVENLABS_API_KEY;
    if (elevenKey) {
      this.elevenLabs = new ElevenLabsVoice(elevenKey);
    }

    const sarvamKey = process.env.SARVAM_API_KEY;
    if (sarvamKey) {
      this.sarvam = new SarvamVoice(sarvamKey);
    }
  }

  setProvider(provider: VoiceProvider, config?: Partial<VoiceConfig>): void {
    this.config = { ...this.config, ...config, provider };
    this.initializeProviders();
  }

  async textToSpeech(options: TTSOptions): Promise<Buffer> {
    switch (this.config.provider) {
      case 'elevenlabs':
        if (!this.elevenLabs) {
          throw new Error('ElevenLabs not configured. Set ELEVENLABS_API_KEY.');
        }
        return this.elevenLabs.textToSpeech(options.text, {
          voice: options.voice,
          model: options.model,
          stability: options.stability,
          similarityBoost: options.similarityBoost,
          style: options.style,
          useSpeakerBoost: options.useSpeakerBoost,
        });

      case 'sarvam':
        if (!this.sarvam) {
          throw new Error('Sarvam not configured. Set SARVAM_API_KEY.');
        }
        return this.sarvam.textToSpeech(options.text, {
          voice: options.voice,
          model: options.model,
        });

      case 'openai':
      default:
        if (!this.openai) {
          throw new Error('OpenAI not configured. Set OPENAI_API_KEY.');
        }
        const mp3 = await this.openai.audio.speech.create({
          model: options.model || 'tts-1',
          voice: (options.voice as any) || 'alloy',
          input: options.text,
          speed: options.speed || 1.0,
          response_format: options.outputFormat || 'mp3',
        });
        return Buffer.from(await mp3.arrayBuffer());
    }
  }

  async textToSpeechAndSave(options: TTSOptions): Promise<VoiceMessage> {
    const audioBuffer = await this.textToSpeech(options);

    const id = randomUUID();
    const ext = options.outputFormat || 'mp3';
    const filename = `${id}.${ext}`;
    const filepath = path.join(this.cacheDir, filename);

    fs.writeFileSync(filepath, audioBuffer);

    return {
      id,
      type: 'tts',
      audioUrl: `/voice/${filename}`,
      text: options.text,
      provider: this.config.provider,
      createdAt: new Date(),
    };
  }

  async speechToText(options: STTOptions): Promise<string> {
    let audioBuffer: Buffer;

    if (typeof options.audio === 'string') {
      if (options.audio.startsWith('http')) {
        const response = await fetch(options.audio);
        audioBuffer = Buffer.from(await response.arrayBuffer());
      } else if (fs.existsSync(options.audio)) {
        audioBuffer = fs.readFileSync(options.audio);
      } else {
        throw new Error('Invalid audio source');
      }
    } else {
      audioBuffer = options.audio;
    }

    if (this.config.provider === 'sarvam' && this.sarvam) {
      return this.sarvam.speechToText(audioBuffer, {
        languageCode: options.language,
        model: options.model,
      });
    }

    if (!this.openai) {
      throw new Error('OpenAI not configured for STT');
    }

    const transcription = await this.openai.audio.transcriptions.create({
      file: new File([new Uint8Array(audioBuffer)], 'audio.mp3', { type: 'audio/mpeg' }) as any,
      model: options.model || 'whisper-1',
      language: options.language,
      prompt: options.prompt,
      response_format: (options.responseFormat as any) || 'json',
    });

    return (transcription as any).text || transcription;
  }

  async speechToTextAndSave(options: STTOptions): Promise<VoiceMessage> {
    const text = await this.speechToText(options);

    const id = randomUUID();
    let audioUrl: string | undefined;

    if (typeof options.audio === 'string' && !options.audio.startsWith('http')) {
      const ext = path.extname(options.audio);
      const filename = `${id}${ext}`;
      const filepath = path.join(this.cacheDir, filename);
      fs.copyFileSync(options.audio, filepath);
      audioUrl = `/voice/${filename}`;
    }

    return {
      id,
      type: 'stt',
      audioUrl,
      text,
      provider: this.config.provider,
      createdAt: new Date(),
    };
  }

  getVoices(provider?: VoiceProvider): Array<VoiceModel> {
    const p = provider || this.config.provider;

    if (p === 'elevenlabs') {
      return [
        {
          id: 'Rachel',
          name: 'Rachel',
          provider: 'elevenlabs',
          description: 'Calm and confident',
          supportsTTS: true,
          supportsSTT: false,
        },
        {
          id: 'Domi',
          name: 'Domi',
          provider: 'elevenlabs',
          description: 'Deep and authoritative',
          supportsTTS: true,
          supportsSTT: false,
        },
        {
          id: 'Fin',
          name: 'Fin',
          provider: 'elevenlabs',
          description: 'Bold and direct',
          supportsTTS: true,
          supportsSTT: false,
        },
        {
          id: 'Rachel',
          name: 'Rachel',
          provider: 'elevenlabs',
          description: 'Calm and confident',
          supportsTTS: true,
          supportsSTT: false,
        },
        {
          id: 'alloy',
          name: 'Alloy',
          provider: 'openai',
          description: 'Neutral and versatile',
          supportsTTS: true,
          supportsSTT: false,
        },
        {
          id: 'echo',
          name: 'Echo',
          provider: 'openai',
          description: 'Warm and friendly',
          supportsTTS: true,
          supportsSTT: false,
        },
      ];
    }

    if (p === 'sarvam') {
      return [
        {
          id: 'musical',
          name: 'Musical',
          provider: 'sarvam',
          description: 'Expressive Indian English',
          supportsTTS: true,
          supportsSTT: true,
          languages: ['en-IN'],
        },
        {
          id: 'arthor',
          name: 'Arthor',
          provider: 'sarvam',
          description: 'Professional male voice',
          supportsTTS: true,
          supportsSTT: true,
          languages: ['en-IN'],
        },
        {
          id: 'kutral',
          name: 'Kutral',
          provider: 'sarvam',
          description: 'Tamil male voice',
          supportsTTS: true,
          supportsSTT: true,
          languages: ['ta-IN'],
        },
        {
          id: 'madhur',
          name: 'Madhur',
          provider: 'sarvam',
          description: 'Hindi male voice',
          supportsTTS: true,
          supportsSTT: true,
          languages: ['hi-IN'],
        },
      ];
    }

    return [
      {
        id: 'alloy',
        name: 'Alloy',
        provider: 'openai',
        description: 'Neutral, versatile',
        supportsTTS: true,
        supportsSTT: false,
      },
      {
        id: 'echo',
        name: 'Echo',
        provider: 'openai',
        description: 'Warm, friendly',
        supportsTTS: true,
        supportsSTT: false,
      },
      {
        id: 'fable',
        name: 'Fable',
        provider: 'openai',
        description: 'Expressive, storytelling',
        supportsTTS: true,
        supportsSTT: false,
      },
      {
        id: 'onyx',
        name: 'Onyx',
        provider: 'openai',
        description: 'Deep, authoritative',
        supportsTTS: true,
        supportsSTT: false,
      },
      {
        id: 'nova',
        name: 'Nova',
        provider: 'openai',
        description: 'Energetic, youthful',
        supportsTTS: true,
        supportsSTT: false,
      },
      {
        id: 'shimmer',
        name: 'Shimmer',
        provider: 'openai',
        description: 'Soft, gentle',
        supportsTTS: true,
        supportsSTT: false,
      },
    ];
  }

  async streamTextToSpeech(options: TTSOptions, onChunk: (chunk: Buffer) => void): Promise<void> {
    if (this.config.provider !== 'openai' || !this.openai) {
      throw new Error('Streaming only supported with OpenAI provider');
    }

    const response = await this.openai.audio.speech.create({
      model: options.model || 'tts-1',
      voice: (options.voice as any) || 'alloy',
      input: options.text,
      speed: options.speed || 1.0,
      response_format: 'mp3',
    });

    const reader = (response as any).body?.getReader();
    if (!reader) {
      throw new Error('Unable to read response stream');
    }

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        onChunk(Buffer.from(value));
      }
    } finally {
      reader.releaseLock();
    }
  }
}

export const voiceService = new VoiceService();
