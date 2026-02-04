import { EventEmitter } from 'events';
import { Tracer } from './tracer.js';

export interface LoggerConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  format: 'json' | 'text' | 'pretty';
  output: 'console' | 'file' | 'both';
  filePath?: string;
  maxFileSize: number;
  maxFiles: number;
  includeTimestamp: boolean;
  includeLevel: boolean;
  includeContext: boolean;
  redactSensitive: boolean;
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  spanId?: string;
  traceId?: string;
  error?: LogError;
}

export enum LogLevel {
  DEBUG = 10,
  INFO = 20,
  WARN = 30,
  ERROR = 40,
  FATAL = 50,
}

export interface LogError {
  name: string;
  message: string;
  stack?: string;
  code?: string;
}

export class Logger extends EventEmitter {
  private config: LoggerConfig;
  private tracer: Tracer;
  private logBuffer: LogEntry[];
  private fileStream: any;
  private currentFileSize: number;

  constructor(config: Partial<LoggerConfig> = {}) {
    super();
    this.config = {
      level: config.level || 'info',
      format: config.format || 'json',
      output: config.output || 'console',
      filePath: config.filePath || './logs/app.log',
      maxFileSize: config.maxFileSize || 10485760,
      maxFiles: config.maxFiles || 5,
      includeTimestamp: config.includeTimestamp ?? true,
      includeLevel: config.includeLevel ?? true,
      includeContext: config.includeContext ?? true,
      redactSensitive: config.redactSensitive ?? true,
    };

    this.tracer = new Tracer('logger');
    this.logBuffer = [];
    this.currentFileSize = 0;

    if (this.config.output === 'file' || this.config.output === 'both') {
      this.initializeFileLogging();
    }
  }

