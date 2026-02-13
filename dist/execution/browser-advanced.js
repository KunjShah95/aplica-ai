import { chromium, firefox, webkit, devices, } from 'playwright';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
export class EnhancedBrowserAutomation {
    browsers = new Map();
    pages = new Map();
    sessions = new Map();
    defaultConfig;
    mockRules = new Map();
    constructor(defaultConfig = {}) {
        this.defaultConfig = {
            browser: 'chromium',
            headless: true,
            viewport: { width: 1280, height: 720 },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            timeout: 30000,
            ...defaultConfig,
        };
    }
    async createSession(config) {
        const sessionId = randomUUID();
        const cfg = { ...this.defaultConfig, ...config };
        const launchOptions = {
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
        let browserType;
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
        let contextOptions = {
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
        const session = {
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
    async setupPageListeners(pageId, page) {
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
    async getPage(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return null;
        return this.pages.get(session.pageId) || null;
    }
    async closeSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return;
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
    async closeAllSessions() {
        for (const sessionId of this.sessions.keys()) {
            await this.closeSession(sessionId);
        }
    }
    async navigate(sessionId, url, options) {
        const page = await this.getPage(sessionId);
        if (!page)
            return { success: false, error: 'Session not found' };
        try {
            await page.goto(url, {
                waitUntil: options?.waitUntil || 'domcontentloaded',
                timeout: options?.timeout || this.defaultConfig.timeout,
                referer: options?.referer,
            });
            this.updateSessionActivity(sessionId);
            return { success: true, title: await page.title(), url: page.url() };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    async click(sessionId, selector, options) {
        const page = await this.getPage(sessionId);
        if (!page)
            return { success: false, error: 'Session not found' };
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
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    async doubleClick(sessionId, selector, options) {
        return this.click(sessionId, selector, { ...options, clickCount: 2 });
    }
    async rightClick(sessionId, selector, options) {
        return this.click(sessionId, selector, { ...options, button: 'right' });
    }
    async hover(sessionId, selector, options) {
        const page = await this.getPage(sessionId);
        if (!page)
            return { success: false, error: 'Session not found' };
        try {
            await page.hover(selector, {
                force: options?.force || false,
                timeout: options?.timeout || this.defaultConfig.timeout,
            });
            this.updateSessionActivity(sessionId);
            return { success: true };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    async dragAndDrop(sessionId, sourceSelector, targetSelector, options) {
        const page = await this.getPage(sessionId);
        if (!page)
            return { success: false, error: 'Session not found' };
        try {
            await page.dragAndDrop(sourceSelector, targetSelector, {
                timeout: options?.timeout || this.defaultConfig.timeout,
            });
            this.updateSessionActivity(sessionId);
            return { success: true };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    async type(sessionId, selector, text, options) {
        const page = await this.getPage(sessionId);
        if (!page)
            return { success: false, error: 'Session not found' };
        try {
            await page.type(selector, text, {
                delay: options?.delay,
                timeout: options?.timeout || this.defaultConfig.timeout,
            });
            this.updateSessionActivity(sessionId);
            return { success: true };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    async fill(sessionId, selector, value, options) {
        const page = await this.getPage(sessionId);
        if (!page)
            return { success: false, error: 'Session not found' };
        try {
            await page.fill(selector, value, {
                timeout: options?.timeout || this.defaultConfig.timeout,
            });
            this.updateSessionActivity(sessionId);
            return { success: true };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    async press(sessionId, selector, key, options) {
        const page = await this.getPage(sessionId);
        if (!page)
            return { success: false, error: 'Session not found' };
        try {
            await page.press(selector, key, {
                delay: options?.delay,
                timeout: options?.timeout || this.defaultConfig.timeout,
            });
            this.updateSessionActivity(sessionId);
            return { success: true };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    async clear(sessionId, selector, options) {
        const page = await this.getPage(sessionId);
        if (!page)
            return { success: false, error: 'Session not found' };
        try {
            await page.fill(selector, '', {
                timeout: options?.timeout || this.defaultConfig.timeout,
            });
            this.updateSessionActivity(sessionId);
            return { success: true };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    async uploadFile(sessionId, selector, filePath) {
        const page = await this.getPage(sessionId);
        if (!page)
            return { success: false, error: 'Session not found' };
        try {
            const input = await page.locator(selector);
            await input.setInputFiles(filePath);
            this.updateSessionActivity(sessionId);
            return { success: true };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    async submitForm(sessionId, formSelector) {
        const page = await this.getPage(sessionId);
        if (!page)
            return { success: false, error: 'Session not found' };
        try {
            await page.locator(formSelector).evaluate((form) => form.submit());
            this.updateSessionActivity(sessionId);
            return { success: true };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    async fillForm(sessionId, formData) {
        const page = await this.getPage(sessionId);
        if (!page)
            return { success: false, filled: [], errors: ['Session not found'] };
        const filled = [];
        const errors = [];
        for (const [selector, value] of Object.entries(formData.fields)) {
            try {
                await page.fill(selector, value);
                filled.push(selector);
            }
            catch (error) {
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
                }
                catch (error) {
                    errors.push(`${selector}: ${error.message}`);
                }
            }
        }
        if (formData.select) {
            for (const { selector, value } of formData.select) {
                try {
                    await page.selectOption(selector, value);
                    filled.push(selector);
                }
                catch (error) {
                    errors.push(`${selector}: ${error.message}`);
                }
            }
        }
        if (formData.files) {
            for (const { selector, filePath } of formData.files) {
                try {
                    await page.locator(selector).setInputFiles(filePath);
                    filled.push(selector);
                }
                catch (error) {
                    errors.push(`${selector}: ${error.message}`);
                }
            }
        }
        this.updateSessionActivity(sessionId);
        return { success: errors.length === 0, filled, errors };
    }
    async getText(sessionId, selector, options) {
        const page = await this.getPage(sessionId);
        if (!page)
            return { success: false, error: 'Session not found' };
        try {
            const text = await page.locator(selector).textContent({
                timeout: options?.timeout || this.defaultConfig.timeout,
            });
            return { success: true, text: text || '' };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    async getAttribute(sessionId, selector, attribute, options) {
        const page = await this.getPage(sessionId);
        if (!page)
            return { success: false, error: 'Session not found' };
        try {
            const value = await page.getAttribute(selector, attribute, {
                timeout: options?.timeout || this.defaultConfig.timeout,
            });
            return { success: true, value: value || undefined };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    async getProperty(sessionId, selector, property, options) {
        const page = await this.getPage(sessionId);
        if (!page)
            return { success: false, error: 'Session not found' };
        try {
            const value = await page
                .locator(selector)
                .evaluate((el, prop) => el[prop], property, {
                timeout: options?.timeout || this.defaultConfig.timeout,
            });
            return { success: true, value };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    async countElements(sessionId, selector) {
        const page = await this.getPage(sessionId);
        if (!page)
            return { success: false, error: 'Session not found' };
        try {
            const count = await page.locator(selector).count();
            return { success: true, count };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    async exists(sessionId, selector) {
        const page = await this.getPage(sessionId);
        if (!page)
            return { success: false, error: 'Session not found' };
        try {
            const count = await page.locator(selector).count();
            return { success: true, exists: count > 0 };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    async isVisible(sessionId, selector) {
        const page = await this.getPage(sessionId);
        if (!page)
            return { success: false, error: 'Session not found' };
        try {
            const locator = page.locator(selector);
            const count = await locator.count();
            if (count === 0)
                return { success: true, visible: false };
            const visible = await locator.first().isVisible();
            return { success: true, visible };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    async waitForSelector(sessionId, selector, options) {
        const page = await this.getPage(sessionId);
        if (!page)
            return { success: false, error: 'Session not found' };
        try {
            await page.waitForSelector(selector, {
                timeout: options?.timeout || this.defaultConfig.timeout,
                state: options?.state || 'visible',
            });
            return { success: true };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    async waitForTimeout(sessionId, milliseconds) {
        const page = await this.getPage(sessionId);
        if (page) {
            await page.waitForTimeout(milliseconds);
        }
    }
    async waitForNavigation(sessionId, options) {
        const page = await this.getPage(sessionId);
        if (!page)
            return { success: false, error: 'Session not found' };
        try {
            const response = await page.waitForNavigation({
                timeout: options?.timeout || this.defaultConfig.timeout,
                waitUntil: options?.waitUntil || 'domcontentloaded',
            });
            return { success: true, url: response?.url() };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    async waitForResponse(sessionId, urlPattern, options) {
        const page = await this.getPage(sessionId);
        if (!page)
            return { success: false, error: 'Session not found' };
        try {
            const response = await page.waitForResponse(urlPattern, {
                timeout: options?.timeout || this.defaultConfig.timeout,
            });
            return { success: true, response: await response.json().catch(() => response.text()) };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    async screenshot(sessionId, options) {
        const page = await this.getPage(sessionId);
        if (!page)
            return { success: false, error: 'Session not found' };
        try {
            const screenshotOptions = {
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
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    async pdf(sessionId, options) {
        const page = await this.getPage(sessionId);
        if (!page)
            return { success: false, error: 'Session not found' };
        try {
            const pdfOptions = {
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
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    async evaluate(sessionId, script) {
        const page = await this.getPage(sessionId);
        if (!page)
            return { success: false, error: 'Session not found' };
        try {
            const result = await page.evaluate(script);
            this.updateSessionActivity(sessionId);
            return { success: true, result };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    async evaluateAsync(sessionId, script, timeout) {
        const page = await this.getPage(sessionId);
        if (!page)
            return { success: false, error: 'Session not found' };
        try {
            const timeoutMs = timeout || this.defaultConfig.timeout || 30000;
            const result = await Promise.race([
                page.evaluate(script),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Evaluation timeout')), timeoutMs))
            ]);
            this.updateSessionActivity(sessionId);
            return { success: true, result };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    async setViewport(sessionId, viewport) {
        const page = await this.getPage(sessionId);
        if (page) {
            await page.setViewportSize(viewport);
        }
    }
    async setUserAgent(sessionId, userAgent) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return;
        const context = this.browsers.get(sessionId)?.context;
        if (context) {
            await context.addCookies([]);
            const newPage = await context.newPage();
            const oldPage = this.pages.get(session.pageId);
            if (oldPage)
                await oldPage.close();
            this.pages.set(session.pageId, newPage);
            await this.setupPageListeners(session.pageId, newPage);
        }
    }
    async addCookie(sessionId, cookie) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return;
        const context = this.browsers.get(sessionId)?.context;
        if (context) {
            await context.addCookies([cookie]);
        }
    }
    async deleteCookies(sessionId, cookies) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return;
        const context = this.browsers.get(sessionId)?.context;
        if (context) {
            if (cookies) {
                // Use clearCookies with name filter for each cookie
                for (const cookie of cookies) {
                    await context.clearCookies({ name: cookie.name });
                }
            }
            else {
                await context.clearCookies();
            }
        }
    }
    async getCookies(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return [];
        const context = this.browsers.get(sessionId)?.context;
        if (context) {
            return await context.cookies();
        }
        return [];
    }
    async saveState(sessionId, statePath) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return;
        const context = this.browsers.get(sessionId)?.context;
        if (context) {
            const state = await context.storageState();
            await fs.promises.writeFile(statePath, JSON.stringify(state, null, 2));
        }
    }
    async loadState(sessionId, statePath) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return;
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
    async enableNetworkInterception(sessionId) {
        const page = await this.getPage(sessionId);
        if (page) {
            await page.route('**/*', (route) => route.continue());
        }
    }
    async disableNetworkInterception(sessionId) {
        const page = await this.getPage(sessionId);
        if (page) {
            await page.unroute('**/*');
        }
    }
    async mockRequest(sessionId, rule) {
        const page = await this.getPage(sessionId);
        if (!page)
            return;
        const pageId = sessionId;
        if (!this.mockRules.has(pageId)) {
            this.mockRules.set(pageId, []);
        }
        this.mockRules.get(pageId).push(rule);
        await page.route(rule.urlPattern, async (route) => {
            await route.fulfill({
                status: rule.response.status,
                headers: rule.response.headers,
                body: rule.response.body ||
                    (rule.response.json ? JSON.stringify(rule.response.json) : undefined),
            });
        });
    }
    async clearMocks(sessionId) {
        const page = await this.getPage(sessionId);
        if (page) {
            await page.unroute('**/*');
        }
        this.mockRules.delete(sessionId);
    }
    async getConsoleLogs(sessionId) {
        const logs = [];
        const page = await this.getPage(sessionId);
        if (page) {
            const consoleMessages = await page.evaluate(() => {
                return window.__consoleLogs || [];
            });
            return consoleMessages;
        }
        return logs;
    }
    async getPageErrors(sessionId) {
        const page = await this.getPage(sessionId);
        if (!page)
            return [];
        return await page.evaluate(() => {
            return window.__pageErrors || [];
        });
    }
    async extractData(sessionId, config) {
        const page = await this.getPage(sessionId);
        if (!page)
            return { success: false, error: 'Session not found' };
        try {
            const data = {};
            if (config.tables) {
                data.tables = {};
                for (const tableConfig of config.tables) {
                    const tables = await page.locator(tableConfig.selector).all();
                    const tableData = [];
                    for (const table of tables) {
                        const rows = await table.locator('tr').all();
                        const tableRows = [];
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
                            ? tableData.map((rows) => rows.map((cells) => Object.fromEntries(cells.map((c, i) => [`col${i}`, c]))))
                            : tableData;
                }
            }
            if (config.lists) {
                data.lists = {};
                for (const listConfig of config.lists) {
                    const lists = await page.locator(listConfig.selector).all();
                    const listData = [];
                    for (const list of lists) {
                        const items = await list.locator(listConfig.itemSelector).all();
                        const itemData = [];
                        for (const item of items) {
                            const itemFields = {};
                            for (const [field, selector] of Object.entries(listConfig.fields)) {
                                try {
                                    itemFields[field] = await item.locator(selector).textContent();
                                }
                                catch {
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
                    const linkData = [];
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
                    const imgData = [];
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
                    const textData = [];
                    for (const el of elements) {
                        if (textConfig.attribute === 'outerHTML') {
                            textData.push(await el.evaluate((e) => e.outerHTML));
                        }
                        else if (textConfig.attribute === 'innerText') {
                            textData.push(await el.innerText());
                        }
                        else {
                            textData.push(await el.textContent());
                        }
                    }
                    data.text[textConfig.selector] = textData;
                }
            }
            this.updateSessionActivity(sessionId);
            return { success: true, data };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    async getAccessibilityTree(sessionId) {
        const page = await this.getPage(sessionId);
        if (!page)
            return null;
        // Use DOM-based accessibility extraction since page.accessibility is deprecated
        return await page.evaluate(() => {
            function buildAccessibilityTree(element) {
                const role = element.getAttribute('role') || element.tagName.toLowerCase();
                const name = element.getAttribute('aria-label') ||
                    element.getAttribute('aria-labelledby') ||
                    element.innerText?.substring(0, 100) || '';
                const children = [];
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
    async recordVideo(sessionId, outputPath) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return;
        const context = this.browsers.get(sessionId)?.context;
        if (context) {
            const page = await context.newPage();
            const oldPage = this.pages.get(session.pageId);
            if (oldPage)
                await oldPage.close();
            this.pages.set(session.pageId, page);
            await this.setupPageListeners(session.pageId, page);
            await page.route('**/*', (route) => route.continue());
        }
    }
    async stopRecording(sessionId) {
        return null;
    }
    async executeJavaScript(sessionId, script) {
        const result = await this.evaluate(sessionId, script);
        if (result.success) {
            return result.result;
        }
        throw new Error(result.error);
    }
    async getCurrentUrl(sessionId) {
        const page = await this.getPage(sessionId);
        return page?.url() || '';
    }
    async getTitle(sessionId) {
        const page = await this.getPage(sessionId);
        return page?.title() || '';
    }
    async getPageContent(sessionId) {
        const page = await this.getPage(sessionId);
        return page?.content() || '';
    }
    async goBack(sessionId) {
        const page = await this.getPage(sessionId);
        if (page)
            await page.goBack();
    }
    async goForward(sessionId) {
        const page = await this.getPage(sessionId);
        if (page)
            await page.goForward();
    }
    async reload(sessionId) {
        const page = await this.getPage(sessionId);
        if (page)
            await page.reload();
    }
    updateSessionActivity(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.lastActivity = new Date();
        }
    }
    getActiveSessions() {
        return Array.from(this.sessions.values());
    }
    getSessionStats() {
        const browsers = {};
        for (const session of this.sessions.values()) {
            browsers[session.browser] = (browsers[session.browser] || 0) + 1;
        }
        return { totalSessions: this.sessions.size, browsers };
    }
}
export const browserAutomation = new EnhancedBrowserAutomation();
//# sourceMappingURL=browser-advanced.js.map