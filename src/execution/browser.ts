import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { randomUUID } from 'crypto';

export interface BrowserOptions {
  headless?: boolean;
  viewport?: { width: number; height: number };
  userAgent?: string;
  timeout?: number;
  allowNoSandbox?: boolean;
  allowedProtocols?: string[];
}

export interface BrowserResult {
  id: string;
  success: boolean;
  operation: string;
  data?: string;
  error?: string;
  screenshot?: string;
  timestamp: Date;
}

export interface NavigationOptions {
  url: string;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit';
  timeout?: number;
}

export interface ScreenshotOptions {
  fullPage?: boolean;
  clip?: { x: number; y: number; width: number; height: number };
  quality?: number;
  format?: 'png' | 'jpeg' | 'webp';
}

export class BrowserExecutor {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private options: BrowserOptions;
  private isInitialized: boolean = false;

  constructor(options: BrowserOptions = {}) {
    const envAllowedProtocols = process.env.BROWSER_ALLOWED_PROTOCOLS;
    this.options = {
      headless: options.headless ?? true,
      viewport: options.viewport ?? { width: 1280, height: 720 },
      userAgent:
        options.userAgent ?? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      timeout: options.timeout ?? 30000,
      allowNoSandbox:
        options.allowNoSandbox ?? (process.env.BROWSER_ALLOW_NO_SANDBOX === 'true'),
      allowedProtocols:
        options.allowedProtocols ??
        (envAllowedProtocols
          ? envAllowedProtocols.split(',').map((p) => p.trim()).filter(Boolean)
          : ['http', 'https']),
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const allowNoSandbox = this.options.allowNoSandbox ?? false;

      this.browser = await chromium.launch({
        headless: this.options.headless,
        args: allowNoSandbox ? ['--no-sandbox', '--disable-setuid-sandbox'] : [],
      });

      this.context = await this.browser.newContext({
        viewport: this.options.viewport,
        userAgent: this.options.userAgent,
      });

      this.page = await this.context.newPage();
      this.isInitialized = true;
      console.log('Browser initialized');
    } catch (error) {
      throw new Error(
        `Failed to initialize browser: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async navigate(options: NavigationOptions): Promise<BrowserResult> {
    await this.ensureInitialized();

    const id = randomUUID();
    try {
      if (!this.isUrlAllowed(options.url)) {
        return {
          id,
          success: false,
          operation: 'navigate',
          error: `Blocked URL protocol (allowed: ${(this.options.allowedProtocols || ['http', 'https']).join(', ')})`,
          timestamp: new Date(),
        };
      }

      await this.page!.goto(options.url, {
        waitUntil: options.waitUntil ?? 'domcontentloaded',
        timeout: options.timeout ?? this.options.timeout,
      });

      return {
        id,
        success: true,
        operation: 'navigate',
        data: JSON.stringify({ url: options.url, title: await this.page!.title() }),
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        id,
        success: false,
        operation: 'navigate',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  async click(selector: string, options?: { timeout?: number }): Promise<BrowserResult> {
    await this.ensureInitialized();

    const id = randomUUID();
    try {
      await this.page!.click(selector, {
        timeout: options?.timeout ?? this.options.timeout,
      });

      return {
        id,
        success: true,
        operation: 'click',
        data: selector,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        id,
        success: false,
        operation: 'click',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  async fill(
    selector: string,
    value: string,
    options?: { timeout?: number }
  ): Promise<BrowserResult> {
    await this.ensureInitialized();

    const id = randomUUID();
    try {
      await this.page!.fill(selector, value, {
        timeout: options?.timeout ?? this.options.timeout,
      });

      return {
        id,
        success: true,
        operation: 'fill',
        data: JSON.stringify({ selector, value }),
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        id,
        success: false,
        operation: 'fill',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  async type(
    selector: string,
    text: string,
    options?: { timeout?: number; delay?: number }
  ): Promise<BrowserResult> {
    await this.ensureInitialized();

    const id = randomUUID();
    try {
      await this.page!.type(selector, text, {
        timeout: options?.timeout ?? this.options.timeout,
        delay: options?.delay ?? 0,
      });

      return {
        id,
        success: true,
        operation: 'type',
        data: JSON.stringify({ selector, text }),
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        id,
        success: false,
        operation: 'type',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  async getText(selector: string, options?: { timeout?: number }): Promise<BrowserResult> {
    await this.ensureInitialized();

    const id = randomUUID();
    try {
      const element = await this.page!.locator(selector);
      const text = await element.textContent({
        timeout: options?.timeout ?? this.options.timeout,
      });

      return {
        id,
        success: true,
        operation: 'getText',
        data: text ?? '',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        id,
        success: false,
        operation: 'getText',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  async getAttribute(
    selector: string,
    attribute: string,
    options?: { timeout?: number }
  ): Promise<BrowserResult> {
    await this.ensureInitialized();

    const id = randomUUID();
    try {
      const value = await this.page!.getAttribute(selector, attribute, {
        timeout: options?.timeout ?? this.options.timeout,
      });

      return {
        id,
        success: true,
        operation: 'getAttribute',
        data: JSON.stringify({ attribute, value }),
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        id,
        success: false,
        operation: 'getAttribute',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  async screenshot(options?: ScreenshotOptions): Promise<BrowserResult> {
    await this.ensureInitialized();

    const id = randomUUID();
    try {
      const screenshotBuffer = await this.page!.screenshot({
        fullPage: options?.fullPage ?? false,
        clip: options?.clip,
        quality: options?.quality,
        type: (options?.format ?? 'png') as 'png' | 'jpeg',
      });

      return {
        id,
        success: true,
        operation: 'screenshot',
        screenshot: screenshotBuffer.toString('base64'),
        data: JSON.stringify({ size: screenshotBuffer.length }),
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        id,
        success: false,
        operation: 'screenshot',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  async evaluate(script: string): Promise<BrowserResult> {
    await this.ensureInitialized();

    const id = randomUUID();
    try {
      const result = await this.page!.evaluate(script);

      return {
        id,
        success: true,
        operation: 'evaluate',
        data: JSON.stringify(result),
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        id,
        success: false,
        operation: 'evaluate',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  async waitForSelector(
    selector: string,
    options?: { timeout?: number; state?: 'attached' | 'detached' | 'visible' | 'hidden' }
  ): Promise<BrowserResult> {
    await this.ensureInitialized();

    const id = randomUUID();
    try {
      await this.page!.waitForSelector(selector, {
        timeout: options?.timeout ?? this.options.timeout,
        state: options?.state ?? 'visible',
      });

      return {
        id,
        success: true,
        operation: 'waitForSelector',
        data: selector,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        id,
        success: false,
        operation: 'waitForSelector',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  async waitForTimeout(milliseconds: number): Promise<BrowserResult> {
    await this.ensureInitialized();

    const id = randomUUID();
    await this.page!.waitForTimeout(milliseconds);

    return {
      id,
      success: true,
      operation: 'waitForTimeout',
      data: String(milliseconds),
      timestamp: new Date(),
    };
  }

  async scrollTo(selector: string): Promise<BrowserResult> {
    await this.ensureInitialized();

    const id = randomUUID();
    try {
      await this.page!.locator(selector).scrollIntoViewIfNeeded();
      return {
        id,
        success: true,
        operation: 'scrollTo',
        data: selector,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        id,
        success: false,
        operation: 'scrollTo',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  async getPageContent(): Promise<BrowserResult> {
    await this.ensureInitialized();

    const id = randomUUID();
    try {
      const content = await this.page!.content();
      return {
        id,
        success: true,
        operation: 'getPageContent',
        data: content,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        id,
        success: false,
        operation: 'getPageContent',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  async getTitle(): Promise<BrowserResult> {
    await this.ensureInitialized();

    const id = randomUUID();
    try {
      const title = await this.page!.title();
      return {
        id,
        success: true,
        operation: 'getTitle',
        data: title,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        id,
        success: false,
        operation: 'getTitle',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
      this.isInitialized = false;
      console.log('Browser closed');
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  async getCurrentUrl(): Promise<string> {
    await this.ensureInitialized();
    return this.page!.url();
  }

  private isUrlAllowed(rawUrl: string): boolean {
    try {
      const parsed = new URL(rawUrl);
      const protocol = parsed.protocol.replace(':', '').toLowerCase();
      const allowed = this.options.allowedProtocols || ['http', 'https'];
      return allowed.includes(protocol);
    } catch {
      return false;
    }
  }
}

export const browserExecutor = new BrowserExecutor();
