import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import { randomUUID } from 'crypto';

export interface VoiceWakeConfig {
  enabled: boolean;
  wakeWord: string;
  sensitivity: number;
  audioDevice?: string;
  silenceTimeout: number;
  maxRecordingDuration: number;
}

export interface ElevenLabsConfig {
  apiKey: string;
  voiceId: string;
  modelId: string;
  stability: number;
  similarityBoost: number;
  style: number;
}

export interface SpeechToTextConfig {
  provider: 'openai' | 'google' | 'whisper';
  language: string;
  prompt?: string;
}

export interface VoiceSession {
  id: string;
  isActive: boolean;
  isListening: boolean;
  startTime: Date;
  transcripts: VoiceTranscript[];
}

export interface VoiceTranscript {
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  audioUrl?: string;
}

export class VoiceWake extends EventEmitter {
  private config: VoiceWakeConfig;
  private isListening: boolean = false;
  private wakeWordProcess?: ChildProcess;
  private silenceTimer?: NodeJS.Timeout;
  private sessionId: string = '';
  private sessionStart: Date = new Date();

  constructor(config: VoiceWakeConfig) {
    super();
    this.config = config;
  }

  async initialize(): Promise<void> {
    console.log('Voice wake initialized with wake word:', this.config.wakeWord);
  }

  startSession(): string {
    this.sessionId = randomUUID();
    this.sessionStart = new Date();
    this.isListening = true;

    this.emit('session_start', { sessionId: this.sessionId });
    console.log(`Voice session started: ${this.sessionId}`);

    return this.sessionId;
  }

  stopSession(): void {
    if (!this.sessionId) return;

    this.isListening = false;

    const duration = Date.now() - this.sessionStart.getTime();
    this.emit('session_end', { sessionId: this.sessionId, duration });

    this.sessionId = '';
    console.log(`Voice session ended after ${duration}ms`);
  }

  private resetSilenceTimer(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
    }

    this.silenceTimer = setTimeout(() => {
      this.handleSilence();
    }, this.config.silenceTimeout);
  }

  private handleSilence(): void {
    if (!this.sessionId) return;

    const duration = Date.now() - this.sessionStart.getTime();
    this.emit('silence', { sessionId: this.sessionId, duration });
    this.stopSession();
  }

  async detectWakeWord(audioData: Buffer): Promise<boolean> {
    return Math.random() < this.config.sensitivity;
  }

  async startListeningMode(): Promise<void> {
    this.resetSilenceTimer();
    this.emit('listening', { sessionId: this.sessionId });
  }

  async stop(): Promise<void> {
    this.isListening = false;

    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
    }

    if (this.wakeWordProcess) {
      this.wakeWordProcess.kill();
    }

    console.log('Voice wake stopped');
  }

  isActive(): boolean {
    return this.isListening;
  }

  getSessionId(): string {
    return this.sessionId;
  }
}

export class TalkMode extends EventEmitter {
  private wake: VoiceWake;
  private stt: SpeechToText;
  private tts: ElevenLabsTTS;
  private conversationMode: boolean;
  private currentSession?: VoiceSession;

  constructor(
    wakeConfig: VoiceWakeConfig,
    sttConfig: SpeechToTextConfig,
    elevenLabsConfig: ElevenLabsConfig,
    conversationMode: boolean = false
  ) {
    super();
    this.wake = new VoiceWake(wakeConfig);
    this.stt = new SpeechToText(sttConfig);
    this.tts = new ElevenLabsTTS(elevenLabsConfig);
    this.conversationMode = conversationMode;

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.wake.on('wake', async (event: any) => {
      this.emit('wake', event);

      if (this.conversationMode && this.currentSession?.isActive) {
        await this.handleResponse(this.currentSession.id);
      }
    });

    this.wake.on('transcript', async (event: any) => {
      if (event.isFinal && this.currentSession) {
        this.currentSession.transcripts.push({
          role: 'user',
          text: event.text,
          timestamp: new Date(),
        });

        await this.processUserInput(this.currentSession.id, event.text);
      }
    });

    this.wake.on('silence', () => {
      if (this.conversationMode && this.currentSession) {
        this.handleSilence(this.currentSession.id);
      }
    });
  }

  async initialize(): Promise<void> {
    await this.wake.initialize();
    console.log('Talk mode initialized');
  }

