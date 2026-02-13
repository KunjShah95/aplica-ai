import {
  chromium,
  firefox,
  webkit,
  Browser,
  BrowserContext,
  Page,
  BrowserType,
  LaunchOptions,
  devices,
  Cookie,
  Request,
  Response,
  Route,
} from 'playwright';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface BrowserConfig {
  browser?: 'chromium' | 'firefox' | 'webkit';
  headless?: boolean;
  viewport?: { width: number; height: number };
  userAgent?: string;
  proxy?: { server: string; username?: string; password?: string };
  device?: string;
  timeout?: number;
  args?: string[];
}

export interface BrowserSession {
  id: string;
  browser: string;
  contextId: string;
  pageId: string;
  createdAt: Date;
  lastActivity: Date;
}

export interface NetworkRequest {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  postData?: string;
  timestamp: number;
}

export interface NetworkResponse {
  id: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body?: string;
  timestamp: number;
}

export interface MockRule {
  urlPattern: string | RegExp;
  response: {
    status: number;
    headers?: Record<string, string>;
    body?: string;
    json?: Record<string, any>;
  };
  Times?: number;
}

export interface FormData {
  fields: Record<string, string>;
  files?: Array<{ selector: string; filePath: string }>;
  checkbox?: Array<{ selector: string; checked: boolean }>;
  select?: Array<{ selector: string; value: string }>;
}

export interface DataExtractionConfig {
  tables?: Array<{
    selector: string;
    includeHeaders?: boolean;
    outputFormat?: 'array' | 'json';
  }>;
  lists?: Array<{
    selector: string;
    itemSelector: string;
    fields: Record<string, string>;
  }>;
  links?: Array<{
    selector: string;
    attribute?: 'href' | 'text' | 'outerHTML';
  }>;
  images?: Array<{
    selector: string;
    attribute?: 'src' | 'alt' | 'srcset';
  }>;
  text?: Array<{
    selector: string;
    attribute?: 'textContent' | 'innerText' | 'outerHTML';
  }>;
}

export class EnhancedBrowserAutomation {
  private browsers: Map<string, { browser: Browser; context: BrowserContext }> = new Map();
  private pages: Map<string, Page> = new Map();
  private sessions: Map<string, BrowserSession> = new Map();
  private defaultConfig: BrowserConfig;
  private mockRules: Map<string, MockRule[]> = new Map();

  constructor(defaultConfig: BrowserConfig = {}) {
    this.defaultConfig = {
      browser: 'chromium',
      headless: true,
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      timeout: 30000,
      ...defaultConfig,
    };
  }

  async createSession(config?: BrowserConfig): Promise<BrowserSession> {
    const sessionId = randomUUID();
    const cfg = { ...this.defaultConfig, ...config };

    const launchOptions: LaunchOptions = {
      headless: cfg.headless,
      args: cfg.args || ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    };

    if (cfg.proxy) {
      launchOptions.proxy = {
        server: cfg.proxy.server,
        username: cfg.proxy.username,
        password: cfg.proxy.password,
      };
    }

    let browserType: BrowserType;
    switch (cfg.browser) {
      case 'firefox':
        browserType = firefox;
        break;
      case 'webkit':
        browserType = webkit;
        break;
      default:
        browserType = chromium;
    }

    const browser = await browserType.launch(launchOptions);

    let contextOptions: any = {
      viewport: cfg.viewport,
      userAgent: cfg.userAgent,
      acceptDownloads: true,
    };

    if (cfg.device) {
      const device = devices[cfg.device];
      if (device) {
        contextOptions = { ...contextOptions, ...device };
      }
    }

    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();

    const session: BrowserSession = {
      id: sessionId,
      browser: cfg.browser || 'chromium',
      contextId: randomUUID(),
      pageId: randomUUID(),
      createdAt: new Date(),
      lastActivity: new Date(),
    };

    this.browsers.set(sessionId, { browser, context });
    this.pages.set(session.pageId, page);
    this.sessions.set(sessionId, session);

    await this.setupPageListeners(session.pageId, page);

    return session;
  }

