import OpenAI from 'openai';
import * as fs from 'fs/promises';
import * as path from 'path';
export class VoiceService {
    client;
    outputDir;
    constructor(apiKey, outputDir) {
        this.client = new OpenAI({
            apiKey: apiKey || process.env.OPENAI_API_KEY,
        });
        this.outputDir = outputDir || './voice_output';
    }
    async textToSpeech(text, options = {}) {
        const { voice = 'alloy', model = 'tts-1', speed = 1.0, format = 'mp3' } = options;
        const response = await this.client.audio.speech.create({
            model,
            voice,
            input: text,
            speed,
            response_format: format,
        });
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
    }
    async textToSpeechFile(text, filename, options = {}) {
        const buffer = await this.textToSpeech(text, options);
        await fs.mkdir(this.outputDir, { recursive: true });
        const filePath = path.join(this.outputDir, filename);
        await fs.writeFile(filePath, buffer);
        return filePath;
    }
    async speechToText(audioBuffer, options = {}) {
        const { model = 'whisper-1', language, prompt, temperature } = options;
        const file = new File([audioBuffer], 'audio.webm', { type: 'audio/webm' });
        const response = await this.client.audio.transcriptions.create({
            model,
            file,
            language,
            prompt,
            temperature,
            response_format: 'verbose_json',
        });
        return {
            text: response.text,
            language: response.language,
            duration: response.duration,
            segments: response.segments?.map((s) => ({
                start: s.start,
                end: s.end,
                text: s.text,
            })),
        };
    }
    async speechToTextFile(filePath, options = {}) {
        const buffer = await fs.readFile(filePath);
        return this.speechToText(buffer, options);
    }
    async translate(audioBuffer, options = {}) {
        const { model = 'whisper-1', prompt, temperature } = options;
        const file = new File([audioBuffer], 'audio.webm', { type: 'audio/webm' });
        const response = await this.client.audio.translations.create({
            model,
            file,
            prompt,
            temperature,
            response_format: 'verbose_json',
        });
        return {
            text: response.text,
            duration: response.duration,
            segments: response.segments?.map((s) => ({
                start: s.start,
                end: s.end,
                text: s.text,
            })),
        };
    }
}
export class OllamaVoiceService {
    baseUrl;
    constructor(baseUrl) {
        this.baseUrl = baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    }
    async textToSpeech(text) {
        const response = await fetch(`${this.baseUrl}/api/tts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
        });
        if (!response.ok) {
            throw new Error(`Ollama TTS failed: ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
    }
    async speechToText(audioBuffer) {
        const formData = new FormData();
        formData.append('file', new Blob([audioBuffer]));
        const response = await fetch(`${this.baseUrl}/api/stt`, {
            method: 'POST',
            body: formData,
        });
        if (!response.ok) {
            throw new Error(`Ollama STT failed: ${response.statusText}`);
        }
        const data = await response.json();
        return { text: data.text };
    }
}
export function createVoiceService(type = 'openai') {
    switch (type) {
        case 'openai':
            return new VoiceService();
        case 'ollama':
            return new OllamaVoiceService();
        default:
            return new VoiceService();
    }
}
export const voiceService = new VoiceService();
//# sourceMappingURL=voice.js.map