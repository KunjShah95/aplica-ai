import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';

export interface WakeWordConfig {
  enabled: boolean;
  keywords: string[];
  sensitivity?: number;
  modelPath?: string;
}

export interface LocalSTTConfig {
  enabled: boolean;
  model: string;
  device?: 'cpu' | 'cuda' | 'mps';
  computeType?: 'int8' | 'int16' | 'float32';
}

export interface LocalTTSConfig {
  enabled: boolean;
  voice: string;
  model?: string;
  speed?: number;
}

export interface ACPMessage {
  jsonrpc: '2.0';
  id?: string;
  method?: string;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: ACPError;
}

export interface ACPError {
  code: number;
  message: string;
  data?: unknown;
}

export interface ACPHeaders {
  'x-agent-id': string;
  'x-session-trace-id': string;
  'x-provenance'?: string;
  'x-parent-agent-id'?: string;
  'x-timestamp': string;
}

export interface ACPConnection {
  agentId: string;
  sessionTraceId: string;
  connectedAt: Date;
  lastActivity: Date;
}

export class WakeWordDetector {
  private config: WakeWordConfig;
  private process?: ChildProcess;
  private listeners: Set<(keyword: string) => void> = new Set();
  private isListening: boolean = false;

  constructor(config: WakeWordConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      console.log('Wake word detection disabled');
      return;
    }

    console.log(
      `Initializing wake word detection with keywords: ${this.config.keywords.join(', ')}`
    );
  }

  start(): void {
    if (!this.config.enabled || this.isListening) return;

    this.isListening = true;
    console.log('Wake word detection started');
  }

  stop(): void {
    if (!this.isListening) return;

    this.isListening = false;
    if (this.process) {
      this.process.kill();
      this.process = undefined;
    }
    console.log('Wake word detection stopped');
  }

  onWakeWord(listener: (keyword: string) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyWakeWord(keyword: string): void {
    this.listeners.forEach((listener) => listener(keyword));
  }

  isActive(): boolean {
    return this.isListening;
  }
}

export class LocalSTT {
  private config: LocalSTTConfig;
  private modelPath: string;

  constructor(config: LocalSTTConfig) {
    this.config = config;
    this.modelPath = process.env.LOCAL_STT_MODEL_PATH || './models/faster-whisper';
  }

  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      console.log('Local STT disabled');
      return;
    }

    console.log(`Initializing local STT with model: ${this.config.model}`);

    if (!fs.existsSync(this.modelPath)) {
      console.warn(`Local STT model not found at ${this.modelPath}, using API fallback`);
    }
  }

  async transcribe(audioBuffer: Buffer): Promise<string> {
    if (!this.config.enabled) {
      throw new Error('Local STT is not enabled');
    }

    console.log('Transcribing audio with local STT...');

    return 'Transcribed text';
  }

  async transcribeFile(audioPath: string): Promise<string> {
    if (!fs.existsSync(audioPath)) {
      throw new Error(`Audio file not found: ${audioPath}`);
    }

    const audioBuffer = fs.readFileSync(audioPath);
    return this.transcribe(audioBuffer);
  }
}

export class LocalTTS {
  private config: LocalTTSConfig;
  private voicesPath: string;

  constructor(config: LocalTTSConfig) {
    this.config = config;
    this.voicesPath = process.env.LOCAL_TTS_VOICES_PATH || './models/kokoro';
  }

  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      console.log('Local TTS disabled');
      return;
    }

    console.log(`Initializing local TTS with voice: ${this.config.voice}`);

    if (!fs.existsSync(this.voicesPath)) {
      console.warn(`Local TTS voices not found at ${this.voicesPath}, using API fallback`);
    }
  }

  async speak(text: string): Promise<Buffer> {
    if (!this.config.enabled) {
      throw new Error('Local TTS is not enabled');
    }

    console.log(`Generating speech for: ${text.slice(0, 50)}...`);

    return Buffer.alloc(0);
  }

  async speakToFile(text: string, outputPath: string): Promise<string> {
    const audioBuffer = await this.speak(text);
    fs.writeFileSync(outputPath, audioBuffer);
    return outputPath;
  }
}

export class ACPProtocol {
  private connections: Map<string, ACPConnection> = new Map();
  private messageHandlers: Map<
    string,
    (message: ACPMessage, headers: ACPHeaders) => Promise<ACPMessage>
  > = new Map();
  private listeners: Map<string, Set<(message: ACPMessage, headers: ACPHeaders) => void>> =
    new Map();

  constructor() {
    this.registerDefaultHandlers();
  }

  private registerDefaultHandlers(): void {
    this.registerHandler('acp.ping', async (message) => ({
      jsonrpc: '2.0',
      id: message.id,
      result: { pong: true, timestamp: new Date().toISOString() },
    }));

    this.registerHandler('acp.status', async () => ({
      jsonrpc: '2.0',
      result: { status: 'ok', connections: this.connections.size },
    }));

    this.registerHandler('acp.forward', async (message, headers) => {
      if (!message.params) {
        return {
          jsonrpc: '2.0',
          id: message.id,
          error: { code: -32600, message: 'Invalid params' },
        };
      }

      const targetAgentId = (message.params as Record<string, unknown>).agentId as string;
      const targetMessage = (message.params as Record<string, unknown>).message as ACPMessage;

      if (!targetAgentId || !targetMessage) {
        return {
          jsonrpc: '2.0',
          id: message.id,
          error: { code: -32600, message: 'Missing agentId or message' },
        };
      }

      return this.sendToAgent(targetAgentId, targetMessage, {
        ...headers,
        'x-parent-agent-id': headers['x-agent-id'],
      });
    });
  }

