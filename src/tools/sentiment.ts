import axios from 'axios';

export interface SentimentResult {
  success: boolean;
  sentiment?: 'positive' | 'neutral' | 'negative';
  score?: number;
  magnitude?: number;
  emotions?: {
    joy?: number;
    sadness?: number;
    anger?: number;
    fear?: number;
    surprise?: number;
  };
  sentences?: Array<{
    text: string;
    sentiment: 'positive' | 'neutral' | 'negative';
    score: number;
  }>;
  error?: string;
}

export class SentimentTool {
  private openaiApiKey?: string;
  private googleNLPApiKey?: string;

  constructor(options?: { openaiApiKey?: string; googleNLPApiKey?: string }) {
    this.openaiApiKey = options?.openaiApiKey || process.env.OPENAI_API_KEY;
    this.googleNLPApiKey = options?.googleNLPApiKey || process.env.GOOGLE_NLP_API_KEY;
  }

  async analyzeWithOpenAI(text: string): Promise<SentimentResult> {
    if (!this.openaiApiKey) {
      return { success: false, error: 'OpenAI API key not configured' };
    }

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content:
                'You are a sentiment analysis tool. Analyze the sentiment of the following text and return a JSON object with: sentiment (positive/neutral/negative), score (0-1), and emotions (joy, sadness, anger, fear, surprise each 0-1).',
            },
            {
              role: 'user',
              content: text,
            },
          ],
          temperature: 0,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const content = response.data.choices[0].message.content;
      const parsed = JSON.parse(content);

      return {
        success: true,
        sentiment: parsed.sentiment,
        score: parsed.score,
        emotions: parsed.emotions,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async analyzeWithGoogle(text: string): Promise<SentimentResult> {
    if (!this.googleNLPApiKey) {
      return { success: false, error: 'Google NLP API key not configured' };
    }

    try {
      const response = await axios.post(
        `https://language.googleapis.com/v1/documents:analyzeSentiment?key=${this.googleNLPApiKey}`,
        {
          document: {
            type: 'PLAIN_TEXT',
            content: text,
          },
          encodingType: 'UTF8',
        }
      );

      const data = response.data;
      const sentiment = data.documentSentiment;

      let sentimentLabel: 'positive' | 'neutral' | 'negative' = 'neutral';
      if (sentiment.score > 0.25) sentimentLabel = 'positive';
      else if (sentiment.score < -0.25) sentimentLabel = 'negative';

      return {
        success: true,
        sentiment: sentimentLabel,
        score: sentiment.score,
        magnitude: sentiment.magnitude,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async analyzeEntities(text: string): Promise<{
    success: boolean;
    entities?: Array<{ name: string; type: string; salience: number; metadata: any }>;
    error?: string;
  }> {
    if (!this.googleNLPApiKey) {
      return { success: false, error: 'Google NLP API key not configured' };
    }

    try {
      const response = await axios.post(
        `https://language.googleapis.com/v1/documents:analyzeEntities?key=${this.googleNLPApiKey}`,
        {
          document: {
            type: 'PLAIN_TEXT',
            content: text,
          },
          encodingType: 'UTF8',
        }
      );

      const entities = response.data.entities.map((entity: any) => ({
        name: entity.name,
        type: entity.type,
        salience: entity.salience,
        metadata: entity.metadata,
      }));

      return { success: true, entities };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async classifyContent(text: string): Promise<{
    success: boolean;
    categories?: Array<{ name: string; confidence: number }>;
    error?: string;
  }> {
    if (!this.googleNLPApiKey) {
      return { success: false, error: 'Google NLP API key not configured' };
    }

    try {
      const response = await axios.post(
        `https://language.googleapis.com/v1/documents:classifyText?key=${this.googleNLPApiKey}`,
        {
          document: {
            type: 'PLAIN_TEXT',
            content: text,
          },
        }
      );

      const categories = response.data.categories.map((cat: any) => ({
        name: cat.name,
        confidence: cat.confidence,
      }));

      return { success: true, categories };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async analyze(text: string): Promise<SentimentResult> {
    if (this.openaiApiKey) {
      return this.analyzeWithOpenAI(text);
    }
    if (this.googleNLPApiKey) {
      return this.analyzeWithGoogle(text);
    }
    return { success: false, error: 'No API key configured for sentiment analysis' };
  }
}

export const sentimentTool = new SentimentTool();

export default sentimentTool;
