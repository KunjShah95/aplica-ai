import { chromium, firefox, webkit, Browser, Page, BrowserContext } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

export interface BrowserConfig {
  type?: 'chromium' | 'firefox' | 'webkit';
  headless?: boolean;
  userDataDir?: string;
  viewport?: { width: number; height: number };
  userAgent?: string;
  proxy?: {
    server: string;
    bypass?: string;
    username?: string;
    password?: string;
  };
  timeout?: number;
}

export interface NavigateOptions {
  url: string;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit';
  timeout?: number;
  referer?: string;
}

export interface ScreenshotOptions {
  path?: string;
  fullPage?: boolean;
  clip?: { x: number; y: number; width: number; height: number };
  omitBackground?: boolean;
  quality?: number;
  type?: 'png' | 'jpeg' | 'webp';
}

export interface ElementSelector {
  selector: string;
  index?: number;
}

export interface FillOptions {
  selector: string;
  value: string;
  timeout?: number;
}

export interface ClickOptions {
  selector: string;
  button?: 'left' | 'middle' | 'right';
  clickCount?: number;
  modifiers?: ('Alt' | 'Control' | 'Meta' | 'Shift')[];
  delay?: number;
  timeout?: number;
  force?: boolean;
}

export interface ScrollOptions {
  selector?: string;
  x?: number;
  y?: number;
  behavior?: 'auto' | 'smooth';
}

export interface WaitForOptions {
  selector?: string;
  state?: 'attached' | 'detached' | 'visible' | 'hidden';
  timeout?: number;
}

export interface ExecuteScriptOptions {
  selector?: string;
  script: string;
  args?: any[];
}

export interface FormData {
  [selector: string]: string | boolean | string[];
}

export interface Cookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

export interface NetworkRequest {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  postData?: string;
  responseStatus?: number;
  responseHeaders?: Record<string, string>;
}

export interface BrowserResult {
  success: boolean;
  url?: string;
  title?: string;
  content?: string;
  screenshotPath?: string;
  error?: string;
}

export class BrowserTool {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private config: BrowserConfig;
  private defaultTimeout = 30000;
  private screenshotDir: string;

  constructor(config?: BrowserConfig) {
    this.config = {
      type: config?.type || 'chromium',
      headless: config?.headless ?? true,
      viewport: config?.viewport || { width: 1280, height: 800 },
      userAgent:
        config?.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      timeout: config?.timeout || this.defaultTimeout,
      ...config,
    };

    this.screenshotDir = path.join(process.cwd(), 'screenshots');
    this.ensureScreenshotDir();
  }

  async initialize(): Promise<void> {
    try {
      const launchOptions: any = {
        headless: this.config.headless,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      };

      if (this.config.proxy) {
        launchOptions.proxy = {
          server: this.config.proxy.server,
          bypass: this.config.proxy.bypass,
        };
      }

      switch (this.config.type) {
        case 'firefox':
          this.browser = await firefox.launch(launchOptions);
          break;
        case 'webkit':
          this.browser = await webkit.launch(launchOptions);
          break;
        default:
          this.browser = await chromium.launch(launchOptions);
      }

      this.context = await this.browser.newContext({
        viewport: this.config.viewport,
        userAgent: this.config.userAgent,
        ignoreHTTPSErrors: true,
      });

      this.page = await this.context.newPage();

      this.page.setDefaultTimeout(this.config.timeout || this.defaultTimeout);
      this.page.setDefaultNavigationTimeout(this.config.timeout || this.defaultTimeout);

      await this.setupEventListeners();
    } catch (error) {
      throw new Error(`Failed to initialize browser: ${error}`);
    }
  }

  private async setupEventListeners(): Promise<void> {
    if (!this.page) return;

    this.page.on('console', (msg) => {
      console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
    });

    this.page.on('pageerror', (error) => {
      console.error(`[Browser Error] ${error.message}`);
    });

    this.page.on('requestfailed', (request) => {
      console.log(`[Request Failed] ${request.url()}: ${request.failure()?.errorText}`);
    });
  }

