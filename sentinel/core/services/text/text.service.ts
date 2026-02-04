import { SentenceTransformer } from '../models/sentence-transformer.js';
import { IntentClassifier } from '../nlp/intent.js';
import { EntityExtractor } from '../nlp/entity.js';
import { SentimentAnalyzer } from '../nlp/sentiment.js';
import { SyntaxParser } from '../nlp/syntax.js';
import { config } from '../../config/index.js';

export interface TextInput {
  text: string;
  language?: string;
}

export interface TextProcessingResult {
  embedding: number[];
  tokens: Token[];
  intent: IntentResult;
  entities: EntityResult[];
  sentiment: SentimentResult;
  syntax: SyntaxResult;
  coreference: CoreferenceResult;
  readability: ReadabilityResult;
  summary?: string;
  keywords: Keyword[];
}

export interface Token {
  text: string;
  lemma: string;
  pos: string;
  tag: string;
  dependency: string;
  embedding: number[];
}

export interface IntentResult {
  primary: string;
  secondary?: string;
  confidence: number;
  slots: Record<string, any>;
}

export interface EntityResult {
  text: string;
  type:
    | 'person'
    | 'location'
    | 'organization'
    | 'date'
    | 'money'
    | 'percent'
    | 'quantity'
    | 'custom';
  subtype?: string;
  start: number;
  end: number;
  confidence: number;
  embedding: number[];
  canonical?: string;
}

export interface SentimentResult {
  polarity: 'positive' | 'negative' | 'neutral';
  score: number;
  aspects: AspectSentiment[];
  emotions: EmotionResult[];
}

export interface AspectSentiment {
  aspect: string;
  polarity: 'positive' | 'negative' | 'neutral';
  score: number;
}

export interface EmotionResult {
  emotion: string;
  score: number;
}

export interface SyntaxResult {
  tree: any;
  dependencies: Dependency[];
  clauses: Clause[];
}

export interface Dependency {
  type: string;
  governor: string;
  dependent: string;
}

export interface Clause {
  type: 'main' | 'subordinate' | 'relative';
  subject?: string;
  verb?: string;
  object?: string;
  adverbial?: string;
}

export interface CoreferenceResult {
  clusters: CoreferenceCluster[];
  mentions: Mention[];
}

export interface CoreferenceCluster {
  id: number;
  mentions: Mention[];
}

export interface Mention {
  id: string;
  text: string;
  type: 'pronoun' | 'noun' | 'proper';
  start: number;
  end: number;
  antecedent?: string;
}

export interface ReadabilityResult {
  grade: number;
  level: 'elementary' | 'middle' | 'high' | 'college';
  fleschKincaid: number;
  fleschReading: number;
  gunningFog: number;
  suggestions: string[];
}

export interface Keyword {
  text: string;
  score: number;
  importance: 'high' | 'medium' | 'low';
  category: 'topic' | 'action' | 'entity' | 'modifier';
}

export class TextService {
  private embeddingModel: SentenceTransformer;
  private intentClassifier: IntentClassifier;
  private entityExtractor: EntityExtractor;
  private sentimentAnalyzer: SentimentAnalyzer;
  private syntaxParser: SyntaxParser;
  private cache: Map<string, CachedTextResult>;

  constructor() {
    this.embeddingModel = new SentenceTransformer({
      model: 'all-MiniLM-L6-v2',
      device: 'cpu',
    });
    this.intentClassifier = new IntentClassifier({
      model: 'intentsbert',
      threshold: 0.7,
    });
    this.entityExtractor = new EntityExtractor({
      model: 'nerbert',
      includeNorm: true,
    });
    this.sentimentAnalyzer = new SentimentAnalyzer({
      model: 'sentibert',
      includeAspects: true,
      includeEmotions: true,
    });
    this.syntaxParser = new SyntaxParser({
      model: 'spacy',
      includeDependencies: true,
      includeClauses: true,
    });
    this.cache = new Map();
  }

  async process(text: string, context?: Context): Promise<TextProcessingResult> {
    const cacheKey = this.generateCacheKey(text, context);
    const cached = this.cache.get(cacheKey);
    if (cached && !this.isExpired(cached)) {
      return cached.result;
    }

    const normalizedText = this.normalizeText(text);

    const [
      embedding,
      tokens,
      intent,
      entities,
      sentiment,
      syntax,
      coreference,
      readability,
      keywords,
    ] = await Promise.all([
      this.embeddingModel.encode(normalizedText),
      this.tokenize(normalizedText),
      this.intentClassifier.classify(normalizedText, context),
      this.entityExtractor.extract(normalizedText, context),
      this.sentimentAnalyzer.analyze(normalizedText, context),
      this.syntaxParser.parse(normalizedText),
      this.resolveCoreferences(normalizedText, tokens),
      this.assessReadability(normalizedText),
      this.extractKeywords(normalizedText, tokens),
    ]);

    const summary = await this.summarize(normalizedText, context);

    const result: TextProcessingResult = {
      embedding,
      tokens,
      intent,
      entities,
      sentiment,
      syntax,
      coreference,
      readability,
      summary,
      keywords,
    };

    this.cache.set(cacheKey, {
      result,
      timestamp: Date.now(),
      ttl: 600000,
    });

    return result;
  }

