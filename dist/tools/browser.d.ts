import { Page } from 'playwright';
export interface BrowserConfig {
    type?: 'chromium' | 'firefox' | 'webkit';
    headless?: boolean;
    userDataDir?: string;
    viewport?: {
        width: number;
        height: number;
    };
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
    clip?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
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
export declare class BrowserTool {
    private browser;
    private context;
    private page;
    private config;
    private defaultTimeout;
    private screenshotDir;
    constructor(config?: BrowserConfig);
    initialize(): Promise<void>;
    private setupEventListeners;
    private ensureScreenshotDir;
    navigate(options: NavigateOptions): Promise<BrowserResult>;
    click(options: ClickOptions): Promise<BrowserResult>;
    fill(options: FillOptions): Promise<BrowserResult>;
    fillForm(formData: FormData): Promise<BrowserResult>;
    type(selector: string, text: string, options?: {
        delay?: number;
        timeout?: number;
    }): Promise<BrowserResult>;
    scroll(options: ScrollOptions): Promise<BrowserResult>;
    waitFor(options: WaitForOptions): Promise<BrowserResult>;
    screenshot(options?: ScreenshotOptions): Promise<BrowserResult>;
    getContent(options?: {
        selector?: string;
    }): Promise<string>;
    executeScript(options: ExecuteScriptOptions): Promise<any>;
    getPageInfo(): Promise<{
        url: string;
        title: string;
        contentSize: number;
    }>;
    getCookies(): Promise<Cookie[]>;
    setCookies(cookies: Cookie[]): Promise<void>;
    clearCookies(): Promise<void>;
    getLocalStorage(selector?: string): Promise<Record<string, string>>;
    setLocalStorage(data: Record<string, string>): Promise<void>;
    clearLocalStorage(): Promise<void>;
    getNetworkRequests(): Promise<NetworkRequest[]>;
    waitForNetworkIdle(timeout?: number): Promise<void>;
    goBack(): Promise<BrowserResult>;
    goForward(): Promise<BrowserResult>;
    reload(): Promise<BrowserResult>;
    close(): Promise<void>;
    isInitialized(): boolean;
    getPage(): Page | null;
}
//# sourceMappingURL=browser.d.ts.map