import { EventEmitter } from 'events';
export interface ComputerUseConfig {
    headless?: boolean;
    browser?: 'chromium' | 'firefox' | 'webkit';
    timeout?: number;
    maxSteps?: number;
    screenshotInterval?: number;
}
export interface Action {
    type: 'mouse_move' | 'mouse_click' | 'mouse_double_click' | 'mouse_right_click' | 'mouse_drag' | 'keypress' | 'key_combo' | 'type' | 'scroll' | 'screenshot' | 'wait' | 'goto' | 'execute';
    params: Record<string, unknown>;
}
export interface Step {
    id: string;
    action: Action;
    screenshot?: string;
    result?: string;
    error?: string;
    duration: number;
    timestamp: Date;
}
export interface ComputerUseSession {
    id: string;
    status: 'initializing' | 'running' | 'paused' | 'completed' | 'failed';
    currentStep: number;
    totalSteps: number;
    steps: Step[];
    startedAt: Date;
    completedAt?: Date;
    error?: string;
}
export interface BrowserState {
    url: string;
    title: string;
    viewport: {
        width: number;
        height: number;
    };
    elements: UIElement[];
}
export interface UIElement {
    id: string;
    type: string;
    text?: string;
    x: number;
    y: number;
    width: number;
    height: number;
    clickable: boolean;
    inputable: boolean;
    visible: boolean;
}
export declare class ComputerUseAgent extends EventEmitter {
    private config;
    private session;
    private isRunning;
    private browser;
    private page;
    constructor(config?: Partial<ComputerUseConfig>);
    start(): Promise<void>;
    stop(): Promise<void>;
    executeTask(instructions: string, onStep?: (step: Step) => void): Promise<ComputerUseSession>;
    private planActions;
    private executeAction;
    getBrowserState(): Promise<BrowserState | null>;
    takeScreenshot(): Promise<string>;
    navigate(url: string): Promise<void>;
    click(selector: string): Promise<void>;
    type(selector: string, text: string): Promise<void>;
    getText(selector: string): Promise<string>;
    waitForSelector(selector: string, timeout?: number): Promise<void>;
    getSession(): ComputerUseSession | null;
    isActive(): boolean;
}
export declare const computerUseAgent: ComputerUseAgent;
//# sourceMappingURL=index.d.ts.map