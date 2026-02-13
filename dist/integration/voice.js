import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
export class VoiceService {
    openai = null;
    config;
    presets = new Map();
    constructor(config) {
        this.config = config;
        if (config.openaiApiKey) {
            this.openai = new OpenAI({ apiKey: config.openaiApiKey });
        }
        this.presets.set('default', {
            name: 'Default',
            voice: config.defaultVoice || 'alloy',
            speed: 1.0,
        });
    }
    setApiKey(apiKey) {
        this.openai = new OpenAI({ apiKey });
    }
    async textToSpeech(options) {
        if (!this.openai) {
            throw new Error('OpenAI client not initialized. Set API key first.');
        }
        const response = await this.openai.audio.speech.create({
            model: options.model || 'tts-1',
            voice: options.voice || this.config.defaultVoice || 'alloy',
            input: options.text,
            speed: options.speed || 1.0,
            response_format: options.responseFormat || 'mp3',
        });
        const buffer = Buffer.from(await response.arrayBuffer());
        if (options.returnBuffer) {
            return buffer;
        }
        if (options.outputPath) {
            const outputDir = path.dirname(options.outputPath);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }
            fs.writeFileSync(options.outputPath, buffer);
            return options.outputPath;
        }
        return buffer.toString('base64');
    }
    async speechToText(options) {
        if (!this.openai) {
            throw new Error('OpenAI client not initialized. Set API key first.');
        }
        const response = await this.openai.audio.transcriptions.create({
            model: options.model || 'whisper-1',
            file: new File([new Blob([new Uint8Array(options.audioBuffer)])], 'audio.mp3', {
                type: 'audio/mp3',
            }),
            language: options.language,
            prompt: options.prompt,
            temperature: options.temperature,
            response_format: options.responseFormat || 'json',
        });
        return {
            text: response.text || '',
            duration: response.duration,
            language: response.language,
        };
    }
    async translateAudio(audioBuffer) {
        if (!this.openai) {
            throw new Error('OpenAI client not initialized. Set API key first.');
        }
        const response = await this.openai.audio.translations.create({
            model: 'whisper-1',
            file: new File([new Uint8Array(audioBuffer)], 'audio.mp3', { type: 'audio/mp3' }),
        });
        return {
            text: response.text || '',
        };
    }
    async saveAudio(buffer, filePath, format = 'mp3') {
        const outputDir = path.dirname(filePath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        const ext = format === 'mp3' ? 'mp3' : format === 'wav' ? 'wav' : 'ogg';
        const fullPath = filePath.endsWith(`.${ext}`) ? filePath : `${filePath}.${ext}`;
        fs.writeFileSync(fullPath, buffer);
        return fullPath;
    }
    async loadAudio(filePath) {
        return fs.readFileSync(filePath);
    }
    addPreset(preset) {
        this.presets.set(preset.name.toLowerCase(), preset);
    }
    getPreset(name) {
        return this.presets.get(name.toLowerCase());
    }
    listPresets() {
        return Array.from(this.presets.values());
    }
    async generateSpeechWithPreset(text, presetName, options) {
        const preset = this.presets.get(presetName.toLowerCase());
        return this.textToSpeech({
            text,
            voice: preset?.voice,
            speed: preset?.speed,
            ...options,
        });
    }
    async createSsml(text, options) {
        const rate = options?.rate || 'medium';
        const pitch = options?.pitch || '+0%';
        return `<?xml version="1.0" encoding="UTF-8"?>
<speak version="1.1" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
  <voice name="${options?.voice || 'en-US-AriaNeural'}">
    <prosody rate="${rate}" pitch="${pitch}">
      ${text}
    </prosody>
  </voice>
</speak>`;
    }
    async textToSpeechSsml(ssml, options) {
        if (!this.openai) {
            throw new Error('OpenAI client not initialized. Set API key first.');
        }
        const response = await this.openai.audio.speech.create({
            model: options?.model || 'tts-1',
            voice: options?.voice || this.config.defaultVoice || 'alloy',
            input: ssml,
            speed: options?.speed || 1.0,
            response_format: options?.responseFormat || 'mp3',
        });
        const buffer = Buffer.from(await response.arrayBuffer());
        if (options?.returnBuffer) {
            return buffer;
        }
        if (options?.outputPath) {
            const outputDir = path.dirname(options.outputPath);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }
            fs.writeFileSync(options.outputPath, buffer);
            return options.outputPath;
        }
        return buffer.toString('base64');
    }
    async getAudioDuration(audioBuffer) {
        const mp3Header = this.parseMp3Header(audioBuffer);
        if (mp3Header) {
            return mp3Header.duration;
        }
        return 0;
    }
    parseMp3Header(buffer) {
        try {
            for (let i = 0; i < buffer.length - 4; i++) {
                if (buffer[i] === 0xff &&
                    (buffer[i + 1] & 0xe0) === 0xe0 &&
                    (buffer[i + 1] & 0x18) !== 0x08) {
                    const version = (buffer[i + 1] & 0x18) >> 3;
                    const layer = (buffer[i + 1] & 0x06) >> 1;
                    const bitrateIndex = (buffer[i + 2] & 0xf0) >> 4;
                    const sampleRateIndex = (buffer[i + 2] & 0x0c) >> 2;
                    const bitrates = [
                        [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448],
                        [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384],
                    ];
                    const sampleRates = [44100, 48000, 32000];
                    const bitrate = bitrates[layer === 1 ? 1 : 0][bitrateIndex];
                    const sampleRate = sampleRates[sampleRateIndex];
                    if (bitrate > 0 && sampleRate > 0) {
                        const duration = (buffer.length * 8) / (bitrate * 1000);
                        return { duration };
                    }
                }
            }
        }
        catch {
            return null;
        }
        return null;
    }
}
export function createVoiceService(config) {
    return new VoiceService(config);
}
//# sourceMappingURL=voice.js.map