  private async setupPageListeners(pageId: string, page: Page): Promise<void> {
    page.on('console', (msg) => {
      console.log(`[Page ${pageId}] Console:`, msg.type(), msg.text());
    });

    page.on('pageerror', (error) => {
      console.error(`[Page ${pageId}] Page error:`, error.message);
    });

    page.on('requestfailed', (request) => {
      console.warn(`[Page ${pageId}] Request failed:`, request.url());
    });
  }

  async getPage(sessionId: string): Promise<Page | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    return this.pages.get(session.pageId) || null;
  }

  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const page = this.pages.get(session.pageId);
    if (page) {
      await page.close();
      this.pages.delete(session.pageId);
    }

    const browserData = this.browsers.get(sessionId);
    if (browserData) {
      await browserData.context.close();
      await browserData.browser.close();
      this.browsers.delete(sessionId);
    }

    this.sessions.delete(sessionId);
  }

  async closeAllSessions(): Promise<void> {
    for (const sessionId of this.sessions.keys()) {
      await this.closeSession(sessionId);
    }
  }

  async navigate(
    sessionId: string,
    url: string,
    options?: {
      waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit';
      timeout?: number;
      referer?: string;
    }
  ): Promise<{ success: boolean; title?: string; url?: string; error?: string }> {
    const page = await this.getPage(sessionId);
    if (!page) return { success: false, error: 'Session not found' };

    try {
      await page.goto(url, {
        waitUntil: options?.waitUntil || 'domcontentloaded',
        timeout: options?.timeout || this.defaultConfig.timeout,
        referer: options?.referer,
      });

      this.updateSessionActivity(sessionId);
      return { success: true, title: await page.title(), url: page.url() };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async click(
    sessionId: string,
    selector: string,
    options?: {
      button?: 'left' | 'right' | 'middle';
      clickCount?: number;
      delay?: number;
      force?: boolean;
      timeout?: number;
    }
  ): Promise<{ success: boolean; error?: string }> {
    const page = await this.getPage(sessionId);
    if (!page) return { success: false, error: 'Session not found' };

    try {
      await page.click(selector, {
        button: options?.button || 'left',
        clickCount: options?.clickCount || 1,
        delay: options?.delay,
        force: options?.force || false,
        timeout: options?.timeout || this.defaultConfig.timeout,
      });

      this.updateSessionActivity(sessionId);
      return { success: true };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async doubleClick(
    sessionId: string,
    selector: string,
    options?: {
      delay?: number;
      force?: boolean;
      timeout?: number;
    }
  ): Promise<{ success: boolean; error?: string }> {
    return this.click(sessionId, selector, { ...options, clickCount: 2 });
  }

  async rightClick(
    sessionId: string,
    selector: string,
    options?: {
      force?: boolean;
      timeout?: number;
    }
  ): Promise<{ success: boolean; error?: string }> {
    return this.click(sessionId, selector, { ...options, button: 'right' });
  }

  async hover(
    sessionId: string,
    selector: string,
    options?: {
      force?: boolean;
      timeout?: number;
    }
  ): Promise<{ success: boolean; error?: string }> {
    const page = await this.getPage(sessionId);
    if (!page) return { success: false, error: 'Session not found' };

    try {
      await page.hover(selector, {
        force: options?.force || false,
        timeout: options?.timeout || this.defaultConfig.timeout,
      });

      this.updateSessionActivity(sessionId);
      return { success: true };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async dragAndDrop(
    sessionId: string,
    sourceSelector: string,
    targetSelector: string,
    options?: { timeout?: number }
  ): Promise<{ success: boolean; error?: string }> {
    const page = await this.getPage(sessionId);
    if (!page) return { success: false, error: 'Session not found' };

    try {
      await page.dragAndDrop(sourceSelector, targetSelector, {
        timeout: options?.timeout || this.defaultConfig.timeout,
      });

      this.updateSessionActivity(sessionId);
      return { success: true };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async type(
    sessionId: string,
    selector: string,
    text: string,
    options?: {
      delay?: number;
      timeout?: number;
    }
  ): Promise<{ success: boolean; error?: string }> {
    const page = await this.getPage(sessionId);
    if (!page) return { success: false, error: 'Session not found' };

    try {
      await page.type(selector, text, {
        delay: options?.delay,
        timeout: options?.timeout || this.defaultConfig.timeout,
      });

      this.updateSessionActivity(sessionId);
      return { success: true };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async fill(
    sessionId: string,
    selector: string,
    value: string,
    options?: {
      timeout?: number;
    }
  ): Promise<{ success: boolean; error?: string }> {
    const page = await this.getPage(sessionId);
    if (!page) return { success: false, error: 'Session not found' };

    try {
      await page.fill(selector, value, {
        timeout: options?.timeout || this.defaultConfig.timeout,
      });

      this.updateSessionActivity(sessionId);
      return { success: true };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async press(
    sessionId: string,
    selector: string,
    key: string,
    options?: {
      delay?: number;
      timeout?: number;
    }
  ): Promise<{ success: boolean; error?: string }> {
    const page = await this.getPage(sessionId);
    if (!page) return { success: false, error: 'Session not found' };

    try {
      await page.press(selector, key, {
        delay: options?.delay,
        timeout: options?.timeout || this.defaultConfig.timeout,
      });

      this.updateSessionActivity(sessionId);
      return { success: true };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async clear(
    sessionId: string,
    selector: string,
    options?: {
      timeout?: number;
    }
  ): Promise<{ success: boolean; error?: string }> {
    const page = await this.getPage(sessionId);
    if (!page) return { success: false, error: 'Session not found' };

    try {
      await page.fill(selector, '', {
        timeout: options?.timeout || this.defaultConfig.timeout,
      });

      this.updateSessionActivity(sessionId);
      return { success: true };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async uploadFile(
    sessionId: string,
    selector: string,
    filePath: string
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    const page = await this.getPage(sessionId);
    if (!page) return { success: false, error: 'Session not found' };

    try {
      const input = await page.locator(selector);
      await input.setInputFiles(filePath);
      this.updateSessionActivity(sessionId);
      return { success: true };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async submitForm(
    sessionId: string,
    formSelector: string
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    const page = await this.getPage(sessionId);
    if (!page) return { success: false, error: 'Session not found' };

    try {
      await page.locator(formSelector).evaluate((form) => (form as HTMLFormElement).submit());
      this.updateSessionActivity(sessionId);
      return { success: true };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async fillForm(
    sessionId: string,
    formData: FormData
  ): Promise<{
    success: boolean;
    filled: string[];
    errors: string[];
  }> {
    const page = await this.getPage(sessionId);
    if (!page) return { success: false, filled: [], errors: ['Session not found'] };

    const filled: string[] = [];
    const errors: string[] = [];

    for (const [selector, value] of Object.entries(formData.fields)) {
      try {
        await page.fill(selector, value);
        filled.push(selector);
      } catch (error: any) {
        errors.push(`${selector}: ${error.message}`);
      }
    }

    if (formData.checkbox) {
      for (const { selector, checked } of formData.checkbox) {
        try {
          const checkbox = page.locator(selector);
          const isChecked = await checkbox.isChecked();
          if (isChecked !== checked) {
            await checkbox.check();
          }
          filled.push(selector);
        } catch (error: any) {
          errors.push(`${selector}: ${error.message}`);
        }
      }
    }

    if (formData.select) {
      for (const { selector, value } of formData.select) {
        try {
          await page.selectOption(selector, value);
          filled.push(selector);
        } catch (error: any) {
          errors.push(`${selector}: ${error.message}`);
        }
      }
    }

    if (formData.files) {
      for (const { selector, filePath } of formData.files) {
        try {
          await page.locator(selector).setInputFiles(filePath);
          filled.push(selector);
        } catch (error: any) {
          errors.push(`${selector}: ${error.message}`);
        }
      }
    }

    this.updateSessionActivity(sessionId);
    return { success: errors.length === 0, filled, errors };
  }

  async getText(
    sessionId: string,
    selector: string,
    options?: {
      timeout?: number;
    }
  ): Promise<{ success: boolean; text?: string; error?: string }> {
    const page = await this.getPage(sessionId);
    if (!page) return { success: false, error: 'Session not found' };

    try {
      const text = await page.locator(selector).textContent({
        timeout: options?.timeout || this.defaultConfig.timeout,
      });

      return { success: true, text: text || '' };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async getAttribute(
    sessionId: string,
    selector: string,
    attribute: string,
    options?: {
      timeout?: number;
    }
  ): Promise<{ success: boolean; value?: string; error?: string }> {
    const page = await this.getPage(sessionId);
    if (!page) return { success: false, error: 'Session not found' };

    try {
      const value = await page.getAttribute(selector, attribute, {
        timeout: options?.timeout || this.defaultConfig.timeout,
      });

      return { success: true, value: value || undefined };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async getProperty(
    sessionId: string,
    selector: string,
    property: string,
    options?: {
      timeout?: number;
    }
  ): Promise<{ success: boolean; value?: any; error?: string }> {
    const page = await this.getPage(sessionId);
    if (!page) return { success: false, error: 'Session not found' };

    try {
      const value = await page
        .locator(selector)
        .evaluate((el, prop) => (el as any)[prop], property, {
          timeout: options?.timeout || this.defaultConfig.timeout,
        });

      return { success: true, value };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async countElements(
    sessionId: string,
    selector: string
  ): Promise<{
    success: boolean;
    count?: number;
    error?: string;
  }> {
    const page = await this.getPage(sessionId);
    if (!page) return { success: false, error: 'Session not found' };

    try {
      const count = await page.locator(selector).count();
      return { success: true, count };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async exists(
    sessionId: string,
    selector: string
  ): Promise<{
    success: boolean;
    exists?: boolean;
    error?: string;
  }> {
    const page = await this.getPage(sessionId);
    if (!page) return { success: false, error: 'Session not found' };

    try {
      const count = await page.locator(selector).count();
      return { success: true, exists: count > 0 };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async isVisible(
    sessionId: string,
    selector: string
  ): Promise<{
    success: boolean;
    visible?: boolean;
    error?: string;
  }> {
    const page = await this.getPage(sessionId);
    if (!page) return { success: false, error: 'Session not found' };

    try {
      const locator = page.locator(selector);
      const count = await locator.count();
      if (count === 0) return { success: true, visible: false };

      const visible = await locator.first().isVisible();
      return { success: true, visible };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async waitForSelector(
    sessionId: string,
    selector: string,
    options?: {
      timeout?: number;
      state?: 'attached' | 'detached' | 'visible' | 'hidden';
    }
  ): Promise<{ success: boolean; error?: string }> {
    const page = await this.getPage(sessionId);
    if (!page) return { success: false, error: 'Session not found' };

    try {
      await page.waitForSelector(selector, {
        timeout: options?.timeout || this.defaultConfig.timeout,
        state: options?.state || 'visible',
      });

      return { success: true };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async waitForTimeout(sessionId: string, milliseconds: number): Promise<void> {
    const page = await this.getPage(sessionId);
    if (page) {
      await page.waitForTimeout(milliseconds);
    }
  }

  async waitForNavigation(
    sessionId: string,
    options?: {
      timeout?: number;
      waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit';
    }
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    const page = await this.getPage(sessionId);
    if (!page) return { success: false, error: 'Session not found' };

    try {
      const response = await page.waitForNavigation({
        timeout: options?.timeout || this.defaultConfig.timeout,
        waitUntil: options?.waitUntil || 'domcontentloaded',
      });

      return { success: true, url: response?.url() };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async waitForResponse(
    sessionId: string,
    urlPattern: string | RegExp,
    options?: {
      timeout?: number;
    }
  ): Promise<{ success: boolean; response?: any; error?: string }> {
    const page = await this.getPage(sessionId);
    if (!page) return { success: false, error: 'Session not found' };

    try {
      const response = await page.waitForResponse(urlPattern, {
        timeout: options?.timeout || this.defaultConfig.timeout,
      });

      return { success: true, response: await response.json().catch(() => response.text()) };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async screenshot(
    sessionId: string,
    options?: {
      fullPage?: boolean;
      clip?: { x: number; y: number; width: number; height: number };
      quality?: number;
      format?: 'png' | 'jpeg' | 'webp';
      path?: string;
    }
  ): Promise<{ success: boolean; data?: string; path?: string; error?: string }> {
    const page = await this.getPage(sessionId);
    if (!page) return { success: false, error: 'Session not found' };

    try {
      const screenshotOptions: any = {
        fullPage: options?.fullPage || false,
        clip: options?.clip,
        quality: options?.quality,
        type: options?.format || 'png',
      };

      if (options?.path) {
        await page.screenshot({ ...screenshotOptions, path: options.path });
        return { success: true, path: options.path };
      }

      const buffer = await page.screenshot(screenshotOptions);
      return { success: true, data: buffer.toString('base64') };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async pdf(
    sessionId: string,
    options?: {
      format?: 'Letter' | 'Legal' | 'Tabloid' | 'Ledger' | 'A4' | 'A3' | 'A5' | 'A6';
      landscape?: boolean;
      printBackground?: boolean;
      scale?: number;
      path?: string;
    }
  ): Promise<{ success: boolean; data?: string; path?: string; error?: string }> {
    const page = await this.getPage(sessionId);
    if (!page) return { success: false, error: 'Session not found' };

    try {
      const pdfOptions: any = {
        format: options?.format || 'A4',
        landscape: options?.landscape || false,
        printBackground: options?.printBackground || true,
        scale: options?.scale || 1,
      };

      if (options?.path) {
        await page.pdf({ ...pdfOptions, path: options.path });
        return { success: true, path: options.path };
      }

      const buffer = await page.pdf(pdfOptions);
      return { success: true, data: buffer.toString('base64') };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async evaluate(
    sessionId: string,
    script: string
  ): Promise<{
    success: boolean;
    result?: any;
    error?: string;
  }> {
    const page = await this.getPage(sessionId);
    if (!page) return { success: false, error: 'Session not found' };

    try {
      const result = await page.evaluate(script);
      this.updateSessionActivity(sessionId);
      return { success: true, result };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async evaluateAsync(
    sessionId: string,
    script: string,
    timeout?: number
  ): Promise<{
    success: boolean;
    result?: any;
    error?: string;
  }> {
    const page = await this.getPage(sessionId);
    if (!page) return { success: false, error: 'Session not found' };

    try {
      const timeoutMs = timeout || this.defaultConfig.timeout || 30000;
      const result = await Promise.race([
        page.evaluate(script),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Evaluation timeout')), timeoutMs)
        )
      ]);
      this.updateSessionActivity(sessionId);
      return { success: true, result };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async setViewport(sessionId: string, viewport: { width: number; height: number }): Promise<void> {
    const page = await this.getPage(sessionId);
    if (page) {
      await page.setViewportSize(viewport);
    }
  }

  async setUserAgent(sessionId: string, userAgent: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const context = this.browsers.get(sessionId)?.context;
    if (context) {
      await context.addCookies([]);
      const newPage = await context.newPage();
      const oldPage = this.pages.get(session.pageId);
      if (oldPage) await oldPage.close();
      this.pages.set(session.pageId, newPage);
      await this.setupPageListeners(session.pageId, newPage);
    }
  }

  async addCookie(sessionId: string, cookie: Cookie): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const context = this.browsers.get(sessionId)?.context;
    if (context) {
      await context.addCookies([cookie]);
    }
  }

  async deleteCookies(sessionId: string, cookies?: Cookie[]): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const context = this.browsers.get(sessionId)?.context;
    if (context) {
      if (cookies) {
        // Use clearCookies with name filter for each cookie
        for (const cookie of cookies) {
          await context.clearCookies({ name: cookie.name });
        }
      } else {
        await context.clearCookies();
      }
    }
  }

  async getCookies(sessionId: string): Promise<Cookie[]> {
    const session = this.sessions.get(sessionId);
    if (!session) return [];

    const context = this.browsers.get(sessionId)?.context;
    if (context) {
      return await context.cookies();
    }
    return [];
  }

  async saveState(sessionId: string, statePath: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const context = this.browsers.get(sessionId)?.context;
    if (context) {
      const state = await context.storageState();
      await fs.promises.writeFile(statePath, JSON.stringify(state, null, 2));
    }
  }

  async loadState(sessionId: string, statePath: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const state = JSON.parse(await fs.promises.readFile(statePath, 'utf-8'));
    const context = this.browsers.get(sessionId)?.context;
    if (context) {
      await context.addCookies(state.cookies);
      for (const origin of state.origins || []) {
        for (const localStorage of origin.localStorage || []) {
          await context.pages()[0]?.evaluate((storage) => {
            localStorage.setItem(storage.key, storage.value);
          }, localStorage);
        }
      }
    }
  }

  async enableNetworkInterception(sessionId: string): Promise<void> {
    const page = await this.getPage(sessionId);
    if (page) {
      await page.route('**/*', (route) => route.continue());
    }
  }

  async disableNetworkInterception(sessionId: string): Promise<void> {
    const page = await this.getPage(sessionId);
    if (page) {
      await page.unroute('**/*');
    }
  }

  async mockRequest(sessionId: string, rule: MockRule): Promise<void> {
    const page = await this.getPage(sessionId);
    if (!page) return;

    const pageId = sessionId;
    if (!this.mockRules.has(pageId)) {
      this.mockRules.set(pageId, []);
    }
    this.mockRules.get(pageId)!.push(rule);

    await page.route(rule.urlPattern, async (route) => {
      await route.fulfill({
        status: rule.response.status,
        headers: rule.response.headers,
        body:
          rule.response.body ||
          (rule.response.json ? JSON.stringify(rule.response.json) : undefined),
      });
    });
  }

  async clearMocks(sessionId: string): Promise<void> {
    const page = await this.getPage(sessionId);
    if (page) {
      await page.unroute('**/*');
    }
    this.mockRules.delete(sessionId);
  }

  async getConsoleLogs(
    sessionId: string
  ): Promise<Array<{ type: string; text: string; timestamp: Date }>> {
    const logs: Array<{ type: string; text: string; timestamp: Date }> = [];
    const page = await this.getPage(sessionId);

    if (page) {
      const consoleMessages = await page.evaluate(() => {
        return (window as any).__consoleLogs || [];
      });
      return consoleMessages;
    }
    return logs;
  }

  async getPageErrors(sessionId: string): Promise<string[]> {
    const page = await this.getPage(sessionId);
    if (!page) return [];

    return await page.evaluate(() => {
      return (window as any).__pageErrors || [];
    });
  }

  async extractData(
    sessionId: string,
    config: DataExtractionConfig
  ): Promise<{
    success: boolean;
    data?: Record<string, any>;
    error?: string;
  }> {
    const page = await this.getPage(sessionId);
    if (!page) return { success: false, error: 'Session not found' };

    try {
      const data: Record<string, any> = {};

      if (config.tables) {
        data.tables = {};
        for (const tableConfig of config.tables) {
          const tables = await page.locator(tableConfig.selector).all();
          const tableData: any[] = [];

          for (const table of tables) {
            const rows = await table.locator('tr').all();
            const tableRows: any[][] = [];

            for (const row of rows) {
              const cells = await row
                .locator(tableConfig.includeHeaders ? 'th, td' : 'td')
                .allTextContents();
              tableRows.push(cells);
            }
            tableData.push(tableRows);
          }

          data.tables[tableConfig.selector] =
            tableConfig.outputFormat === 'json'
              ? tableData.map((rows) =>
                rows.map((cells: string[]) =>
                  Object.fromEntries(cells.map((c: string, i: number) => [`col${i}`, c]))
                )
              )
              : tableData;
        }
      }

      if (config.lists) {
        data.lists = {};
        for (const listConfig of config.lists) {
          const lists = await page.locator(listConfig.selector).all();
          const listData: any[] = [];

          for (const list of lists) {
            const items = await list.locator(listConfig.itemSelector).all();
            const itemData: any[] = [];

            for (const item of items) {
              const itemFields: Record<string, any> = {};
              for (const [field, selector] of Object.entries(listConfig.fields)) {
                try {
                  itemFields[field] = await item.locator(selector).textContent();
                } catch {
                  itemFields[field] = null;
                }
              }
              itemData.push(itemFields);
            }
            listData.push(itemData);
          }

          data.lists[listConfig.selector] = listData;
        }
      }

      if (config.links) {
        data.links = {};
        for (const linkConfig of config.links) {
          const links = await page.locator(linkConfig.selector).all();
          const linkData: any[] = [];

          for (const link of links) {
            linkData.push(await link.getAttribute(linkConfig.attribute || 'href'));
          }

          data.links[linkConfig.selector] = linkData;
        }
      }

      if (config.images) {
        data.images = {};
        for (const imgConfig of config.images) {
          const images = await page.locator(imgConfig.selector).all();
          const imgData: any[] = [];

          for (const img of images) {
            imgData.push(await img.getAttribute(imgConfig.attribute || 'src'));
          }

          data.images[imgConfig.selector] = imgData;
        }
      }

      if (config.text) {
        data.text = {};
        for (const textConfig of config.text) {
          const elements = await page.locator(textConfig.selector).all();
          const textData: any[] = [];

          for (const el of elements) {
            if (textConfig.attribute === 'outerHTML') {
              textData.push(await el.evaluate((e) => e.outerHTML));
            } else if (textConfig.attribute === 'innerText') {
              textData.push(await el.innerText());
            } else {
              textData.push(await el.textContent());
            }
          }

          data.text[textConfig.selector] = textData;
        }
      }

      this.updateSessionActivity(sessionId);
      return { success: true, data };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async getAccessibilityTree(sessionId: string): Promise<any> {
    const page = await this.getPage(sessionId);
    if (!page) return null;

    // Use DOM-based accessibility extraction since page.accessibility is deprecated
    return await page.evaluate(() => {
      function buildAccessibilityTree(element: Element): any {
        const role = element.getAttribute('role') || element.tagName.toLowerCase();
        const name = element.getAttribute('aria-label') ||
          element.getAttribute('aria-labelledby') ||
          (element as HTMLElement).innerText?.substring(0, 100) || '';

        const children: any[] = [];
        for (const child of Array.from(element.children)) {
          const childTree = buildAccessibilityTree(child);
          if (childTree) {
            children.push(childTree);
          }
        }

        return {
          role,
          name: name.trim(),
          children: children.length > 0 ? children : undefined,
        };
      }

      return buildAccessibilityTree(document.body);
    });
  }

  async recordVideo(sessionId: string, outputPath: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const context = this.browsers.get(sessionId)?.context;
    if (context) {
      const page = await context.newPage();
      const oldPage = this.pages.get(session.pageId);
      if (oldPage) await oldPage.close();

      this.pages.set(session.pageId, page);
      await this.setupPageListeners(session.pageId, page);

      await page.route('**/*', (route) => route.continue());
    }
  }

  async stopRecording(sessionId: string): Promise<string | null> {
    return null;
  }

  async executeJavaScript<T = any>(sessionId: string, script: string): Promise<T> {
    const result = await this.evaluate(sessionId, script);
    if (result.success) {
      return result.result as T;
    }
    throw new Error(result.error);
  }

  async getCurrentUrl(sessionId: string): Promise<string> {
    const page = await this.getPage(sessionId);
    return page?.url() || '';
  }

  async getTitle(sessionId: string): Promise<string> {
    const page = await this.getPage(sessionId);
    return page?.title() || '';
  }

  async getPageContent(sessionId: string): Promise<string> {
    const page = await this.getPage(sessionId);
    return page?.content() || '';
  }

  async goBack(sessionId: string): Promise<void> {
    const page = await this.getPage(sessionId);
    if (page) await page.goBack();
  }

  async goForward(sessionId: string): Promise<void> {
    const page = await this.getPage(sessionId);
    if (page) await page.goForward();
  }

  async reload(sessionId: string): Promise<void> {
    const page = await this.getPage(sessionId);
    if (page) await page.reload();
  }

  private updateSessionActivity(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
    }
  }

  getActiveSessions(): BrowserSession[] {
    return Array.from(this.sessions.values());
  }

  getSessionStats(): {
    totalSessions: number;
    browsers: Record<string, number>;
  } {
    const browsers: Record<string, number> = {};
    for (const session of this.sessions.values()) {
      browsers[session.browser] = (browsers[session.browser] || 0) + 1;
    }
    return { totalSessions: this.sessions.size, browsers };
  }
}

export const browserAutomation = new EnhancedBrowserAutomation();
