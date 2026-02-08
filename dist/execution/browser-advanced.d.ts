import { Page, Cookie } from 'playwright';
export interface BrowserConfig {
    browser?: 'chromium' | 'firefox' | 'webkit';
    headless?: boolean;
    viewport?: {
        width: number;
        height: number;
    };
    userAgent?: string;
    proxy?: {
        server: string;
        username?: string;
        password?: string;
    };
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
    files?: Array<{
        selector: string;
        filePath: string;
    }>;
    checkbox?: Array<{
        selector: string;
        checked: boolean;
    }>;
    select?: Array<{
        selector: string;
        value: string;
    }>;
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
export declare class EnhancedBrowserAutomation {
    private browsers;
    private pages;
    private sessions;
    private defaultConfig;
    private mockRules;
    constructor(defaultConfig?: BrowserConfig);
    createSession(config?: BrowserConfig): Promise<BrowserSession>;
    private setupPageListeners;
    getPage(sessionId: string): Promise<Page | null>;
    closeSession(sessionId: string): Promise<void>;
    closeAllSessions(): Promise<void>;
    navigate(sessionId: string, url: string, options?: {
        waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit';
        timeout?: number;
        referer?: string;
    }): Promise<{
        success: boolean;
        title?: string;
        url?: string;
        error?: string;
    }>;
    click(sessionId: string, selector: string, options?: {
        button?: 'left' | 'right' | 'middle';
        clickCount?: number;
        delay?: number;
        force?: boolean;
        timeout?: number;
    }): Promise<{
        success: boolean;
        error?: string;
    }>;
    doubleClick(sessionId: string, selector: string, options?: {
        delay?: number;
        force?: boolean;
        timeout?: number;
    }): Promise<{
        success: boolean;
        error?: string;
    }>;
    rightClick(sessionId: string, selector: string, options?: {
        force?: boolean;
        timeout?: number;
    }): Promise<{
        success: boolean;
        error?: string;
    }>;
    hover(sessionId: string, selector: string, options?: {
        force?: boolean;
        timeout?: number;
    }): Promise<{
        success: boolean;
        error?: string;
    }>;
    dragAndDrop(sessionId: string, sourceSelector: string, targetSelector: string, options?: {
        timeout?: number;
    }): Promise<{
        success: boolean;
        error?: string;
    }>;
    type(sessionId: string, selector: string, text: string, options?: {
        delay?: number;
        timeout?: number;
    }): Promise<{
        success: boolean;
        error?: string;
    }>;
    fill(sessionId: string, selector: string, value: string, options?: {
        timeout?: number;
    }): Promise<{
        success: boolean;
        error?: string;
    }>;
    press(sessionId: string, selector: string, key: string, options?: {
        delay?: number;
        timeout?: number;
    }): Promise<{
        success: boolean;
        error?: string;
    }>;
    clear(sessionId: string, selector: string, options?: {
        timeout?: number;
    }): Promise<{
        success: boolean;
        error?: string;
    }>;
    uploadFile(sessionId: string, selector: string, filePath: string): Promise<{
        success: boolean;
        error?: string;
    }>;
    submitForm(sessionId: string, formSelector: string): Promise<{
        success: boolean;
        error?: string;
    }>;
    fillForm(sessionId: string, formData: FormData): Promise<{
        success: boolean;
        filled: string[];
        errors: string[];
    }>;
    getText(sessionId: string, selector: string, options?: {
        timeout?: number;
    }): Promise<{
        success: boolean;
        text?: string;
        error?: string;
    }>;
    getAttribute(sessionId: string, selector: string, attribute: string, options?: {
        timeout?: number;
    }): Promise<{
        success: boolean;
        value?: string;
        error?: string;
    }>;
    getProperty(sessionId: string, selector: string, property: string, options?: {
        timeout?: number;
    }): Promise<{
        success: boolean;
        value?: any;
        error?: string;
    }>;
    countElements(sessionId: string, selector: string): Promise<{
        success: boolean;
        count?: number;
        error?: string;
    }>;
    exists(sessionId: string, selector: string): Promise<{
        success: boolean;
        exists?: boolean;
        error?: string;
    }>;
    isVisible(sessionId: string, selector: string): Promise<{
        success: boolean;
        visible?: boolean;
        error?: string;
    }>;
    waitForSelector(sessionId: string, selector: string, options?: {
        timeout?: number;
        state?: 'attached' | 'detached' | 'visible' | 'hidden';
    }): Promise<{
        success: boolean;
        error?: string;
    }>;
    waitForTimeout(sessionId: string, milliseconds: number): Promise<void>;
    waitForNavigation(sessionId: string, options?: {
        timeout?: number;
        waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit';
    }): Promise<{
        success: boolean;
        url?: string;
        error?: string;
    }>;
    waitForResponse(sessionId: string, urlPattern: string | RegExp, options?: {
        timeout?: number;
    }): Promise<{
        success: boolean;
        response?: any;
        error?: string;
    }>;
    screenshot(sessionId: string, options?: {
        fullPage?: boolean;
        clip?: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
        quality?: number;
        format?: 'png' | 'jpeg' | 'webp';
        path?: string;
    }): Promise<{
        success: boolean;
        data?: string;
        path?: string;
        error?: string;
    }>;
    pdf(sessionId: string, options?: {
        format?: 'Letter' | 'Legal' | 'Tabloid' | 'Ledger' | 'A4' | 'A3' | 'A5' | 'A6';
        landscape?: boolean;
        printBackground?: boolean;
        scale?: number;
        path?: string;
    }): Promise<{
        success: boolean;
        data?: string;
        path?: string;
        error?: string;
    }>;
    evaluate(sessionId: string, script: string): Promise<{
        success: boolean;
        result?: any;
        error?: string;
    }>;
    evaluateAsync(sessionId: string, script: string, timeout?: number): Promise<{
        success: boolean;
        result?: any;
        error?: string;
    }>;
    setViewport(sessionId: string, viewport: {
        width: number;
        height: number;
    }): Promise<void>;
    setUserAgent(sessionId: string, userAgent: string): Promise<void>;
    addCookie(sessionId: string, cookie: Cookie): Promise<void>;
    deleteCookies(sessionId: string, cookies?: Cookie[]): Promise<void>;
    getCookies(sessionId: string): Promise<Cookie[]>;
    saveState(sessionId: string, statePath: string): Promise<void>;
    loadState(sessionId: string, statePath: string): Promise<void>;
    enableNetworkInterception(sessionId: string): Promise<void>;
    disableNetworkInterception(sessionId: string): Promise<void>;
    mockRequest(sessionId: string, rule: MockRule): Promise<void>;
    clearMocks(sessionId: string): Promise<void>;
    getConsoleLogs(sessionId: string): Promise<Array<{
        type: string;
        text: string;
        timestamp: Date;
    }>>;
    getPageErrors(sessionId: string): Promise<string[]>;
    extractData(sessionId: string, config: DataExtractionConfig): Promise<{
        success: boolean;
        data?: Record<string, any>;
        error?: string;
    }>;
    getAccessibilityTree(sessionId: string): Promise<any>;
    recordVideo(sessionId: string, outputPath: string): Promise<void>;
    stopRecording(sessionId: string): Promise<string | null>;
    executeJavaScript<T = any>(sessionId: string, script: string): Promise<T>;
    getCurrentUrl(sessionId: string): Promise<string>;
    getTitle(sessionId: string): Promise<string>;
    getPageContent(sessionId: string): Promise<string>;
    goBack(sessionId: string): Promise<void>;
    goForward(sessionId: string): Promise<void>;
    reload(sessionId: string): Promise<void>;
    private updateSessionActivity;
    getActiveSessions(): BrowserSession[];
    getSessionStats(): {
        totalSessions: number;
        browsers: Record<string, number>;
    };
}
export declare const browserAutomation: EnhancedBrowserAutomation;
//# sourceMappingURL=browser-advanced.d.ts.map