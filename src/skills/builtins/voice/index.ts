import { EventEmitter } from "events";
import { Readable } from "stream";

export interface VoiceConfig {
  enabled: boolean;
  sttProvider: "openai" | "whisper" | "browser";
  ttsProvider: "openai" | "elevenlabs" | "browser";
  language: string;
  voiceId?: string;
  apiKey?: string;
}

export interface VoiceMessage {
  transcript: string;
  confidence: number;
  language: string;
  duration: number;
  timestamp: number;
}

export interface SpeechOptions {
  text: string;
  voice?: string;
  speed?: number;
  pitch?: number;
  format?: "mp3" | "wav" | "ogg";
}

export class VoiceManager extends EventEmitter {
  private config: VoiceConfig;
  private synthesis: SpeechSynthesis | null = null;
  private recognition: any = null;
  private isListening = false;

  constructor(config: Partial<VoiceConfig> = {}) {
    super();
    this.config = {
      enabled: config.enabled ?? true,
      sttProvider: config.sttProvider ?? "browser",
      ttsProvider: config.ttsProvider ?? "browser",
      language: config.language ?? "en-US",
      voiceId: config.voiceId,
      apiKey: config.apiKey,
    };
  }

  initialize(): void {
    if (typeof window !== "undefined") {
      this.initializeBrowserSpeech();
    }
  }

  private initializeBrowserSpeech(): void {
    if ("speechSynthesis" in window) {
      this.synthesis = window.speechSynthesis;
    }

    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition =
        (window as any).webkitSpeechRecognition ||
        (window as any).SpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = this.config.language;

      this.recognition.onresult = (event: any) => {
        const results = event.results;
        const lastResult = results[results.length - 1];
        const transcript = lastResult[0].transcript;
        const confidence = lastResult[0].confidence;

        this.emit("transcript", {
          transcript,
          confidence,
          language: this.config.language,
          duration: 0,
          timestamp: Date.now(),
        });

        if (lastResult.isFinal) {
          this.emit("message", {
            transcript,
            confidence,
            language: this.config.language,
            duration: 0,
            timestamp: Date.now(),
          });
        }
      };

      this.recognition.onerror = (event: any) => {
        this.emit("error", new Error(event.error));
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.emit("stop");
      };
    }
  }

  async startListening(): Promise<void> {
    if (!this.recognition) {
      throw new Error("Speech recognition not supported");
    }

    if (this.isListening) return;

    this.isListening = true;
    this.recognition.start();
    this.emit("start");
  }

  stopListening(): void {
    if (!this.recognition || !this.isListening) return;
    this.recognition.stop();
    this.isListening = false;
  }

  async speak(options: SpeechOptions): Promise<void> {
    if (this.config.ttsProvider === "browser" && this.synthesis) {
      await this.browserSpeak(options);
    } else {
      await this.apiSpeak(options);
    }
  }

  private async browserSpeak(options: SpeechOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synthesis) {
        reject(new Error("Speech synthesis not supported"));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(options.text);

      if (options.voice) {
        const voices = this.synthesis.getVoices();
        const selectedVoice = voices.find(
          (v) => v.name === options.voice || v.lang.startsWith(options.voice),
        );
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
      }

      utterance.rate = options.speed ?? 1;
      utterance.pitch = options.pitch ?? 1;
      utterance.lang = this.config.language;

      utterance.onend = () => resolve();
      utterance.onerror = (event) => reject(new Error(event.error));

      this.synthesis.speak(utterance);
    });
  }

  private async apiSpeak(options: SpeechOptions): Promise<void> {
    if (!this.config.apiKey) {
      throw new Error("API key not configured for TTS");
    }

    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        input: options.text,
        voice: options.voice ?? "alloy",
        speed: options.speed ?? 1.0,
        response_format: options.format ?? "mp3",
      }),
    });

    if (!response.ok) {
      throw new Error("TTS request failed");
    }

    const audioBuffer = await response.arrayBuffer();
    const audioBlob = new Blob([audioBuffer], {
      type: `audio/${options.format ?? "mp3"}`,
    });
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);

    await new Promise((resolve, reject) => {
      audio.onended = resolve;
      audio.onerror = reject;
      audio.play();
    });
  }

  async transcribe(audioBuffer: Buffer): Promise<VoiceMessage> {
    if (this.config.sttProvider === "browser") {
      return this.browserTranscribe(audioBuffer);
    }
    return this.apiTranscribe(audioBuffer);
  }

  private async browserTranscribe(audioBuffer: Buffer): Promise<VoiceMessage> {
    return {
      transcript: "Browser transcription requires microphone input",
      confidence: 0,
      language: this.config.language,
      duration: 0,
      timestamp: Date.now(),
    };
  }

  private async apiTranscribe(audioBuffer: Buffer): Promise<VoiceMessage> {
    if (!this.config.apiKey) {
      throw new Error("API key not configured for STT");
    }

    const formData = new FormData();
    formData.append("file", new Blob([audioBuffer]), "audio.wav");
    formData.append("model", "whisper-1");
    formData.append("language", this.config.language.split("-")[0]);

    const response = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: formData,
      },
    );

    if (!response.ok) {
      throw new Error("STT request failed");
    }

    const result = await response.json();

    return {
      transcript: result.text,
      confidence: 0.9,
      language: this.config.language,
      duration: result.duration || 0,
      timestamp: Date.now(),
    };
  }

  getVoices(): SpeechSynthesisVoice[] {
    if (!this.synthesis) return [];
    return this.synthesis
      .getVoices()
      .filter((v) => v.lang.startsWith(this.config.language.split("-")[0]));
  }

  setLanguage(lang: string): void {
    this.config.language = lang;
    if (this.recognition) {
      this.recognition.lang = lang;
    }
  }

  isActive(): boolean {
    return this.isListening;
  }
}

export default VoiceManager;
