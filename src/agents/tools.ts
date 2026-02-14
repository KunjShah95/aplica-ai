import { db } from '../db/index.js';
import { shellExecutor, fileSystemExecutor, browserExecutor } from '../execution/index.js';
import { imageGenerator } from '../tools/image-generator.js';
import { ocrTool } from '../tools/ocr.js';
import { voiceTool } from '../tools/voice.js';
import { weatherTool } from '../tools/weather.js';
import { newsTool } from '../tools/news.js';
import { translationTool } from '../tools/translation.js';
import { sentimentTool } from '../tools/sentiment.js';
import { summarizerTool } from '../tools/summarizer.js';
import { qrCodeTool } from '../tools/qrcode.js';
import { urlFetcher } from '../tools/url-fetcher.js';
import { rssReader } from '../tools/rss.js';
import { youtubeTool } from '../tools/youtube.js';
import { dataAnalysisTool } from '../tools/data-analysis.js';
import { urlShortener } from '../tools/url-shortener.js';

export interface ToolDefinition {
  name: string;
  description: string;
  schema: {
    type: 'object';
    properties: Record<
      string,
      {
        type: string;
        description?: string;
        enum?: string[];
        items?: { type: string };
        default?: unknown;
      }
    >;
    required?: string[];
  };
  handler: string;
  category?: string;
  permissions?: string[];
}

export interface ToolExecutionInput {
  toolId: string;
  input: Record<string, unknown>;
  userId?: string; // Added for RBAC
}

export interface ToolExecutionResult {
  id: string;
  output: unknown;
  status: 'COMPLETED' | 'FAILED' | 'PENDING_APPROVAL';
  duration: number;
  error?: string;
}

type ToolHandler = (input: Record<string, unknown>) => Promise<unknown>;

export class ToolRegistry {
  private handlers: Map<string, ToolHandler> = new Map();

  constructor() {
    this.registerBuiltinHandlers();
  }

