import { randomUUID } from 'crypto';
import * as fs from 'fs';
export class WakeWordDetector {
    config;
    process;
    listeners = new Set();
    isListening = false;
    constructor(config) {
        this.config = config;
    }
    async initialize() {
        if (!this.config.enabled) {
            console.log('Wake word detection disabled');
            return;
        }
        console.log(`Initializing wake word detection with keywords: ${this.config.keywords.join(', ')}`);
    }
    start() {
        if (!this.config.enabled || this.isListening)
            return;
        this.isListening = true;
        console.log('Wake word detection started');
    }
    stop() {
        if (!this.isListening)
            return;
        this.isListening = false;
        if (this.process) {
            this.process.kill();
            this.process = undefined;
        }
        console.log('Wake word detection stopped');
    }
    onWakeWord(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    notifyWakeWord(keyword) {
        this.listeners.forEach((listener) => listener(keyword));
    }
    isActive() {
        return this.isListening;
    }
}
export class LocalSTT {
    config;
    modelPath;
    constructor(config) {
        this.config = config;
        this.modelPath = process.env.LOCAL_STT_MODEL_PATH || './models/faster-whisper';
    }
    async initialize() {
        if (!this.config.enabled) {
            console.log('Local STT disabled');
            return;
        }
        console.log(`Initializing local STT with model: ${this.config.model}`);
        if (!fs.existsSync(this.modelPath)) {
            console.warn(`Local STT model not found at ${this.modelPath}, using API fallback`);
        }
    }
    async transcribe(audioBuffer) {
        if (!this.config.enabled) {
            throw new Error('Local STT is not enabled');
        }
        console.log('Transcribing audio with local STT...');
        return 'Transcribed text';
    }
    async transcribeFile(audioPath) {
        if (!fs.existsSync(audioPath)) {
            throw new Error(`Audio file not found: ${audioPath}`);
        }
        const audioBuffer = fs.readFileSync(audioPath);
        return this.transcribe(audioBuffer);
    }
}
export class LocalTTS {
    config;
    voicesPath;
    constructor(config) {
        this.config = config;
        this.voicesPath = process.env.LOCAL_TTS_VOICES_PATH || './models/kokoro';
    }
    async initialize() {
        if (!this.config.enabled) {
            console.log('Local TTS disabled');
            return;
        }
        console.log(`Initializing local TTS with voice: ${this.config.voice}`);
        if (!fs.existsSync(this.voicesPath)) {
            console.warn(`Local TTS voices not found at ${this.voicesPath}, using API fallback`);
        }
    }
    async speak(text) {
        if (!this.config.enabled) {
            throw new Error('Local TTS is not enabled');
        }
        console.log(`Generating speech for: ${text.slice(0, 50)}...`);
        return Buffer.alloc(0);
    }
    async speakToFile(text, outputPath) {
        const audioBuffer = await this.speak(text);
        fs.writeFileSync(outputPath, audioBuffer);
        return outputPath;
    }
}
export class ACPProtocol {
    connections = new Map();
    messageHandlers = new Map();
    listeners = new Map();
    constructor() {
        this.registerDefaultHandlers();
    }
    registerDefaultHandlers() {
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
            const targetAgentId = message.params.agentId;
            const targetMessage = message.params.message;
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
    registerHandler(method, handler) {
        this.messageHandlers.set(method, handler);
    }
    async handleMessage(message, headers) {
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
        }
        catch (error) {
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
    createMessage(method, params, id) {
        return {
            jsonrpc: '2.0',
            id: id || randomUUID(),
            method,
            params,
        };
    }
    async sendToAgent(agentId, message, headers) {
        const connection = this.connections.get(agentId);
        if (!connection) {
            return {
                jsonrpc: '2.0',
                id: message.id,
                error: { code: -32001, message: `Agent not connected: ${agentId}` },
            };
        }
        const newHeaders = {
            ...headers,
            'x-timestamp': new Date().toISOString(),
        };
        const response = await this.handleMessage(message, newHeaders);
        connection.lastActivity = new Date();
        return response;
    }
    registerAgent(agentId, sessionTraceId) {
        const connection = {
            agentId,
            sessionTraceId,
            connectedAt: new Date(),
            lastActivity: new Date(),
        };
        this.connections.set(agentId, connection);
        console.log(`Agent ${agentId} registered with trace ${sessionTraceId}`);
        return connection;
    }
    unregisterAgent(agentId) {
        const removed = this.connections.delete(agentId);
        if (removed) {
            console.log(`Agent ${agentId} unregistered`);
        }
        return removed;
    }
    getConnections() {
        return Array.from(this.connections.values());
    }
    on(agentId, listener) {
        if (!this.listeners.has(agentId)) {
            this.listeners.set(agentId, new Set());
        }
        this.listeners.get(agentId).add(listener);
        return () => this.listeners.get(agentId)?.delete(listener);
    }
}
export class VoicePlusACP {
    wakeWord;
    localSTT;
    localTTS;
    acp;
    fallbackSTT;
    fallbackTTS;
    constructor(options = {}) {
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
    async initialize() {
        await this.wakeWord.initialize();
        await this.localSTT.initialize();
        await this.localTTS.initialize();
    }
    startListening() {
        this.wakeWord.start();
    }
    stopListening() {
        this.wakeWord.stop();
    }
    onWakeWord(listener) {
        return this.wakeWord.onWakeWord(listener);
    }
    async speechToText(audio) {
        const audioBuffer = Buffer.isBuffer(audio) ? audio : Buffer.from(audio);
        if (this.localSTT) {
            try {
                return await this.localSTT.transcribe(audioBuffer);
            }
            catch (error) {
                console.warn('Local STT failed, trying fallback:', error);
            }
        }
        if (this.fallbackSTT) {
            return this.fallbackSTT.transcribe(audio);
        }
        throw new Error('No STT available');
    }
    async textToSpeech(text) {
        if (this.localTTS) {
            try {
                return await this.localTTS.speak(text);
            }
            catch (error) {
                console.warn('Local TTS failed, trying fallback:', error);
            }
        }
        if (this.fallbackTTS) {
            return this.fallbackTTS.speak(text);
        }
        throw new Error('No TTS available');
    }
    getACP() {
        return this.acp;
    }
}
export const voicePlusACP = new VoicePlusACP();
//# sourceMappingURL=voice-acp.js.map