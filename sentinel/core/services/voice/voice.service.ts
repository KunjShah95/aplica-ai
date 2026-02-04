import { Readable } from 'stream';
import { WhisperV3 } from '../models/whisper.js';
import { TTSEngine } from '../models/tts.js';
import { AudioPreprocessor } from '../audio/preprocessor.js';
import { SpeechDiarization } from '../audio/diarization.js';
import { IntentExtractor } from '../nlp/intent.js';
import { config } from '../../config/index.js';

export interface VoiceInput {
  audio: Buffer | Readable;
  sampleRate: number;
  channels: number;
  format: string;
}

export interface VoiceProcessingResult {
  text: string;
  confidence: number;
  language: string;
  segments: VoiceSegment[];
  embedding: number[];
  speakerDiarization: Speaker[];
  intent: string;
  entities: Entity[];
  sentiment: Sentiment;
  emotionalTone: EmotionalTone;
}

export interface VoiceSegment {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
  speaker?: string;
}

export interface Speaker {
  id: string;
  label: string;
  confidence: number;
}

export interface EmotionalTone {
  primary: string;
  secondary?: string;
  intensity: number;
}

export interface Entity {
  type: string;
  value: string;
  startTime: number;
  endTime: number;
  confidence: number;
}

export interface Sentiment {
  polarity: 'positive' | 'negative' | 'neutral';
  score: number;
}

export class VoiceService {
  private whisper: WhisperV3;
  private tts: TTSEngine;
  private preprocessor: AudioPreprocessor;
  private diarization: SpeechDiarization;
  private intentExtractor: IntentExtractor;
  private cache: Map<string, CachedResult>;

  constructor() {
    this.whisper = new WhisperV3({ model: 'whisper-v3' });
    this.tts = new TTSEngine({ voice: 'en-US-female-neutral' });
    this.preprocessor = new AudioPreprocessor();
    this.diarization = new SpeechDiarization();
    this.intentExtractor = new IntentExtractor();
    this.cache = new Map();
  }

  async process(audio: Buffer | Readable, context: Context): Promise<VoiceProcessingResult> {
    const cacheKey = this.generateCacheKey(audio, context);
    const cached = this.cache.get(cacheKey);
    if (cached && !this.isExpired(cached)) {
      return cached.result;
    }

    const audioBuffer = audio instanceof Readable ? await this.streamToBuffer(audio) : audio;

    const normalizedAudio = await this.preprocessor.normalize(audioBuffer);
    const voiceActivity = await this.preprocessor.detectVoiceActivity(normalizedAudio);

    if (!voiceActivity.hasVoice) {
      return {
        text: '',
        confidence: 0,
        language: 'unknown',
        segments: [],
        embedding: [],
        speakerDiarization: [],
        intent: 'NO_VOICE',
        entities: [],
        sentiment: { polarity: 'neutral', score: 0 },
        emotionalTone: { primary: 'neutral', intensity: 0 },
      };
    }

    const silenceRemoved = await this.preprocessor.removeSilence(
      normalizedAudio,
      voiceActivity.segments
    );

    const transcription = await this.whisper.transcribe(silenceRemoved, {
      language: 'auto',
      task: 'transcribe',
      temperature: 0.2,
      no_speech_threshold: 0.6,
      compression_ratio_threshold: 2.4,
    });

    const speakerSegments = await this.diarization.process(silenceRemoved, {
      minSpeakers: 1,
      maxSpeakers: 4,
    });

    const mergedSegments = this.mergeTranscriptionWithDiarization(
      transcription.segments,
      speakerSegments
    );

    const embedding = await this.extractVoiceEmbedding(normalizedAudio);

    const intentResult = await this.intentExtractor.extract(transcription.text, context);

    const emotionalTone = await this.analyzeEmotionalTone(normalizedAudio, transcription.segments);

    const result: VoiceProcessingResult = {
      text: transcription.text,
      confidence: transcription.confidence,
      language: transcription.language,
      segments: mergedSegments,
      embedding,
      speakerDiarization: speakerSegments,
      intent: intentResult.intent,
      entities: intentResult.entities,
      sentiment: intentResult.sentiment,
      emotionalTone,
    };

    this.cache.set(cacheKey, {
      result,
      timestamp: Date.now(),
      ttl: 300000,
    });

    return result;
  }