  private registerBuiltinHandlers() {
    this.registerHandler('builtin:read_file', async (input) => {
      if (!input.path) throw new Error('Path is required');
      return fileSystemExecutor.readFile(String(input.path));
    });

    this.registerHandler('builtin:write_file', async (input) => {
      if (!input.path || input.content === undefined)
        throw new Error('Path and content are required');
      return fileSystemExecutor.writeFile(String(input.path), String(input.content));
    });

    this.registerHandler('builtin:run_shell', async (input) => {
      if (!input.command) throw new Error('Command is required');
      // Ensure args is an array or construct one
      const args = Array.isArray(input.args)
        ? input.args.map(String)
        : input.args
          ? [String(input.args)]
          : [];

      return shellExecutor.execute({
        command: String(input.command),
        args: args,
      });
    });

    this.registerHandler('builtin:browser_navigate', async (input) => {
      if (!input.url) throw new Error('URL is required');
      return browserExecutor.navigate({ url: String(input.url) });
    });

    this.registerHandler('builtin:web_search', async (input) => {
      if (!input.query) throw new Error('Query is required');

      const query = String(input.query);
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

      await browserExecutor.navigate({ url: searchUrl });

      // Wait for results to load
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const result = await browserExecutor.evaluate(`(() => {
                const results = [];
                const elements = document.querySelectorAll('.result__body');
                elements.forEach(el => {
                    const titleEl = el.querySelector('.result__title .result__a');
                    const snippetEl = el.querySelector('.result__snippet');
                    if (titleEl && snippetEl) {
                        results.push({
                            title: titleEl.innerText,
                            link: titleEl.href,
                            snippet: snippetEl.innerText
                        });
                    }
                });
                return results.slice(0, 5);
            })()`);

      if (!result.success) {
        throw new Error(`Search failed: ${result.error}`);
      }

      return {
        query,
        results: JSON.parse(result.data as string),
      };
    });

    this.registerHandler('builtin:remember', async (input) => {
      // This would typically interface with memory service
      return { message: 'Memory stored', content: input.content };
    });

    this.registerHandler('builtin:recall', async (input) => {
      // This would typically interface with memory service
      return { message: 'Memory recall query', query: input.query };
    });

    this.registerHandler('builtin:generate_image', async (input) => {
      if (!input.prompt) throw new Error('Prompt is required');
      return imageGenerator.generate({
        prompt: String(input.prompt),
        model: input.model as any,
        size: input.size as any,
        quality: input.quality as any,
        style: input.style as any,
      });
    });

    this.registerHandler('builtin:ocr_image', async (input) => {
      if (!input.imageUrl) throw new Error('Image URL is required');
      return ocrTool.recognizeFromUrl(String(input.imageUrl), input.language as string);
    });

    this.registerHandler('builtin:analyze_image', async (input) => {
      if (!input.imageUrl) throw new Error('Image URL is required');
      return ocrTool.analyzeImage(String(input.imageUrl));
    });

    this.registerHandler('builtin:text_to_speech', async (input) => {
      if (!input.text) throw new Error('Text is required');
      return voiceTool.textToSpeech({
        text: String(input.text),
        voice: input.voice as string,
        model: input.model as any,
        speed: input.speed as number,
      });
    });

    this.registerHandler('builtin:speech_to_text', async (input) => {
      if (!input.audioUrl) throw new Error('Audio URL is required');
      return voiceTool.speechToText({
        audioUrl: String(input.audioUrl),
        language: input.language as string,
      });
    });

    this.registerHandler('builtin:get_weather', async (input) => {
      if (!input.location) throw new Error('Location is required');
      return weatherTool.getCurrentWeather({
        location: String(input.location),
        units: input.units as any,
      });
    });

    this.registerHandler('builtin:get_forecast', async (input) => {
      if (!input.location) throw new Error('Location is required');
      return weatherTool.getForecast(String(input.location), input.days as number);
    });

    this.registerHandler('builtin:get_news', async (input) => {
      return newsTool.getTopHeadlines({
        query: input.query as string,
        category: input.category as any,
        country: input.country as string,
        pageSize: input.pageSize as number,
      });
    });

    this.registerHandler('builtin:translate_text', async (input) => {
      if (!input.text || !input.targetLanguage)
        throw new Error('Text and target language are required');
      return translationTool.translate({
        text: String(input.text),
        targetLanguage: String(input.targetLanguage),
        sourceLanguage: input.sourceLanguage as string,
      });
    });

    this.registerHandler('builtin:detect_language', async (input) => {
      if (!input.text) throw new Error('Text is required');
      return translationTool.detectLanguage(String(input.text));
    });

    this.registerHandler('builtin:analyze_sentiment', async (input) => {
      if (!input.text) throw new Error('Text is required');
      return sentimentTool.analyze(String(input.text));
    });

    this.registerHandler('builtin:summarize_text', async (input) => {
      if (!input.text) throw new Error('Text is required');
      return summarizerTool.summarize({
        text: String(input.text),
        style: input.style as any,
      });
    });

    this.registerHandler('builtin:generate_qrcode', async (input) => {
      if (!input.data) throw new Error('Data is required');
      return qrCodeTool.generate({
        data: String(input.data),
        size: input.size as number,
        color: input.color as string,
      });
    });

    this.registerHandler('builtin:fetch_url', async (input) => {
      if (!input.url) throw new Error('URL is required');
      return urlFetcher.fetch(String(input.url));
    });

    this.registerHandler('builtin:read_rss', async (input) => {
      if (!input.url) throw new Error('RSS URL is required');
      return rssReader.readFeed(String(input.url));
    });

    this.registerHandler('builtin:get_youtube_transcript', async (input) => {
      if (!input.videoUrl) throw new Error('Video URL is required');
      return youtubeTool.getTranscript(String(input.videoUrl), input.language as string);
    });

    this.registerHandler('builtin:get_youtube_info', async (input) => {
      if (!input.videoUrl) throw new Error('Video URL is required');
      return youtubeTool.getVideoInfo(String(input.videoUrl));
    });

    this.registerHandler('builtin:search_youtube', async (input) => {
      if (!input.query) throw new Error('Query is required');
      return youtubeTool.searchVideos(String(input.query), input.maxResults as number);
    });

    this.registerHandler('builtin:analyze_data', async (input) => {
      if (!input.data || !Array.isArray(input.data)) throw new Error('Data array is required');
      return dataAnalysisTool.analyzeNumeric(input.data as number[]);
    });

    this.registerHandler('builtin:shorten_url', async (input) => {
      if (!input.url) throw new Error('URL is required');
      return urlShortener.shorten(String(input.url), input.service as string);
    });
  }

  async register(tool: ToolDefinition): Promise<void> {
    await db.tool.upsert({
      where: { name: tool.name },
      create: {
        name: tool.name,
        description: tool.description,
        schema: tool.schema as any,
        handler: tool.handler,
        category: tool.category,
        permissions: tool.permissions || [],
        isBuiltin: false,
        isEnabled: true,
      },
      update: {
        description: tool.description,
        schema: tool.schema as any,
        handler: tool.handler,
        category: tool.category,
        permissions: tool.permissions || [],
      },
    });
  }