  async detectLanguage(text: string): Promise<LanguageDetectionResult> {
    const langLM = require('../models/langdetect');

    return langLM.detect(text);
  }

  async translate(
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<TranslationResult> {
    const translator = require('../models/translate');

    return translator.translate(text, sourceLanguage, targetLanguage);
  }

  async paraphrase(
    text: string,
    style?: 'formal' | 'casual' | 'simple' | 'academic'
  ): Promise<string> {
    const paraphraseLM = require('../models/paraphrase');

    return paraphraseLM.generate(text, { style });
  }

  async extractQuestions(text: string): Promise<ExtractedQuestion[]> {
    const questionLM = require('../models/question-extractor');

    return questionLM.extract(text);
  }

  private normalizeText(text: string): string {
    return text.replace(/\s+/g, ' ').replace(/\n+/g, ' ').trim();
  }

  private async tokenize(text: string): Promise<Token[]> {
    const tokenizer = require('../models/tokenizer');

    return tokenizer.tokenize(text);
  }

  private generateCacheKey(text: string, context?: Context): string {
    const hash = require('crypto')
      .createHash('sha256')
      .update(text + JSON.stringify(context?.sessionId))
      .digest('hex');
    return hash;
  }

  private isExpired(cached: CachedTextResult): boolean {
    return Date.now() - cached.timestamp > cached.ttl;
  }

  private async resolveCoreferences(text: string, tokens: Token[]): Promise<CoreferenceResult> {
    const corefLM = require('../models/coreference');

    return corefLM.resolve(text, tokens);
  }

  private async assessReadability(text: string): Promise<ReadabilityResult> {
    const words = text.split(/\s+/);
    const sentences = text.split(/[.!?]+/).filter((s) => s.length > 0);
    const syllables = this.countSyllables(text);

    const fleschKincaid =
      0.39 * (words.length / sentences.length) + 11.8 * (syllables / words.length) - 15.59;

    const fleschReading =
      206.835 - 1.015 * (words.length / sentences.length) - 84.6 * (syllables / words.length);

    const complexWords = words.filter((w) => this.countSyllables(w) >= 3).length;
    const gunningFog =
      0.4 * (words.length / sentences.length + 100 * (complexWords / words.length));

    const suggestions: string[] = [];
    if (fleschKincaid > 12) {
      suggestions.push('Consider using shorter sentences and simpler words.');
    }
    if (words.length > 20) {
      suggestions.push('Some sentences are quite long. Consider breaking them up.');
    }

    return {
      grade: Math.round(fleschKincaid),
      level:
        fleschKincaid <= 6
          ? 'elementary'
          : fleschKincaid <= 9
            ? 'middle'
            : fleschKincaid <= 13
              ? 'high'
              : 'college',
      fleschKincaid,
      fleschReading,
      gunningFog,
      suggestions,
    };
  }

  private countSyllables(text: string): number {
    const words = text.toLowerCase().split(/\s+/);
    let total = 0;

    for (const word of words) {
      total += this.countWordSyllables(word);
    }

    return total;
  }

  private countWordSyllables(word: string): number {
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (word.length <= 3) return 1;

    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');

    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
  }

  private async extractKeywords(text: string, tokens: Token[]): Promise<Keyword[]> {
    const keywordLM = require('../models/keyword-extractor');

    return keywordLM.extract(text, tokens);
  }

  private async summarize(text: string, context?: Context): Promise<string> {
    const summarizer = require('../models/summarizer');

    return summarizer.generate(text, {
      maxLength: 100,
      minLength: 30,
    });
  }
}

interface CachedTextResult {
  result: TextProcessingResult;
  timestamp: number;
  ttl: number;
}

interface Context {
  sessionId: string;
  userId: string;
}

interface LanguageDetectionResult {
  language: string;
  confidence: number;
  alternatives: { language: string; confidence: number }[];
}

interface TranslationResult {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence: number;
}

interface ExtractedQuestion {
  question: string;
  type: 'what' | 'who' | 'where' | 'when' | 'why' | 'how' | 'which' | 'yesno';
  answer?: string;
  confidence: number;
}

export { TextService };
