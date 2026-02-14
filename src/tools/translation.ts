import axios from 'axios';

export interface TranslationOptions {
  text: string;
  targetLanguage: string;
  sourceLanguage?: string;
}

export interface TranslationResult {
  success: boolean;
  translatedText?: string;
  detectedLanguage?: string;
  error?: string;
}

export class TranslationTool {
  private googleTranslateApiKey?: string;
  private deepLApiKey?: string;

  constructor(options?: { googleTranslateApiKey?: string; deepLApiKey?: string }) {
    this.googleTranslateApiKey =
      options?.googleTranslateApiKey || process.env.GOOGLE_TRANSLATE_API_KEY;
    this.deepLApiKey = options?.deepLApiKey || process.env.DEEPL_API_KEY;
  }

  async translateWithGoogle(options: TranslationOptions): Promise<TranslationResult> {
    if (!this.googleTranslateApiKey) {
      return { success: false, error: 'Google Translate API key not configured' };
    }

    try {
      const response = await axios.post(
        `https://translation.googleapis.com/language/translate/v2?key=${this.googleTranslateApiKey}`,
        {
          q: options.text,
          target: options.targetLanguage,
          source: options.sourceLanguage,
          format: 'text',
        }
      );

      const data = response.data.data.translations[0];
      return {
        success: true,
        translatedText: data.translatedText,
        detectedLanguage: data.detectedSourceLanguage,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async translateWithDeepL(options: TranslationOptions): Promise<TranslationResult> {
    if (!this.deepLApiKey) {
      return { success: false, error: 'DeepL API key not configured' };
    }

    try {
      const response = await axios.post(
        'https://api-free.deepl.com/v2/translate',
        {
          text: [options.text],
          target_lang: options.targetLanguage.toUpperCase(),
          source_lang: options.sourceLanguage?.toUpperCase(),
        },
        {
          headers: {
            'Authorization': `DeepL-Auth-Key ${this.deepLApiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        success: true,
        translatedText: response.data.translations[0].text,
        detectedLanguage: response.data.translations[0].detected_source_language?.toLowerCase(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async translate(options: TranslationOptions): Promise<TranslationResult> {
    if (this.deepLApiKey) {
      return this.translateWithDeepL(options);
    }
    return this.translateWithGoogle(options);
  }

  async detectLanguage(text: string): Promise<{
    success: boolean;
    language?: string;
    confidence?: number;
    error?: string;
  }> {
    if (!this.googleTranslateApiKey) {
      return { success: false, error: 'Google Translate API key not configured' };
    }

    try {
      const response = await axios.post(
        `https://translation.googleapis.com/language/translate/v2/detect?key=${this.googleTranslateApiKey}`,
        { q: text }
      );

      const data = response.data.data.detections[0][0];
      return {
        success: true,
        language: data.language,
        confidence: data.confidence,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  getSupportedLanguages(): Array<{ code: string; name: string }> {
    return [
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Spanish' },
      { code: 'fr', name: 'French' },
      { code: 'de', name: 'German' },
      { code: 'it', name: 'Italian' },
      { code: 'pt', name: 'Portuguese' },
      { code: 'ru', name: 'Russian' },
      { code: 'ja', name: 'Japanese' },
      { code: 'ko', name: 'Korean' },
      { code: 'zh', name: 'Chinese' },
      { code: 'ar', name: 'Arabic' },
      { code: 'hi', name: 'Hindi' },
      { code: 'nl', name: 'Dutch' },
      { code: 'pl', name: 'Polish' },
      { code: 'tr', name: 'Turkish' },
      { code: 'vi', name: 'Vietnamese' },
      { code: 'th', name: 'Thai' },
      { code: 'sv', name: 'Swedish' },
      { code: 'da', name: 'Danish' },
      { code: 'fi', name: 'Finnish' },
      { code: 'no', name: 'Norwegian' },
      { code: 'cs', name: 'Czech' },
      { code: 'el', name: 'Greek' },
      { code: 'he', name: 'Hebrew' },
      { code: 'id', name: 'Indonesian' },
      { code: 'ms', name: 'Malay' },
      { code: 'ro', name: 'Romanian' },
      { code: 'uk', name: 'Ukrainian' },
    ];
  }
}

export const translationTool = new TranslationTool();

export default translationTool;
