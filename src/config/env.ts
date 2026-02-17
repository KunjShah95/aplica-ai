import { z, ZodError } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  LLM_PROVIDER: z.enum(['claude', 'openai', 'ollama']).default('claude'),
  LLM_API_KEY: z.string().optional(),
  LLM_MODEL: z.string().default('claude-sonnet-4-20250514'),
  LLM_MAX_TOKENS: z.coerce.number().min(1).max(128000).default(4096),
  LLM_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.7),

  OPENAI_API_KEY: z.string().optional(),
  EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  EMBEDDING_PROVIDER: z.enum(['openai', 'ollama']).default('openai'),

  OLLAMA_BASE_URL: z.string().default('http://localhost:11434'),
  OLLAMA_EMBEDDING_MODEL: z.string().default('nomic-embed-text'),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  TELEGRAM_ENABLED: z.coerce.boolean().default(false),
  TELEGRAM_TOKEN: z.string().optional(),

  DISCORD_ENABLED: z.coerce.boolean().default(false),
  DISCORD_TOKEN: z.string().optional(),
  DISCORD_GUILD_ID: z.string().optional(),

  WS_ENABLED: z.coerce.boolean().default(true),
  WS_PORT: z.coerce.number().min(1024).max(65535).default(3001),

  SLACK_ENABLED: z.coerce.boolean().default(false),
  SLACK_BOT_TOKEN: z.string().optional(),
  SLACK_SIGNING_SECRET: z.string().optional(),
  SLACK_APP_TOKEN: z.string().optional(),

  API_PORT: z.coerce.number().min(1024).max(65535).default(3000),
  API_HOST: z.string().default('localhost'),
  API_BASE_URL: z.string().url().optional(),

  OPENAI_API_ENABLED: z.coerce.boolean().default(true),
  OPENAI_API_PORT: z.coerce.number().min(1024).max(65535).default(3002),

  MEMORY_TYPE: z.enum(['jsonl', 'sqlite', 'postgres']).default('postgres'),
  MEMORY_PATH: z.string().default('./memory'),
  MEMORY_MAX_ENTRIES: z.coerce.number().min(1).default(10000),
  MEMORY_SEARCH: z.coerce.boolean().default(true),
  MEMORY_DECAY_ENABLED: z.coerce.boolean().default(true),
  MEMORY_DECAY_RATE: z.coerce.number().min(0).max(1).default(0.01),

  REDIS_URL: z.string().optional(),

  SANDBOX_ENABLED: z.coerce.boolean().default(false),
  ALLOWED_COMMANDS: z.string().default('ls,cat,grep,echo,date,pwd,whoami'),
  BLOCKED_COMMANDS: z.string().default('rm,del,format,mkfs,dd'),
  MAX_FILE_SIZE: z.coerce.number().min(1024).max(104857600).default(10485760),

  RATE_LIMIT_WINDOW: z.coerce.number().min(1000).default(60000),
  RATE_LIMIT_MAX: z.coerce.number().min(1).default(100),
  AUTH_RATE_LIMIT_WINDOW: z.coerce.number().min(1000).default(900000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().min(1).default(5),

  ENCRYPTION_KEY: z.string().optional(),

  PLAYWRIGHT_BROWSER: z.enum(['chromium', 'firefox', 'webkit']).default('chromium'),
  PLAYWRIGHT_HEADLESS: z.coerce.boolean().default(true),

  GOOGLE_CALENDAR_ENABLED: z.coerce.boolean().default(false),
  GOOGLE_CALENDAR_CREDENTIALS: z.string().optional(),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().min(1).max(65535).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),

  RESEND_API_KEY: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),

  VOICE_ENABLED: z.coerce.boolean().default(true),
  TTS_VOICE: z.string().default('alloy'),
  TTS_MODEL: z.string().default('tts-1'),

  WEBHOOK_SECRET: z.string().optional(),
  WEBHOOK_TIMEOUT: z.coerce.number().min(1000).max(60000).default(30000),

  SCHEDULER_ENABLED: z.coerce.boolean().default(true),
  SCHEDULER_POLL_INTERVAL: z.coerce.number().min(1000).default(10000),

  PLUGINS_DIR: z.string().default('./plugins'),
  PLUGINS_ENABLED: z.coerce.boolean().default(true),

  ANALYTICS_ENABLED: z.coerce.boolean().default(true),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  METRICS_ENABLED: z.coerce.boolean().default(true),
  METRICS_PORT: z.coerce.number().min(1024).max(65535).default(9090),

  SENTRY_DSN: z.string().url().optional(),

  STORAGE_PROVIDER: z.enum(['local', 's3']).default('local'),
  UPLOAD_PATH: z.string().default('./uploads'),
  MAX_UPLOAD_SIZE: z.coerce.number().min(1024).max(104857600).default(52428800),

  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().default('us-east-1'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),

  DEBUG: z.coerce.boolean().default(false),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues
      .map((issue: ZodError['issues'][number]) => `${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    throw new Error(`Environment validation failed:\n${errors}`);
  }

  return result.data;
}

export function getRequiredEnvVars(): string[] {
  return ['DATABASE_URL'];
}

export function getOptionalEnvVars(): string[] {
  return [
    'LLM_API_KEY',
    'OPENAI_API_KEY',
    'TELEGRAM_TOKEN',
    'DISCORD_TOKEN',
    'SLACK_BOT_TOKEN',
    'JWT_SECRET',
    'ENCRYPTION_KEY',
  ];
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

export function isTest(): boolean {
  return process.env.NODE_ENV === 'test';
}