  async startConversation(): Promise<string> {
    const sessionId = await this.wake.startSession();
    this.currentSession = {
      id: sessionId,
      isActive: true,
      isListening: true,
      startTime: new Date(),
      transcripts: [],
    };

    return sessionId;
  }

  async stopConversation(): Promise<void> {
    this.wake.stopSession();
    this.currentSession = undefined;
  }

  private async processUserInput(sessionId: string, text: string): Promise<void> {
    this.emit('transcript', { sessionId, text, isFinal: true });

    try {
      await this.handleResponse(sessionId);
    } catch (error) {
      this.emit('error', { sessionId, error: String(error) });
    }
  }

  private async handleResponse(sessionId: string): Promise<void> {
    const session = this.currentSession;
    if (!session) return;

    const recentMessages = session.transcripts.slice(-10).map((t) => ({
      role: t.role,
      content: t.text,
    }));

    const response = await this.getAssistantResponse(recentMessages);

    session.transcripts.push({
      role: 'assistant',
      text: response,
      timestamp: new Date(),
    });

    this.emit('response', { sessionId, text: response });

    await this.speak(sessionId, response);
  }

  private async getAssistantResponse(
    messages: { role: string; content: string }[]
  ): Promise<string> {
    return 'This is a simulated response. Integrate with your agent core here.';
  }

  async speak(sessionId: string, text: string): Promise<void> {
    this.emit('audio_start', { sessionId });

    const audioUrl = await this.tts.synthesize(text);

    this.emit('audio_end', { sessionId, duration: text.length * 50 });
  }

  private handleSilence(sessionId: string): void {
    if (this.conversationMode) {
      this.emit('silence', { sessionId, duration: 5000 });
    }
  }

  async stop(): Promise<void> {
    await this.wake.stop();
    console.log('Talk mode stopped');
  }

  isConversationActive(): boolean {
    return this.currentSession?.isActive ?? false;
  }

  getCurrentSession(): VoiceSession | undefined {
    return this.currentSession;
  }
}

class SpeechToText {
  private config: SpeechToTextConfig;

  constructor(config: SpeechToTextConfig) {
    this.config = config;
  }

  async transcribe(audioData: Buffer): Promise<string> {
    switch (this.config.provider) {
      case 'openai':
        return this.transcribeWithOpenAI(audioData);
      default:
        return this.transcribeWithWhisper(audioData);
    }
  }

  private async transcribeWithOpenAI(audioData: Buffer): Promise<string> {
    const FormData = (await import('form-data')).default;
    const formData = new FormData();
    formData.append('file', audioData, { filename: 'audio.wav' });
    formData.append('model', 'whisper-1');
    if (this.config.language) {
      formData.append('language', this.config.language);
    }
    if (this.config.prompt) {
      formData.append('prompt', this.config.prompt);
    }

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: formData as any,
    });

    if (!response.ok) {
      throw new Error(`Transcription failed: ${response.statusText}`);
    }

    const data = (await response.json()) as { text?: string };
    return data.text || '';
  }

  private async transcribeWithWhisper(audioData: Buffer): Promise<string> {
    return 'Transcribed text from Whisper';
  }
}

class ElevenLabsTTS {
  private config: ElevenLabsConfig;

  constructor(config: ElevenLabsConfig) {
    this.config = config;
  }

  async synthesize(text: string): Promise<string> {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${this.config.voiceId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': this.config.apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: this.config.modelId,
          voice_settings: {
            stability: this.config.stability,
            similarity_boost: this.config.similarityBoost,
            style: this.config.style,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`TTS synthesis failed: ${response.statusText}`);
    }

    const audioBlob = await response.blob();
    return URL.createObjectURL(audioBlob);
  }

  async play(audioUrl: string): Promise<void> {
    console.log('Playing audio:', audioUrl);
  }
}

export const createVoiceWake = (config: VoiceWakeConfig) => new VoiceWake(config);
export const createTalkMode = (
  wakeConfig: VoiceWakeConfig,
  sttConfig: SpeechToTextConfig,
  elevenLabsConfig: ElevenLabsConfig,
  conversationMode?: boolean
) => new TalkMode(wakeConfig, sttConfig, elevenLabsConfig, conversationMode);
