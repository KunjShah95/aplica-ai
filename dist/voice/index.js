import OpenAI from 'openai';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
export class ElevenLabsVoice {
    apiKey;
    baseUrl = 'https://api.elevenlabs.io/v1';
    constructor(apiKey) {
        this.apiKey = apiKey;
    }
    async textToSpeech(text, options) {
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
    async getVoices() {
        const response = await fetch(`${this.baseUrl}/voices`, {
            headers: { 'xi-api-key': this.apiKey },
        });
        const data = await response.json();
        return data.voices.map((v) => ({
            id: v.voice_id,
            name: v.name,
            category: v.category,
        }));
    }
    async getModels() {
        return [
            { id: 'eleven_multilingual_v2', name: 'Eleven Multilingual v2' },
            { id: 'eleven_monolingual_v1', name: 'Eleven English v1' },
            { id: 'eleven_turbo_v2', name: 'Eleven Turbo v2' },
        ];
    }
}
export class SarvamVoice {
    apiKey;
    baseUrl = 'https://api.sarvam.ai';
    constructor(apiKey) {
        this.apiKey = apiKey;
    }
    async textToSpeech(text, options) {
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
    async speechToText(audio, options) {
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
    async getVoices() {
        return [
            { id: 'musical', name: 'Musical', language: 'en-IN' },
            { id: 'arthor', name: 'Arthor', language: 'en-IN' },
            { id: 'revanth', name: 'Revanth', language: 'en-IN' },
            { id: 'kutral', name: 'Kutral', language: 'ta-IN' },
            { id: 'madhur', name: 'Madhur', language: 'hi-IN' },
        ];
    }
    getSupportedLanguages() {
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
    openai = null;
    elevenLabs = null;
    sarvam = null;
    config;
    cacheDir;
    constructor(config) {
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
    ensureCacheDir() {
        if (!fs.existsSync(this.cacheDir)) {
            fs.mkdirSync(this.cacheDir, { recursive: true });
        }
    }
    initializeProviders() {
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
    setProvider(provider, config) {
        this.config = { ...this.config, ...config, provider };
        this.initializeProviders();
    }
    async textToSpeech(options) {
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
                    voice: options.voice || 'alloy',
                    input: options.text,
                    speed: options.speed || 1.0,
                    response_format: options.outputFormat || 'mp3',
                });
                return Buffer.from(await mp3.arrayBuffer());
        }
    }
    async textToSpeechAndSave(options) {
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
    async speechToText(options) {
        let audioBuffer;
        if (typeof options.audio === 'string') {
            if (options.audio.startsWith('http')) {
                const response = await fetch(options.audio);
                audioBuffer = Buffer.from(await response.arrayBuffer());
            }
            else if (fs.existsSync(options.audio)) {
                audioBuffer = fs.readFileSync(options.audio);
            }
            else {
                throw new Error('Invalid audio source');
            }
        }
        else {
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
            file: new File([new Uint8Array(audioBuffer)], 'audio.mp3', { type: 'audio/mpeg' }),
            model: options.model || 'whisper-1',
            language: options.language,
            prompt: options.prompt,
            response_format: options.responseFormat || 'json',
        });
        return transcription.text || transcription;
    }
    async speechToTextAndSave(options) {
        const text = await this.speechToText(options);
        const id = randomUUID();
        let audioUrl;
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
    getVoices(provider) {
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
    async streamTextToSpeech(options, onChunk) {
        if (this.config.provider !== 'openai' || !this.openai) {
            throw new Error('Streaming only supported with OpenAI provider');
        }
        const response = await this.openai.audio.speech.create({
            model: options.model || 'tts-1',
            voice: options.voice || 'alloy',
            input: options.text,
            speed: options.speed || 1.0,
            response_format: 'mp3',
        });
        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error('Unable to read response stream');
        }
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                onChunk(Buffer.from(value));
            }
        }
        finally {
            reader.releaseLock();
        }
    }
}
export const voiceService = new VoiceService();
//# sourceMappingURL=index.js.map