  private ensureScreenshotDir(): void {
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
    }
  }

  async navigate(options: NavigateOptions): Promise<BrowserResult> {
    if (!this.page) {
      return { success: false, error: 'Browser not initialized' };
    }

    try {
      const response = await this.page.goto(options.url, {
        waitUntil: options.waitUntil || 'domcontentloaded',
        timeout: options.timeout || this.config.timeout,
        referer: options.referer,
      });

      return {
        success: response?.ok() || false,
        url: this.page?.url(),
        title: await this.page?.title(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async click(options: ClickOptions): Promise<BrowserResult> {
    if (!this.page) {
      return { success: false, error: 'Browser not initialized' };
    }

    try {
      await this.page.click(options.selector, {
        button: options.button,
        clickCount: options.clickCount,
        modifiers: options.modifiers,
        delay: options.delay,
        timeout: options.timeout,
        force: options.force,
      });

      return {
        success: true,
        url: this.page?.url(),
        title: await this.page?.title(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async fill(options: FillOptions): Promise<BrowserResult> {
    if (!this.page) {
      return { success: false, error: 'Browser not initialized' };
    }

    try {
      await this.page.fill(options.selector, options.value, {
        timeout: options.timeout,
      });

      return {
        success: true,
        url: this.page?.url(),
        title: await this.page?.title(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async fillForm(formData: FormData): Promise<BrowserResult> {
    if (!this.page) {
      return { success: false, error: 'Browser not initialized' };
    }

    try {
      for (const [selector, value] of Object.entries(formData)) {
        if (typeof value === 'boolean') {
          if (value) {
            await this.page.check(selector);
          } else {
            await this.page.uncheck(selector);
          }
        } else if (Array.isArray(value)) {
          for (const v of value) {
            await this.page.check(v);
          }
        } else {
          await this.page.fill(selector, value);
        }
      }

      return {
        success: true,
        url: this.page?.url(),
        title: await this.page?.title(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async type(
    selector: string,
    text: string,
    options?: { delay?: number; timeout?: number }
  ): Promise<BrowserResult> {
    if (!this.page) {
      return { success: false, error: 'Browser not initialized' };
    }

    try {
      await this.page.type(selector, text, {
        delay: options?.delay,
        timeout: options?.timeout,
      });

      return {
        success: true,
        url: this.page?.url(),
        title: await this.page?.title(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async scroll(options: ScrollOptions): Promise<BrowserResult> {
    if (!this.page) {
      return { success: false, error: 'Browser not initialized' };
    }

    try {
      if (options.selector) {
        await this.page.locator(options.selector).scrollIntoViewIfNeeded();
      } else {
        await this.page.evaluate(
          ({ x, y, behavior }) => {
            (window as Window).scrollTo({
              left: x || 0,
              top: y || 0,
              behavior: behavior || 'auto',
            });
          },
          { x: options.x, y: options.y, behavior: options.behavior }
        );
      }

      return {
        success: true,
        url: this.page?.url(),
        title: await this.page?.title(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async waitFor(options: WaitForOptions): Promise<BrowserResult> {
    if (!this.page) {
      return { success: false, error: 'Browser not initialized' };
    }

    try {
      if (options.selector) {
        await this.page.waitForSelector(options.selector, {
          state: options.state,
          timeout: options.timeout,
        });
      } else {
        await this.page.waitForTimeout(options.timeout || 1000);
      }

      return {
        success: true,
        url: this.page?.url(),
        title: await this.page?.title(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async screenshot(options?: ScreenshotOptions): Promise<BrowserResult> {
    if (!this.page) {
      return { success: false, error: 'Browser not initialized' };
    }

    try {
      const filename =
        options?.path || `screenshot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
      const filepath = path.isAbsolute(filename)
        ? filename
        : path.join(this.screenshotDir, filename);

      await this.page.screenshot({
        path: filepath,
        fullPage: options?.fullPage,
        clip: options?.clip,
        omitBackground: options?.omitBackground,
        quality: options?.quality,
        type: (options?.type || 'png') as 'png' | 'jpeg',
      });

      return {
        success: true,
        url: this.page?.url(),
        title: await this.page?.title(),
        screenshotPath: filepath,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async getContent(options?: { selector?: string }): Promise<string> {
    if (!this.page) return '';

    if (options?.selector) {
      return this.page.locator(options.selector).innerText();
    }

    return this.page.content();
  }

  async executeScript(options: ExecuteScriptOptions): Promise<any> {
    if (!this.page) {
      return { success: false, error: 'Browser not initialized' };
    }

    try {
      const result = options.selector
        ? await this.page.locator(options.selector).evaluate(options.script, options.args)
        : await this.page.evaluate(options.script, options.args);

      return {
        success: true,
        content: typeof result === 'string' ? result : JSON.stringify(result),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async getPageInfo(): Promise<{ url: string; title: string; contentSize: number }> {
    if (!this.page) {
      return { url: '', title: '', contentSize: 0 };
    }

    const content = await this.page.content();
    return {
      url: this.page.url(),
      title: await this.page.title(),
      contentSize: content.length,
    };
  }

  async getCookies(): Promise<Cookie[]> {
    if (!this.context) return [];
    return this.context.cookies();
  }

  async setCookies(cookies: Cookie[]): Promise<void> {
    if (!this.context) return;
    await this.context.addCookies(cookies);
  }

  async clearCookies(): Promise<void> {
    if (!this.context) return;
    await this.context.clearCookies();
  }

  async getLocalStorage(selector?: string): Promise<Record<string, string>> {
    if (!this.page) return {};

    return this.page.evaluate((s) => {
      const storage = s ? window.localStorage : window.localStorage;
      const result: Record<string, string> = {};
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key) {
          result[key] = storage.getItem(key) || '';
        }
      }
      return result;
    }, selector);
  }

  async setLocalStorage(data: Record<string, string>): Promise<void> {
    if (!this.page) return;

    await this.page.evaluate((entries) => {
      for (const [key, value] of Object.entries(entries)) {
        window.localStorage.setItem(key, value);
      }
    }, data);
  }

  async clearLocalStorage(): Promise<void> {
    if (!this.page) return;
    await this.page.evaluate(() => window.localStorage.clear());
  }

  async getNetworkRequests(): Promise<NetworkRequest[]> {
    if (!this.page) return [];

    const requests: NetworkRequest[] = [];

    this.page.on('request', (request) => {
      requests.push({
        id: (request as any).id || request.url(),
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        postData: request.postData() || undefined,
      });
    });

    return requests;
  }

  async waitForNetworkIdle(timeout?: number): Promise<void> {
    if (!this.page) return;
    await this.page.waitForLoadState('networkidle', { timeout });
  }

  async goBack(): Promise<BrowserResult> {
    if (!this.page) {
      return { success: false, error: 'Browser not initialized' };
    }

    try {
      await this.page.goBack();
      return {
        success: true,
        url: this.page?.url(),
        title: await this.page?.title(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async goForward(): Promise<BrowserResult> {
    if (!this.page) {
      return { success: false, error: 'Browser not initialized' };
    }

    try {
      await this.page.goForward();
      return {
        success: true,
        url: this.page?.url(),
        title: await this.page?.title(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async reload(): Promise<BrowserResult> {
    if (!this.page) {
      return { success: false, error: 'Browser not initialized' };
    }

    try {
      await this.page.reload();
      return {
        success: true,
        url: this.page?.url(),
        title: await this.page?.title(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async close(): Promise<void> {
    if (this.page) {
      await this.page.close();
      this.page = null;
    }

    if (this.context) {
      await this.context.close();
      this.context = null;
    }

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  isInitialized(): boolean {
    return this.browser !== null;
  }

  getPage(): Page | null {
    return this.page;
  }
}
