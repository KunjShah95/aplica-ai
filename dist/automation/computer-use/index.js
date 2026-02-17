import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';
export class ComputerUseAgent extends EventEmitter {
    config;
    session = null;
    isRunning = false;
    browser = null;
    page = null;
    constructor(config) {
        super();
        this.config = {
            headless: config?.headless ?? true,
            browser: config?.browser || 'chromium',
            timeout: config?.timeout || 30000,
            maxSteps: config?.maxSteps || 100,
            screenshotInterval: config?.screenshotInterval || 1000,
        };
    }
    async start() {
        if (this.isRunning) {
            throw new Error('Computer use agent already running');
        }
        try {
            const { chromium } = await import('playwright');
            this.browser = await chromium.launch({
                headless: this.config.headless,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            });
            this.page = await this.browser.newPage({
                viewport: { width: 1280, height: 720 },
            });
            this.isRunning = true;
            console.log('Computer use agent started');
            this.emit('started');
        }
        catch (error) {
            console.error('Failed to start computer use agent:', error);
            throw error;
        }
    }
    async stop() {
        if (!this.isRunning)
            return;
        if (this.page) {
            await this.page.close();
            this.page = null;
        }
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
        this.isRunning = false;
        console.log('Computer use agent stopped');
        this.emit('stopped');
    }
    async executeTask(instructions, onStep) {
        if (!this.isRunning) {
            throw new Error('Computer use agent not started');
        }
        this.session = {
            id: randomUUID(),
            status: 'running',
            currentStep: 0,
            totalSteps: 0,
            steps: [],
            startedAt: new Date(),
        };
        this.emit('task:started', this.session);
        try {
            const actions = await this.planActions(instructions);
            this.session.totalSteps = actions.length;
            for (const action of actions) {
                if (this.session.currentStep >= (this.config.maxSteps || 100)) {
                    break;
                }
                const step = await this.executeAction(action);
                this.session.steps.push(step);
                this.session.currentStep++;
                if (onStep) {
                    onStep(step);
                }
                this.emit('step:completed', step);
                if (step.error) {
                    this.session.status = 'failed';
                    this.session.error = step.error;
                    break;
                }
            }
            if (this.session.status === 'running') {
                this.session.status = 'completed';
                this.session.completedAt = new Date();
            }
        }
        catch (error) {
            this.session.status = 'failed';
            this.session.error = error instanceof Error ? error.message : 'Unknown error';
        }
        this.emit('task:completed', this.session);
        return this.session;
    }
    async planActions(instructions) {
        const actions = [];
        const urlMatch = instructions.match(/(https?:\/\/[^\s]+)/);
        if (urlMatch) {
            actions.push({
                type: 'goto',
                params: { url: urlMatch[1] },
            });
        }
        const clickMatch = instructions.match(/click (?:on )?["']?([^"']+)["']?/i);
        if (clickMatch) {
            actions.push({
                type: 'mouse_click',
                params: { selector: clickMatch[1] },
            });
        }
        const typeMatch = instructions.match(/type ["']([^"']+)["']/i);
        if (typeMatch) {
            actions.push({
                type: 'type',
                params: { text: typeMatch[1] },
            });
        }
        const scrollMatch = instructions.match(/scroll (up|down)/i);
        if (scrollMatch) {
            actions.push({
                type: 'scroll',
                params: { direction: scrollMatch[1].toLowerCase() },
            });
        }
        if (!urlMatch && !clickMatch && !typeMatch) {
            actions.push({
                type: 'screenshot',
                params: {},
            });
        }
        return actions;
    }
    async executeAction(action) {
        const step = {
            id: randomUUID(),
            action,
            duration: 0,
            timestamp: new Date(),
        };
        const startTime = Date.now();
        try {
            switch (action.type) {
                case 'goto':
                    await this.page.goto(action.params.url, {
                        waitUntil: 'networkidle',
                        timeout: this.config.timeout,
                    });
                    step.result = `Navigated to ${action.params.url}`;
                    break;
                case 'mouse_click':
                    const selector = action.params.selector;
                    await this.page.click(selector, { timeout: this.config.timeout });
                    step.result = `Clicked on ${selector}`;
                    break;
                case 'mouse_double_click':
                    await this.page.dblclick(action.params.selector);
                    step.result = `Double-clicked`;
                    break;
                case 'mouse_right_click':
                    await this.page.click(action.params.selector, { button: 'right' });
                    step.result = `Right-clicked`;
                    break;
                case 'type':
                    await this.page.keyboard.type(action.params.text, {
                        delay: 50,
                    });
                    step.result = `Typed: ${action.params.text}`;
                    break;
                case 'keypress':
                    await this.page.keyboard.press(action.params.key);
                    step.result = `Pressed: ${action.params.key}`;
                    break;
                case 'key_combo':
                    const keys = action.params.keys.join('+');
                    await this.page.keyboard.press(keys);
                    step.result = `Pressed combo: ${keys}`;
                    break;
                case 'scroll':
                    const direction = action.params.direction === 'up' ? -1 : 1;
                    await this.page.mouse.wheel(0, direction * 500);
                    step.result = `Scrolled ${action.params.direction}`;
                    break;
                case 'screenshot':
                    const screenshot = await this.page.screenshot({
                        encoding: 'base64',
                    });
                    step.screenshot = screenshot;
                    step.result = 'Screenshot captured';
                    break;
                case 'wait':
                    await this.page.waitForTimeout(action.params.duration || 1000);
                    step.result = `Waited ${action.params.duration || 1000}ms`;
                    break;
                case 'mouse_move':
                    await this.page.mouse.move(action.params.x, action.params.y);
                    step.result = 'Mouse moved';
                    break;
                case 'mouse_drag':
                    await this.page.mouse.move(action.params.startX, action.params.startY);
                    await this.page.mouse.down();
                    await this.page.mouse.move(action.params.endX, action.params.endY);
                    await this.page.mouse.up();
                    step.result = 'Dragged mouse';
                    break;
                case 'execute':
                    const result = await this.page.evaluate(action.params.script);
                    step.result = `Executed: ${result}`;
                    break;
                default:
                    step.error = `Unknown action type: ${action.type}`;
            }
        }
        catch (error) {
            step.error = error instanceof Error ? error.message : 'Action failed';
        }
        step.duration = Date.now() - startTime;
        if (!step.screenshot && action.type !== 'screenshot') {
            step.screenshot = await this.page.screenshot({ encoding: 'base64' });
        }
        return step;
    }
    async getBrowserState() {
        if (!this.page)
            return null;
        const url = this.page.url();
        const title = await this.page.title();
        const elements = await this.page.evaluate(() => {
            const getElements = () => {
                const items = [];
                const interactable = document.querySelectorAll('button, input, select, textarea, a[href]');
                interactable.forEach((el, i) => {
                    const rect = el.getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0) {
                        items.push({
                            id: `el-${i}`,
                            type: el.tagName.toLowerCase(),
                            text: el.innerText?.substring(0, 50),
                            x: Math.round(rect.x),
                            y: Math.round(rect.y),
                            width: Math.round(rect.width),
                            height: Math.round(rect.height),
                            clickable: el.tagName === 'BUTTON' || el.getAttribute('onclick') !== null,
                            inputable: ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName),
                            visible: rect.width > 0 && rect.height > 0,
                        });
                    }
                });
                return items;
            };
            return getElements();
        });
        return {
            url,
            title,
            viewport: { width: 1280, height: 720 },
            elements,
        };
    }
    async takeScreenshot() {
        if (!this.page) {
            throw new Error('Browser not initialized');
        }
        return this.page.screenshot({ encoding: 'base64' });
    }
    async navigate(url) {
        if (!this.page) {
            throw new Error('Browser not initialized');
        }
        await this.page.goto(url, { waitUntil: 'networkidle' });
    }
    async click(selector) {
        if (!this.page) {
            throw new Error('Browser not initialized');
        }
        await this.page.click(selector);
    }
    async type(selector, text) {
        if (!this.page) {
            throw new Error('Browser not initialized');
        }
        await this.page.fill(selector, text);
    }
    async getText(selector) {
        if (!this.page) {
            throw new Error('Browser not initialized');
        }
        return this.page.textContent(selector);
    }
    async waitForSelector(selector, timeout) {
        if (!this.page) {
            throw new Error('Browser not initialized');
        }
        await this.page.waitForSelector(selector, { timeout: timeout || this.config.timeout });
    }
    getSession() {
        return this.session;
    }
    isActive() {
        return this.isRunning;
    }
}
export const computerUseAgent = new ComputerUseAgent();
//# sourceMappingURL=index.js.map