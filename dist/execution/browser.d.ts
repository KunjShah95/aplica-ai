export interface BrowserOptions {
    headless?: boolean;
    viewport?: {
        width: number;
        height: number;
    };
    userAgent?: string;
    timeout?: number;
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
    clip?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    quality?: number;
    format?: 'png' | 'jpeg' | 'webp';
}
export declare class BrowserExecutor {
    private browser;
    private context;
    private page;
    private options;
    private isInitialized;
    constructor(options?: BrowserOptions);
    initialize(): Promise<void>;
    navigate(options: NavigationOptions): Promise<BrowserResult>;
    click(selector: string, options?: {
        timeout?: number;
    }): Promise<BrowserResult>;
    fill(selector: string, value: string, options?: {
        timeout?: number;
    }): Promise<BrowserResult>;
    type(selector: string, text: string, options?: {
        timeout?: number;
        delay?: number;
    }): Promise<BrowserResult>;
    getText(selector: string, options?: {
        timeout?: number;
    }): Promise<BrowserResult>;
    getAttribute(selector: string, attribute: string, options?: {
        timeout?: number;
    }): Promise<BrowserResult>;
    screenshot(options?: ScreenshotOptions): Promise<BrowserResult>;
    evaluate(script: string): Promise<BrowserResult>;
    waitForSelector(selector: string, options?: {
        timeout?: number;
        state?: 'attached' | 'detached' | 'visible' | 'hidden';
    }): Promise<BrowserResult>;
    waitForTimeout(milliseconds: number): Promise<BrowserResult>;
    scrollTo(selector: string): Promise<BrowserResult>;
    getPageContent(): Promise<BrowserResult>;
    getTitle(): Promise<BrowserResult>;
    close(): Promise<void>;
    private ensureInitialized;
    isReady(): boolean;
    getCurrentUrl(): Promise<string>;
}
export declare const browserExecutor: BrowserExecutor;
//# sourceMappingURL=browser.d.ts.map