  registerHandler(name: string, handler: ToolHandler): void {
    this.handlers.set(name, handler);
  }

  async execute(input: ToolExecutionInput): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    const tool = await db.tool.findUnique({
      where: { id: input.toolId },
    });

    if (!tool) {
      throw new Error(`Tool not found: ${input.toolId}`);
    }

    if (!tool.isEnabled) {
      throw new Error(`Tool is disabled: ${tool.name}`);
    }

    // --- SECURITY CHECK START ---
    if (tool.permissions && tool.permissions.length > 0) {
      // 1. Basic Dangerous Command Block
      if (tool.name === 'run_shell') {
        const cmd = input.input.command as string;
        const dangerous = ['rm', 'mkfs', 'dd', 'chmod', 'chown', 'sudo', 'su'];
        if (dangerous.includes(cmd)) {
          // In a real system, we would trigger an "Approval Request" here
          throw new Error(`Security Alert: Command '${cmd}' is blocked by default safety policy.`);
        }
      }

      // 2. Future RBAC Extension Point
      if (input.userId) {
        // await checkUserPermissions(input.userId, tool.permissions);
      }
    }
    // --- SECURITY CHECK END ---

    const handler = this.handlers.get(tool.handler) || this.handlers.get(tool.name);

    if (!handler) {
      // Attempt to find by name if handler string didn't match
      const fallback = this.handlers.get(tool.name);
      if (!fallback) {
        throw new Error(`No handler registered for tool: ${tool.name} (handler: ${tool.handler})`);
      }
    }

    const finalHandler = handler || this.handlers.get(tool.name)!;

    const execution = await db.toolExecution.create({
      data: {
        toolId: tool.id,
        input: input.input as any,
        status: 'RUNNING',
      },
    });

    try {
      const output = await finalHandler(input.input);
      const duration = Date.now() - startTime;

      await db.toolExecution.update({
        where: { id: execution.id },
        data: {
          output: output as any,
          status: 'COMPLETED',
          duration,
        },
      });

      return {
        id: execution.id,
        output,
        status: 'COMPLETED',
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      await db.toolExecution.update({
        where: { id: execution.id },
        data: {
          status: 'FAILED',
          error: errorMessage,
          duration,
        },
      });

      return {
        id: execution.id,
        output: null,
        status: 'FAILED',
        duration,
        error: errorMessage,
      };
    }
  }

  async list(category?: string) {
    return db.tool.findMany({
      where: { category },
      orderBy: { name: 'asc' },
    });
  }

  async getEnabled() {
    return db.tool.findMany({
      where: { isEnabled: true },
      orderBy: { name: 'asc' },
    });
  }

  async enable(name: string): Promise<void> {
    await db.tool.update({
      where: { name },
      data: { isEnabled: true },
    });
  }

  async disable(name: string): Promise<void> {
    await db.tool.update({
      where: { name },
      data: { isEnabled: false },
    });
  }