  async generateSpeech(text: string, options?: SpeechOptions): Promise<Buffer> {
    return this.tts.synthesize(text, {
      voice: options?.voice || 'en-US-female-neutral',
      speed: options?.speed || 1.0,
      pitch: options?.pitch || 0,
      emotion: options?.emotion || 'neutral',
      format: 'mp3',
    });
  }

  async streamSpeech(text: string, options?: SpeechOptions): Promise<Readable> {
    return this.tts.streamSynthesize(text, {
      voice: options?.voice || 'en-US-female-neutral',
      speed: options?.speed || 1.0,
      pitch: options?.pitch || 0,
      emotion: options?.emotion || 'neutral',
      format: 'mp3',
    });
  }

  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  private generateCacheKey(audio: Buffer | Readable, context: Context): string {
    const hash = require('crypto')
      .createHash('sha256')
      .update(typeof audio === 'string' ? audio : audio.toString('base64').slice(0, 1000))
      .digest('hex');
    return `${context.sessionId}-${hash}`;
  }

  private isExpired(cached: CachedResult): boolean {
    return Date.now() - cached.timestamp > cached.ttl;
  }

  private mergeTranscriptionWithDiarization(
    transcription: TranscriptionSegment[],
    diarization: SpeakerSegment[]
  ): VoiceSegment[] {
    return transcription.map((segment, index) => ({
      id: `segment-${index}`,
      text: segment.text,
      startTime: segment.start,
      endTime: segment.end,
      confidence: segment.confidence,
      speaker: diarization.find((d) => d.start <= segment.start && d.end >= segment.end)?.label,
    }));
  }

  private async extractVoiceEmbedding(audio: Buffer): Promise<number[]> {
    const ecapaTdnn = require('speaker-embedding');
    return ecapaTdnn.extract(audio, { sampleRate: 16000 });
  }

  private async analyzeEmotionalTone(
    audio: Buffer,
    segments: TranscriptionSegment[]
  ): Promise<EmotionalTone> {
    const prosodyFeatures = await this.extractProsodyFeatures(audio);

    const emotionalModel = require('./models/emotion-classifier');
    const emotionResult = await emotionalModel.predict({
      prosody: prosodyFeatures,
      text: segments.map((s) => s.text).join(' '),
    });

    return {
      primary: emotionResult.primary,
      secondary: emotionResult.secondary,
      intensity: emotionResult.intensity,
    };
  }

  private async extractProsodyFeatures(audio: Buffer): Promise<any> {
    return {
      pitch: await this.extractPitch(audio),
      energy: await this.extractEnergy(audio),
      speakingRate: await this.extractSpeakingRate(audio),
      pausePatterns: await this.extractPausePatterns(audio),
    };
  }

  private async extractPitch(audio: Buffer): Promise<number[]> {
    return [];
  }

  private async extractEnergy(audio: Buffer): Promise<number[]> {
    return [];
  }

  private async extractSpeakingRate(audio: Buffer): Promise<number> {
    return 0;
  }

  private async extractPausePatterns(audio: Buffer): Promise<any> {
    return {};
  }
}

interface CachedResult {
  result: VoiceProcessingResult;
  timestamp: number;
  ttl: number;
}

interface TranscriptionSegment {
  text: string;
  start: number;
  end: number;
  confidence: number;
}

interface SpeakerSegment {
  label: string;
  start: number;
  end: number;
  confidence: number;
}

interface Context {
  sessionId: string;
  userId: string;
  previousMessages?: any[];
}

interface SpeechOptions {
  voice?: string;
  speed?: number;
  pitch?: number;
  emotion?: string;
}

export { VoiceService };