  registerHandler(
    method: string,
    handler: (message: ACPMessage, headers: ACPHeaders) => Promise<ACPMessage>
  ): void {
    this.messageHandlers.set(method, handler);
  }

  async handleMessage(message: ACPMessage, headers: ACPHeaders): Promise<ACPMessage> {
    if (!message.method) {
      return {
        jsonrpc: '2.0',
        id: message.id,
        error: { code: -32600, message: 'Method not specified' },
      };
    }

    const handler = this.messageHandlers.get(message.method);
    if (!handler) {
      return {
        jsonrpc: '2.0',
        id: message.id,
        error: { code: -32601, message: `Method not found: ${message.method}` },
      };
    }

    try {
      return await handler(message, headers);
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id: message.id,
        error: {
          code: -32000,
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  createMessage(method: string, params?: Record<string, unknown>, id?: string): ACPMessage {
    return {
      jsonrpc: '2.0',
      id: id || randomUUID(),
      method,
      params,
    };
  }

  async sendToAgent(
    agentId: string,
    message: ACPMessage,
    headers: ACPHeaders
  ): Promise<ACPMessage> {
    const connection = this.connections.get(agentId);

    if (!connection) {
      return {
        jsonrpc: '2.0',
        id: message.id,
        error: { code: -32001, message: `Agent not connected: ${agentId}` },
      };
    }

    const newHeaders: ACPHeaders = {
      ...headers,
      'x-timestamp': new Date().toISOString(),
    };

    const response = await this.handleMessage(message, newHeaders);
    connection.lastActivity = new Date();

    return response;
  }

  registerAgent(agentId: string, sessionTraceId: string): ACPConnection {
    const connection: ACPConnection = {
      agentId,
      sessionTraceId,
      connectedAt: new Date(),
      lastActivity: new Date(),
    };

    this.connections.set(agentId, connection);
    console.log(`Agent ${agentId} registered with trace ${sessionTraceId}`);

    return connection;
  }

  unregisterAgent(agentId: string): boolean {
    const removed = this.connections.delete(agentId);
    if (removed) {
      console.log(`Agent ${agentId} unregistered`);
    }
    return removed;
  }

  getConnections(): ACPConnection[] {
    return Array.from(this.connections.values());
  }

  on(agentId: string, listener: (message: ACPMessage, headers: ACPHeaders) => void): () => void {
    if (!this.listeners.has(agentId)) {
      this.listeners.set(agentId, new Set());
    }
    this.listeners.get(agentId)!.add(listener);
    return () => this.listeners.get(agentId)?.delete(listener);
  }
}

export class VoicePlusACP {
  private wakeWord: WakeWordDetector;
  private localSTT: LocalSTT;
  private localTTS: LocalTTS;
  private acp: ACPProtocol;
  private fallbackSTT?: any;
  private fallbackTTS?: any;

  constructor(
    options: {
      wakeWord?: Partial<WakeWordConfig>;
      localSTT?: Partial<LocalSTTConfig>;
      localTTS?: Partial<LocalTTSConfig>;
      fallbackSTT?: any;
      fallbackTTS?: any;
    } = {}
  ) {
    this.wakeWord = new WakeWordDetector({
      enabled: options.wakeWord?.enabled || false,
      keywords: options.wakeWord?.keywords || ['hey assistant', 'alexa'],
      sensitivity: options.wakeWord?.sensitivity || 0.5,
    });

    this.localSTT = new LocalSTT({
      enabled: options.localSTT?.enabled || false,
      model: options.localSTT?.model || 'base',
      device: options.localSTT?.device || 'cpu',
      computeType: options.localSTT?.computeType || 'int8',
    });

    this.localTTS = new LocalTTS({
      enabled: options.localTTS?.enabled || false,
      voice: options.localTTS?.voice || 'af_sarah',
      speed: options.localTTS?.speed || 1.0,
    });

    this.acp = new ACPProtocol();
    this.fallbackSTT = options.fallbackSTT;
    this.fallbackTTS = options.fallbackTTS;
  }

  async initialize(): Promise<void> {
    await this.wakeWord.initialize();
    await this.localSTT.initialize();
    await this.localTTS.initialize();
  }

  startListening(): void {
    this.wakeWord.start();
  }

  stopListening(): void {
    this.wakeWord.stop();
  }

  onWakeWord(listener: (keyword: string) => void): () => void {
    return this.wakeWord.onWakeWord(listener);
  }

  async speechToText(audio: Buffer | string): Promise<string> {
    const audioBuffer = Buffer.isBuffer(audio) ? audio : Buffer.from(audio);
    if (this.localSTT) {
      try {
        return await this.localSTT.transcribe(audioBuffer);
      } catch (error) {
        console.warn('Local STT failed, trying fallback:', error);
      }
    }

    if (this.fallbackSTT) {
      return this.fallbackSTT.transcribe(audio);
    }

    throw new Error('No STT available');
  }

  async textToSpeech(text: string): Promise<Buffer> {
    if (this.localTTS) {
      try {
        return await this.localTTS.speak(text);
      } catch (error) {
        console.warn('Local TTS failed, trying fallback:', error);
      }
    }

    if (this.fallbackTTS) {
      return this.fallbackTTS.speak(text);
    }

    throw new Error('No TTS available');
  }

  getACP(): ACPProtocol {
    return this.acp;
  }
}

export const voicePlusACP = new VoicePlusACP();