  async getExecutionHistory(toolId: string, limit: number = 20) {
    return db.toolExecution.findMany({
      where: { toolId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async seedBuiltinTools(): Promise<void> {
    const builtinTools: ToolDefinition[] = [
      {
        name: 'web_search',
        description: 'Search the web for information',
        schema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            limit: { type: 'number', description: 'Maximum results', default: 5 },
          },
          required: ['query'],
        },
        handler: 'builtin:web_search',
        category: 'search',
      },
      {
        name: 'read_file',
        description: 'Read contents of a file',
        schema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path to read' },
          },
          required: ['path'],
        },
        handler: 'builtin:read_file',
        category: 'filesystem',
        permissions: ['filesystem'],
      },
      {
        name: 'write_file',
        description: 'Write content to a file',
        schema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path to write' },
            content: { type: 'string', description: 'Content to write' },
          },
          required: ['path', 'content'],
        },
        handler: 'builtin:write_file',
        category: 'filesystem',
        permissions: ['filesystem'],
      },
      {
        name: 'run_shell',
        description: 'Execute a shell command',
        schema: {
          type: 'object',
          properties: {
            command: { type: 'string', description: 'Command to execute' },
            args: { type: 'array', items: { type: 'string' }, description: 'Command arguments' },
          },
          required: ['command'],
        },
        handler: 'builtin:run_shell',
        category: 'execution',
        permissions: ['execute'],
      },
      {
        name: 'browser_navigate',
        description: 'Navigate to a URL in the browser',
        schema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'URL to navigate to' },
          },
          required: ['url'],
        },
        handler: 'builtin:browser_navigate',
        category: 'browser',
        permissions: ['browser'],
      },
      {
        name: 'remember',
        description: 'Store information in long-term memory',
        schema: {
          type: 'object',
          properties: {
            content: { type: 'string', description: 'Information to remember' },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Tags for categorization',
            },
          },
          required: ['content'],
        },
        handler: 'builtin:remember',
        category: 'memory',
      },
      {
        name: 'recall',
        description: 'Search and retrieve information from memory',
        schema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            limit: { type: 'number', description: 'Maximum results', default: 5 },
          },
          required: ['query'],
        },
        handler: 'builtin:recall',
        category: 'memory',
      },
      {
        name: 'generate_image',
        description: 'Generate images using AI (DALL-E or Stable Diffusion)',
        schema: {
          type: 'object',
          properties: {
            prompt: { type: 'string', description: 'Image generation prompt' },
            model: {
              type: 'string',
              enum: ['dall-e-2', 'dall-e-3', 'stable-diffusion'],
              description: 'AI model to use',
            },
            size: {
              type: 'string',
              enum: ['256x256', '512x512', '1024x1024', '1792x1024', '1024x1792'],
              description: 'Image size',
            },
            quality: { type: 'string', enum: ['standard', 'hd'], description: 'Image quality' },
            style: { type: 'string', enum: ['vivid', 'natural'], description: 'Style' },
          },
          required: ['prompt'],
        },
        handler: 'builtin:generate_image',
        category: 'ai',
      },
      {
        name: 'ocr_image',
        description: 'Extract text from images using OCR',
        schema: {
          type: 'object',
          properties: {
            imageUrl: { type: 'string', description: 'URL of the image' },
            language: { type: 'string', description: 'Language code (e.g., en, es, fr)' },
          },
          required: ['imageUrl'],
        },
        handler: 'builtin:ocr_image',
        category: 'ai',
      },
      {
        name: 'analyze_image',
        description: 'Analyze image content (labels, text, faces)',
        schema: {
          type: 'object',
          properties: {
            imageUrl: { type: 'string', description: 'URL of the image to analyze' },
          },
          required: ['imageUrl'],
        },
        handler: 'builtin:analyze_image',
        category: 'ai',
      },
      {
        name: 'text_to_speech',
        description: 'Convert text to speech',
        schema: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Text to convert to speech' },
            voice: {
              type: 'string',
              description: 'Voice to use (alloy, echo, fable, onyx, nova, shimmer)',
            },
            model: { type: 'string', enum: ['tts-1', 'tts-1-hd'], description: 'TTS model' },
            speed: { type: 'number', description: 'Speech speed (0.25-4.0)', default: 1.0 },
          },
          required: ['text'],
        },
        handler: 'builtin:text_to_speech',
        category: 'voice',
      },
      {
        name: 'speech_to_text',
        description: 'Convert speech to text',
        schema: {
          type: 'object',
          properties: {
            audioUrl: { type: 'string', description: 'URL of the audio file' },
            language: { type: 'string', description: 'Language code' },
          },
        },
        handler: 'builtin:speech_to_text',
        category: 'voice',
      },
      {
        name: 'get_weather',
        description: 'Get current weather or forecast for a location',
        schema: {
          type: 'object',
          properties: {
            location: { type: 'string', description: 'City name or location' },
            units: {
              type: 'string',
              enum: ['metric', 'imperial'],
              description: 'Temperature units',
              default: 'metric',
            },
          },
          required: ['location'],
        },
        handler: 'builtin:get_weather',
        category: 'information',
      },
      {
        name: 'get_forecast',
        description: 'Get weather forecast for multiple days',
        schema: {
          type: 'object',
          properties: {
            location: { type: 'string', description: 'City name or location' },
            days: { type: 'number', description: 'Number of days (1-5)', default: 5 },
          },
          required: ['location'],
        },
        handler: 'builtin:get_forecast',
        category: 'information',
      },
      {
        name: 'get_news',
        description: 'Get latest news headlines',
        schema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            category: {
              type: 'string',
              enum: [
                'general',
                'business',
                'entertainment',
                'health',
                'science',
                'sports',
                'technology',
              ],
            },
            country: { type: 'string', description: 'Country code (us, gb, etc.)', default: 'us' },
            pageSize: { type: 'number', description: 'Number of results', default: 20 },
          },
        },
        handler: 'builtin:get_news',
        category: 'information',
      },
      {
        name: 'translate_text',
        description: 'Translate text between languages',
        schema: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Text to translate' },
            targetLanguage: {
              type: 'string',
              description: 'Target language code (e.g., en, es, fr, de)',
            },
            sourceLanguage: {
              type: 'string',
              description: 'Source language code (auto-detect if not specified)',
            },
          },
          required: ['text', 'targetLanguage'],
        },
        handler: 'builtin:translate_text',
        category: 'ai',
      },
      {
        name: 'detect_language',
        description: 'Detect the language of text',
        schema: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Text to analyze' },
          },
          required: ['text'],
        },
        handler: 'builtin:detect_language',
        category: 'ai',
      },
      {
        name: 'analyze_sentiment',
        description: 'Analyze sentiment of text',
        schema: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Text to analyze' },
          },
          required: ['text'],
        },
        handler: 'builtin:analyze_sentiment',
        category: 'ai',
      },
      {
        name: 'summarize_text',
        description: 'Summarize long text content',
        schema: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Text to summarize' },
            style: {
              type: 'string',
              enum: ['brief', 'detailed', 'bullets'],
              description: 'Summary style',
            },
          },
          required: ['text'],
        },
        handler: 'builtin:summarize_text',
        category: 'ai',
      },
      {
        name: 'generate_qrcode',
        description: 'Generate QR codes',
        schema: {
          type: 'object',
          properties: {
            data: { type: 'string', description: 'Data to encode in QR code' },
            size: { type: 'number', description: 'QR code size in pixels', default: 300 },
            color: { type: 'string', description: 'QR code color (hex)', default: '000000' },
          },
          required: ['data'],
        },
        handler: 'builtin:generate_qrcode',
        category: 'utility',
      },
      {
        name: 'fetch_url',
        description: 'Fetch and extract metadata from URLs',
        schema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'URL to fetch' },
          },
          required: ['url'],
        },
        handler: 'builtin:fetch_url',
        category: 'utility',
      },
      {
        name: 'read_rss',
        description: 'Read RSS/Atom feeds',
        schema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'RSS feed URL' },
          },
          required: ['url'],
        },
        handler: 'builtin:read_rss',
        category: 'information',
      },
      {
        name: 'get_youtube_transcript',
        description: 'Get transcript from YouTube videos',
        schema: {
          type: 'object',
          properties: {
            videoUrl: { type: 'string', description: 'YouTube video URL' },
            language: { type: 'string', description: 'Preferred language' },
          },
          required: ['videoUrl'],
        },
        handler: 'builtin:get_youtube_transcript',
        category: 'media',
      },
      {
        name: 'get_youtube_info',
        description: 'Get YouTube video information',
        schema: {
          type: 'object',
          properties: {
            videoUrl: { type: 'string', description: 'YouTube video URL' },
          },
          required: ['videoUrl'],
        },
        handler: 'builtin:get_youtube_info',
        category: 'media',
      },
      {
        name: 'search_youtube',
        description: 'Search for YouTube videos',
        schema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            maxResults: { type: 'number', description: 'Maximum results', default: 10 },
          },
          required: ['query'],
        },
        handler: 'builtin:search_youtube',
        category: 'media',
      },
      {
        name: 'analyze_data',
        description: 'Analyze numeric data and return statistics',
        schema: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: { type: 'number' },
              description: 'Array of numbers to analyze',
            },
          },
          required: ['data'],
        },
        handler: 'builtin:analyze_data',
        category: 'data',
      },
      {
        name: 'shorten_url',
        description: 'Shorten long URLs',
        schema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'URL to shorten' },
            service: { type: 'string', description: 'Preferred service (tinyurl, isgd, bitly)' },
          },
          required: ['url'],
        },
        handler: 'builtin:shorten_url',
        category: 'utility',
      },
    ];

    for (const tool of builtinTools) {
      await db.tool.upsert({
        where: { name: tool.name },
        create: {
          name: tool.name,
          description: tool.description,
          schema: tool.schema as any,
          handler: tool.handler,
          category: tool.category,
          permissions: tool.permissions || [],
          isBuiltin: true,
          isEnabled: true,
        },
        update: {
          description: tool.description,
          schema: tool.schema as any,
          handler: tool.handler,
          category: tool.category,
          permissions: tool.permissions || [],
        },
      });
    }
  }
}

export const toolRegistry = new ToolRegistry();