  private initializeFileLogging(): void {
    const fs = require('fs');
    const path = require('path');

    const logDir = path.dirname(this.config.filePath!);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    if (fs.existsSync(this.config.filePath!)) {
      this.currentFileSize = fs.statSync(this.config.filePath!).size;
    }
  }

  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, error?: Error, context?: Record<string, any>): void {
    const logError: LogError | undefined = error
      ? {
          name: error.constructor.name,
          message: error.message,
          stack: error.stack,
          code: (error as any).code,
        }
      : undefined;

    this.log(LogLevel.ERROR, message, context, logError);
  }

  fatal(message: string, error?: Error, context?: Record<string, any>): void {
    const logError: LogError | undefined = error
      ? {
          name: error.constructor.name,
          message: error.message,
          stack: error.stack,
          code: (error as any).code,
        }
      : undefined;

    this.log(LogLevel.FATAL, message, context, logError);
  }

  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    error?: LogError
  ): void {
    if (level < this.config.level) {
      return;
    }

    const activeSpan = this.tracer.getActiveSpans().pop();
    const enrichedContext = this.enrichContext(context);

    const entry: LogEntry = {
      timestamp: new Date(),
      level: this.getLevelName(level),
      message: this.redactSensitiveData(message),
      context: enrichedContext,
      spanId: activeSpan?.id,
      traceId: activeSpan?.traceId,
      error,
    };

    this.logBuffer.push(entry);

    if (this.logBuffer.length >= 100) {
      this.flush();
    }

    this.emit('log', entry);
    this.output(entry);
  }

  private enrichContext(context?: Record<string, any>): Record<string, any> | undefined {
    if (!context && !this.config.includeContext) {
      return undefined;
    }

    const enriched = { ...(context || {}) };

    if (this.config.includeContext) {
      enriched.service = 'sentinel';
      enriched.host = require('os').hostname();
      enriched.pid = process.pid;
    }

    return enriched;
  }

  private redactSensitiveData(data: string): string {
    if (!this.config.redactSensitive) {
      return data;
    }

    const patterns = [
      { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '[EMAIL]' },
      { pattern: /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g, replacement: '[SSN]' },
      { pattern: /\b\d{16}\b/g, replacement: '[CREDIT_CARD]' },
      { pattern: /\b(AKIA|ABIA|ACCA|ASIA)[0-9A-Z]{16}\b/g, replacement: '[AWS_KEY]' },
      { pattern: /Bearer\s+[a-zA-Z0-9\-\._~+\/]+=*/gi, replacement: 'Bearer [TOKEN]' },
      {
        pattern: /password["']?\s*[:=]\s*["']?([^"'\s,}]+)["']?/gi,
        replacement: 'password: [PASSWORD]',
      },
      {
        pattern: /api[_-]?key["']?\s*[:=]\s*["']?([^"'\s,}]+)["']?/gi,
        replacement: 'api_key: [API_KEY]',
      },
    ];

    let redacted = data;
    for (const { pattern, replacement } of patterns) {
      redacted = redacted.replace(pattern, replacement);
    }

    return redacted;
  }

  private getLevelName(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return 'DEBUG';
      case LogLevel.INFO:
        return 'INFO';
      case LogLevel.WARN:
        return 'WARN';
      case LogLevel.ERROR:
        return 'ERROR';
      case LogLevel.FATAL:
        return 'FATAL';
      default:
        return 'UNKNOWN';
    }
  }

  private output(entry: LogEntry): void {
    const formatted = this.formatEntry(entry);

    if (this.config.output === 'console' || this.config.output === 'both') {
      if (entry.level === 'ERROR' || entry.level === 'FATAL') {
        console.error(formatted);
      } else {
        console.log(formatted);
      }
    }

    if (this.config.output === 'file' || this.config.output === 'both') {
      this.writeToFile(formatted);
    }
  }

  private formatEntry(entry: LogEntry): string {
    switch (this.config.format) {
      case 'json':
        return JSON.stringify(this.toJSON(entry));
      case 'pretty':
        return this.formatPretty(entry);
      case 'text':
      default:
        return this.formatText(entry);
    }
  }

  private toJSON(entry: LogEntry): Record<string, any> {
    const obj: Record<string, any> = {
      '@timestamp': entry.timestamp.toISOString(),
      'level': entry.level,
      'message': entry.message,
    };

    if (entry.context) {
      obj.context = entry.context;
    }

    if (entry.spanId) {
      obj.spanId = entry.spanId;
    }

    if (entry.traceId) {
      obj.traceId = entry.traceId;
    }

    if (entry.error) {
      obj.error = {
        name: entry.error.name,
        message: entry.error.message,
        stack: entry.error.stack,
        code: entry.error.code,
      };
    }

    return obj;
  }

  private formatText(entry: LogEntry): string {
    const parts: string[] = [];

    if (this.config.includeTimestamp) {
      parts.push(entry.timestamp.toISOString());
    }

    if (this.config.includeLevel) {
      parts.push(`[${entry.level}]`);
    }

    parts.push(entry.message);

    if (entry.context && Object.keys(entry.context).length > 0) {
      const contextStr = JSON.stringify(entry.context);
      parts.push(contextStr);
    }

    if (entry.spanId) {
      parts.push(`spanId=${entry.spanId}`);
    }

    if (entry.traceId) {
      parts.push(`traceId=${entry.traceId}`);
    }

    return parts.join(' ');
  }

  private formatPretty(entry: LogEntry): string {
    const colors = {
      DEBUG: '\x1b[36m',
      INFO: '\x1b[32m',
      WARN: '\x1b[33m',
      ERROR: '\x1b[31m',
      FATAL: '\x1b[35m',
      RESET: '\x1b[0m',
    };

    const color = colors[entry.level as keyof typeof colors] || colors.RESET;

    let formatted = '';

    if (this.config.includeTimestamp) {
      formatted += `\x1b[90m${entry.timestamp.toISOString()}\x1b[0m `;
    }

    formatted += `${color}[${entry.level}]\x1b[0m ${entry.message}`;

    if (entry.context && Object.keys(entry.context).length > 0) {
      formatted += ` \x1b[90m${JSON.stringify(entry.context, null, 2)}\x1b[0m`;
    }

    if (entry.error) {
      formatted += `\n\x1b[31m${entry.error.name}: ${entry.error.message}\x1b[0m`;
      if (entry.error.stack) {
        formatted += `\n\x1b[90m${entry.error.stack}\x1b[0m`;
      }
    }

    return formatted;
  }

  private writeToFile(formatted: string): void {
    const fs = require('fs');

    if (this.currentFileSize >= this.config.maxFileSize) {
      this.rotateFiles();
    }

    try {
      fs.appendFileSync(this.config.filePath!, formatted + '\n');
      this.currentFileSize += Buffer.byteLength(formatted + '\n');
    } catch (error) {
      console.error('Failed to write log to file:', error);
    }
  }

  private rotateFiles(): void {
    const fs = require('fs');
    const path = require('path');

    for (let i = this.config.maxFiles - 1; i >= 1; i--) {
      const oldPath = this.config.filePath! + `.${i}`;
      const newPath = this.config.filePath! + `.${i + 1}`;

      if (fs.existsSync(oldPath)) {
        fs.renameSync(oldPath, newPath);
      }
    }

    if (fs.existsSync(this.config.filePath!)) {
      fs.renameSync(this.config.filePath!, this.config.filePath! + '.1');
    }

    this.currentFileSize = 0;
  }

  flush(): void {
    if (this.logBuffer.length === 0) return;

    const entries = [...this.logBuffer];
    this.logBuffer = [];

    for (const entry of entries) {
      this.output(entry);
    }

    this.emit('flush', entries.length);
  }

  async flushAsync(): Promise<void> {
    return new Promise((resolve) => {
      const checkFlush = () => {
        if (this.logBuffer.length === 0) {
          resolve();
        } else {
          setTimeout(checkFlush, 10);
        }
      };
      checkFlush();
    });
  }

  createChild(context: Record<string, any>): Logger {
    const child = new Logger({
      ...this.config,
    });

    child.on('log', (entry: LogEntry) => {
      entry.context = { ...entry.context, ...context };
      this.emit('log', entry);
    });

    return child;
  }

  async close(): Promise<void> {
    await this.flushAsync();
    this.emit('close');
  }
}

export { Logger, LogLevel, LogEntry };
