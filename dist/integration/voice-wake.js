import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
export class VoiceWake extends EventEmitter {
    config;
    isListening = false;
    wakeWordProcess;
    silenceTimer;
    sessionId = '';
    sessionStart = new Date();
    constructor(config) {
        super();
        this.config = config;
    }
    async initialize() {
        console.log('Voice wake initialized with wake word:', this.config.wakeWord);
    }
    startSession() {
        this.sessionId = randomUUID();
        this.sessionStart = new Date();
        this.isListening = true;
        this.emit('session_start', { sessionId: this.sessionId });
        console.log(`Voice session started: ${this.sessionId}`);
        return this.sessionId;
    }
    stopSession() {
        if (!this.sessionId)
            return;
        this.isListening = false;
        const duration = Date.now() - this.sessionStart.getTime();
        this.emit('session_end', { sessionId: this.sessionId, duration });
        this.sessionId = '';
        console.log(`Voice session ended after ${duration}ms`);
    }
    resetSilenceTimer() {
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
        }
        this.silenceTimer = setTimeout(() => {
            this.handleSilence();
        }, this.config.silenceTimeout);
    }
    handleSilence() {
        if (!this.sessionId)
            return;
        const duration = Date.now() - this.sessionStart.getTime();
        this.emit('silence', { sessionId: this.sessionId, duration });
        this.stopSession();
    }
    async detectWakeWord(audioData) {
        return Math.random() < this.config.sensitivity;
    }
    async startListeningMode() {
        this.resetSilenceTimer();
        this.emit('listening', { sessionId: this.sessionId });
    }
    async stop() {
        this.isListening = false;
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
        }
        if (this.wakeWordProcess) {
            this.wakeWordProcess.kill();
        }
        console.log('Voice wake stopped');
    }
    isActive() {
        return this.isListening;
    }
    getSessionId() {
        return this.sessionId;
    }
}
export class TalkMode extends EventEmitter {
    wake;
    stt;
    tts;
    conversationMode;
    currentSession;
    constructor(wakeConfig, sttConfig, elevenLabsConfig, conversationMode = false) {
        super();
        this.wake = new VoiceWake(wakeConfig);
        this.stt = new SpeechToText(sttConfig);
        this.tts = new ElevenLabsTTS(elevenLabsConfig);
        this.conversationMode = conversationMode;
        this.setupEventHandlers();
    }
    setupEventHandlers() {
        this.wake.on('wake', async (event) => {
            this.emit('wake', event);
            if (this.conversationMode && this.currentSession?.isActive) {
                await this.handleResponse(this.currentSession.id);
            }
        });
        this.wake.on('transcript', async (event) => {
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
    async initialize() {
        await this.wake.initialize();
        console.log('Talk mode initialized');
    }
    async startConversation() {
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
    async stopConversation() {
        this.wake.stopSession();
        this.currentSession = undefined;
    }
    async processUserInput(sessionId, text) {
        this.emit('transcript', { sessionId, text, isFinal: true });
        try {
            await this.handleResponse(sessionId);
        }
        catch (error) {
            this.emit('error', { sessionId, error: String(error) });
        }
    }
    async handleResponse(sessionId) {
        const session = this.currentSession;
        if (!session)
            return;
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
    async getAssistantResponse(messages) {
        return 'This is a simulated response. Integrate with your agent core here.';
    }
    async speak(sessionId, text) {
        this.emit('audio_start', { sessionId });
        const audioUrl = await this.tts.synthesize(text);
        this.emit('audio_end', { sessionId, duration: text.length * 50 });
    }
    handleSilence(sessionId) {
        if (this.conversationMode) {
            this.emit('silence', { sessionId, duration: 5000 });
        }
    }
    async stop() {
        await this.wake.stop();
        console.log('Talk mode stopped');
    }
    isConversationActive() {
        return this.currentSession?.isActive ?? false;
    }
    getCurrentSession() {
        return this.currentSession;
    }
}
class SpeechToText {
    config;
    constructor(config) {
        this.config = config;
    }
    async transcribe(audioData) {
        switch (this.config.provider) {
            case 'openai':
                return this.transcribeWithOpenAI(audioData);
            default:
                return this.transcribeWithWhisper(audioData);
        }
    }
    async transcribeWithOpenAI(audioData) {
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
            body: formData,
        });
        if (!response.ok) {
            throw new Error(`Transcription failed: ${response.statusText}`);
        }
        const data = (await response.json());
        return data.text || '';
    }
    async transcribeWithWhisper(audioData) {
        return 'Transcribed text from Whisper';
    }
}
class ElevenLabsTTS {
    config;
    constructor(config) {
        this.config = config;
    }
    async synthesize(text) {
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${this.config.voiceId}`, {
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
        });
        if (!response.ok) {
            throw new Error(`TTS synthesis failed: ${response.statusText}`);
        }
        const audioBlob = await response.blob();
        return URL.createObjectURL(audioBlob);
    }
    async play(audioUrl) {
        console.log('Playing audio:', audioUrl);
    }
}
export const createVoiceWake = (config) => new VoiceWake(config);
export const createTalkMode = (wakeConfig, sttConfig, elevenLabsConfig, conversationMode) => new TalkMode(wakeConfig, sttConfig, elevenLabsConfig, conversationMode);
//# sourceMappingURL=voice-wake.js.map