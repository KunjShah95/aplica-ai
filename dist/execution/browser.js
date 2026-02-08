import { chromium } from 'playwright';
import { randomUUID } from 'crypto';
export class BrowserExecutor {
    browser = null;
    context = null;
    page = null;
    options;
    isInitialized = false;
    constructor(options = {}) {
        this.options = {
            headless: options.headless ?? true,
            viewport: options.viewport ?? { width: 1280, height: 720 },
            userAgent: options.userAgent ?? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            timeout: options.timeout ?? 30000,
        };
    }
    async initialize() {
        if (this.isInitialized)
            return;
        try {
            this.browser = await chromium.launch({
                headless: this.options.headless,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            });
            this.context = await this.browser.newContext({
                viewport: this.options.viewport,
                userAgent: this.options.userAgent,
            });
            this.page = await this.context.newPage();
            this.isInitialized = true;
            console.log('Browser initialized');
        }
        catch (error) {
            throw new Error(`Failed to initialize browser: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async navigate(options) {
        await this.ensureInitialized();
        const id = randomUUID();
        try {
            await this.page.goto(options.url, {
                waitUntil: options.waitUntil ?? 'domcontentloaded',
                timeout: options.timeout ?? this.options.timeout,
            });
            return {
                id,
                success: true,
                operation: 'navigate',
                data: JSON.stringify({ url: options.url, title: await this.page.title() }),
                timestamp: new Date(),
            };
        }
        catch (error) {
            return {
                id,
                success: false,
                operation: 'navigate',
                error: error instanceof Error ? error.message : String(error),
                timestamp: new Date(),
            };
        }
    }
    async click(selector, options) {
        await this.ensureInitialized();
        const id = randomUUID();
        try {
            await this.page.click(selector, {
                timeout: options?.timeout ?? this.options.timeout,
            });
            return {
                id,
                success: true,
                operation: 'click',
                data: selector,
                timestamp: new Date(),
            };
        }
        catch (error) {
            return {
                id,
                success: false,
                operation: 'click',
                error: error instanceof Error ? error.message : String(error),
                timestamp: new Date(),
            };
        }
    }
    async fill(selector, value, options) {
        await this.ensureInitialized();
        const id = randomUUID();
        try {
            await this.page.fill(selector, value, {
                timeout: options?.timeout ?? this.options.timeout,
            });
            return {
                id,
                success: true,
                operation: 'fill',
                data: JSON.stringify({ selector, value }),
                timestamp: new Date(),
            };
        }
        catch (error) {
            return {
                id,
                success: false,
                operation: 'fill',
                error: error instanceof Error ? error.message : String(error),
                timestamp: new Date(),
            };
        }
    }
    async type(selector, text, options) {
        await this.ensureInitialized();
        const id = randomUUID();
        try {
            await this.page.type(selector, text, {
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
        }
        catch (error) {
            return {
                id,
                success: false,
                operation: 'type',
                error: error instanceof Error ? error.message : String(error),
                timestamp: new Date(),
            };
        }
    }
    async getText(selector, options) {
        await this.ensureInitialized();
        const id = randomUUID();
        try {
            const element = await this.page.locator(selector);
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
        }
        catch (error) {
            return {
                id,
                success: false,
                operation: 'getText',
                error: error instanceof Error ? error.message : String(error),
                timestamp: new Date(),
            };
        }
    }
    async getAttribute(selector, attribute, options) {
        await this.ensureInitialized();
        const id = randomUUID();
        try {
            const value = await this.page.getAttribute(selector, attribute, {
                timeout: options?.timeout ?? this.options.timeout,
            });
            return {
                id,
                success: true,
                operation: 'getAttribute',
                data: JSON.stringify({ attribute, value }),
                timestamp: new Date(),
            };
        }
        catch (error) {
            return {
                id,
                success: false,
                operation: 'getAttribute',
                error: error instanceof Error ? error.message : String(error),
                timestamp: new Date(),
            };
        }
    }
    async screenshot(options) {
        await this.ensureInitialized();
        const id = randomUUID();
        try {
            const screenshotBuffer = await this.page.screenshot({
                fullPage: options?.fullPage ?? false,
                clip: options?.clip,
                quality: options?.quality,
                type: (options?.format ?? 'png'),
            });
            return {
                id,
                success: true,
                operation: 'screenshot',
                screenshot: screenshotBuffer.toString('base64'),
                data: JSON.stringify({ size: screenshotBuffer.length }),
                timestamp: new Date(),
            };
        }
        catch (error) {
            return {
                id,
                success: false,
                operation: 'screenshot',
                error: error instanceof Error ? error.message : String(error),
                timestamp: new Date(),
            };
        }
    }
    async evaluate(script) {
        await this.ensureInitialized();
        const id = randomUUID();
        try {
            const result = await this.page.evaluate(script);
            return {
                id,
                success: true,
                operation: 'evaluate',
                data: JSON.stringify(result),
                timestamp: new Date(),
            };
        }
        catch (error) {
            return {
                id,
                success: false,
                operation: 'evaluate',
                error: error instanceof Error ? error.message : String(error),
                timestamp: new Date(),
            };
        }
    }
    async waitForSelector(selector, options) {
        await this.ensureInitialized();
        const id = randomUUID();
        try {
            await this.page.waitForSelector(selector, {
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
        }
        catch (error) {
            return {
                id,
                success: false,
                operation: 'waitForSelector',
                error: error instanceof Error ? error.message : String(error),
                timestamp: new Date(),
            };
        }
    }
    async waitForTimeout(milliseconds) {
        await this.ensureInitialized();
        const id = randomUUID();
        await this.page.waitForTimeout(milliseconds);
        return {
            id,
            success: true,
            operation: 'waitForTimeout',
            data: String(milliseconds),
            timestamp: new Date(),
        };
    }
    async scrollTo(selector) {
        await this.ensureInitialized();
        const id = randomUUID();
        try {
            await this.page.locator(selector).scrollIntoViewIfNeeded();
            return {
                id,
                success: true,
                operation: 'scrollTo',
                data: selector,
                timestamp: new Date(),
            };
        }
        catch (error) {
            return {
                id,
                success: false,
                operation: 'scrollTo',
                error: error instanceof Error ? error.message : String(error),
                timestamp: new Date(),
            };
        }
    }
    async getPageContent() {
        await this.ensureInitialized();
        const id = randomUUID();
        try {
            const content = await this.page.content();
            return {
                id,
                success: true,
                operation: 'getPageContent',
                data: content,
                timestamp: new Date(),
            };
        }
        catch (error) {
            return {
                id,
                success: false,
                operation: 'getPageContent',
                error: error instanceof Error ? error.message : String(error),
                timestamp: new Date(),
            };
        }
    }
    async getTitle() {
        await this.ensureInitialized();
        const id = randomUUID();
        try {
            const title = await this.page.title();
            return {
                id,
                success: true,
                operation: 'getTitle',
                data: title,
                timestamp: new Date(),
            };
        }
        catch (error) {
            return {
                id,
                success: false,
                operation: 'getTitle',
                error: error instanceof Error ? error.message : String(error),
                timestamp: new Date(),
            };
        }
    }
    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.context = null;
            this.page = null;
            this.isInitialized = false;
            console.log('Browser closed');
        }
    }
    async ensureInitialized() {
        if (!this.isInitialized) {
            await this.initialize();
        }
    }
    isReady() {
        return this.isInitialized;
    }
    async getCurrentUrl() {
        await this.ensureInitialized();
        return this.page.url();
    }
}
export const browserExecutor = new BrowserExecutor();
//# sourceMappingURL=browser.js.map