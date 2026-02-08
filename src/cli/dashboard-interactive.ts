import * as os from 'os';
import chalk from 'chalk';
import { configLoader } from '../config/loader.js';
import { createProvider } from '../core/llm/index.js';
import { createAgent, Agent } from '../core/agent.js';
import { sessionManager } from '../agents/sessions.js';
import { agentSwarm } from '../agents/swarm.js';
import { AppConfig } from '../config/types.js';
import { randomUUID } from 'crypto';

// --- TUI CONSTANTS & UTILS ---
const CORS_TOP_LEFT = '\x1B[0;0H';
const HIDE_CURSOR = '\x1B[?25l';
const SHOW_CURSOR = '\x1B[?25h';
const CLEAR_SCREEN = '\x1B[2J';

// Box Drawing Characters
const BOX = {
    TL: '╭', TR: '╮', BL: '╰', BR: '╯',
    H: '─', V: '│',
    T_DOWN: '┬', T_UP: '┴', T_LEFT: '┤', T_RIGHT: '├',
    CROSS: '┼',
    ARC_TL: '╭', ARC_TR: '╮', ARC_BL: '╰', ARC_BR: '╯'
};

// --- STATE MANAGEMENT ---
interface AgentState {
    id: string;
    role: string;
    status: 'IDLE' | 'THINKING' | 'EXECUTING' | 'WAITING';
    currentTask: string;
    progress: number;
}

interface LogEntry {
    time: string;
    source: string;
    message: string;
    level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS' | 'USER_QUERY' | 'BOT_RESPONSE' | 'SYSTEM';
}

class InteractiveDashboard {
    private width: number;
    private height: number;
    private frames: number = 0;
    private isRunning: boolean = true;
    private refreshRate: number = 80;

    // Data Stores
    private logs: LogEntry[] = [];
    private cpuHistory: number[] = [];
    private memHistory: number[] = [];
    private agents: AgentState[] = [];
    private inputBuffer: string = '';

    // Real Agent Integration
    private config: AppConfig | null = null;
    private agent: Agent | null = null;
    private conversationId: string | null = null;
    private userId: string = 'dashboard-user';

    constructor() {
        this.width = process.stdout.columns || 100;
        this.height = process.stdout.rows || 30;

        // Initialize with session manager agents
        this.syncAgentsFromSessions();

        this.cpuHistory = new Array(40).fill(0);
        this.memHistory = new Array(40).fill(0);

        process.stdout.on('resize', () => {
            this.width = process.stdout.columns || 100;
            this.height = process.stdout.rows || 30;
        });

        // Setup Readline for Input Overlay
        if (process.stdin.isTTY) {
            process.stdin.setRawMode(true);
            process.stdin.resume();
            process.stdin.setEncoding('utf8');
            process.stdin.on('data', this.handleInput.bind(this));
        }
    }

    private syncAgentsFromSessions() {
        const sessions = sessionManager.getAllSessions();
        this.agents = sessions.map(s => ({
            id: s.id,
            role: s.name,
            status: s.status === 'active' ? 'IDLE' :
                s.status === 'busy' ? 'EXECUTING' :
                    s.status === 'idle' ? 'IDLE' : 'WAITING',
            currentTask: s.status === 'idle' ? 'Awaiting tasks' : 'Ready',
            progress: 0
        }));
    }

    async initialize() {
        try {
            this.log('SYSTEM', 'Loading configuration...', 'INFO');
            this.config = await configLoader.load();

            const llm = createProvider(this.config.llm);

            if (!llm.isAvailable()) {
                this.log('ERROR', 'LLM provider not available. Check API keys in .env', 'ERROR');
                this.log('SYSTEM', 'Running in limited mode (no AI responses)', 'WARN');
            } else {
                this.agent = createAgent(this.config, llm);
                const result = await this.agent.startConversation(this.userId, 'cli');
                this.conversationId = result.conversationId;
                this.log('SUCCESS', 'AI Agent initialized successfully', 'SUCCESS');
            }

            // Register swarm agents
            this.registerSwarmAgents();

            this.log('SYSTEM', 'Dashboard ready. Type /help for commands', 'SUCCESS');
        } catch (error) {
            this.log('ERROR', `Initialization failed: ${error instanceof Error ? error.message : String(error)}`, 'ERROR');
            this.log('SYSTEM', 'Running in offline mode', 'WARN');
        }
    }

    private registerSwarmAgents() {
        agentSwarm.registerAgent({
            id: 'orchestrator',
            name: 'Orchestrator',
            role: 'coordinator',
            capabilities: ['task_management', 'coordination', 'planning'],
            priority: 10
        });

        agentSwarm.registerAgent({
            id: 'researcher',
            name: 'Research Agent',
            role: 'researcher',
            capabilities: ['research', 'analysis', 'web_search'],
            priority: 5
        });

        agentSwarm.registerAgent({
            id: 'executor',
            name: 'Executor',
            role: 'executor',
            capabilities: ['code_execution', 'file_ops', 'shell'],
            priority: 7
        });
    }

    private handleInput(key: string) {
        if (key === '\u0003') { // Ctrl+C
            this.stop();
            process.exit();
        } else if (key === '\r' || key === '\n') { // Enter
            if (this.inputBuffer.trim()) {
                this.processUserCommand(this.inputBuffer.trim());
                this.inputBuffer = '';
            }
        } else if (key === '\u007F' || key === '\b') { // Backspace
            this.inputBuffer = this.inputBuffer.slice(0, -1);
        } else {
            // Filter non-printable
            if (/^[\x20-\x7E]$/.test(key)) {
                this.inputBuffer += key;
            }
        }
    }

    private async processUserCommand(cmd: string) {
        this.log('USER', cmd, 'USER_QUERY');

        // Command routing
        if (cmd.startsWith('/')) {
            await this.handleSlashCommand(cmd);
        } else {
            // Natural language query to AI agent
            await this.handleAIQuery(cmd);
        }
    }

    private async handleSlashCommand(cmd: string) {
        const parts = cmd.slice(1).split(' ');
        const command = parts[0].toLowerCase();
        const args = parts.slice(1);

        const orchestrator = this.agents.find(a => a.id === 'main' || a.role.includes('Orchestrator'));
        if (orchestrator) {
            orchestrator.status = 'EXECUTING';
            orchestrator.currentTask = `Executing: ${command}`;
        }

        try {
            switch (command) {
                case 'help':
                    this.showHelp();
                    break;

                case 'status':
                    this.showSystemStatus();
                    break;

                case 'agents':
                    this.showAgents();
                    break;

                case 'sessions':
                    this.showSessions();
                    break;

                case 'spawn':
                    await this.spawnAgent(args);
                    break;

                case 'task':
                    await this.createTask(args);
                    break;

                case 'read':
                    await this.readFile(args[0]);
                    break;

                case 'write':
                    await this.writeFile(args[0], args.slice(1).join(' '));
                    break;

                case 'ls':
                    await this.listDirectory(args[0] || '.');
                    break;

                case 'exec':
                    await this.executeShell(args.join(' '));
                    break;

                case 'search':
                    await this.searchWeb(args.join(' '));
                    break;

                case 'clear':
                    this.logs = [];
                    this.log('SYSTEM', 'Log cleared', 'INFO');
                    break;

                case 'stats':
                    this.showSwarmStats();
                    break;

                default:
                    this.log('ERROR', `Unknown command: /${command}. Type /help for available commands`, 'ERROR');
            }
        } catch (error) {
            this.log('ERROR', `Command failed: ${error instanceof Error ? error.message : String(error)}`, 'ERROR');
        } finally {
            if (orchestrator) {
                orchestrator.status = 'IDLE';
                orchestrator.currentTask = 'Task completed';
                orchestrator.progress = 0;
            }
        }
    }

    private async handleAIQuery(query: string) {
        if (!this.agent || !this.conversationId) {
            this.log('ALPICIA', 'AI agent not available. Use slash commands (type /help)', 'WARN');
            return;
        }

        const agent = this.agents.find(a => a.id === 'main' || a.role.includes('Main'));
        if (agent) {
            agent.status = 'THINKING';
            agent.currentTask = `Processing: "${query.slice(0, 30)}..."`;
            agent.progress = 10;
        }

        try {
            const response = await this.agent.processMessage(query, this.conversationId, this.userId, 'cli');

            if (agent) {
                agent.status = 'IDLE';
                agent.currentTask = 'Ready';
                agent.progress = 0;
            }

            this.log('ALPICIA', response.message, 'BOT_RESPONSE');
            this.log('SYSTEM', `Tokens used: ${response.tokensUsed}`, 'INFO');
        } catch (error) {
            if (agent) {
                agent.status = 'IDLE';
                agent.currentTask = 'Error occurred';
                agent.progress = 0;
            }
            this.log('ERROR', `AI query failed: ${error instanceof Error ? error.message : String(error)}`, 'ERROR');
        }
    }

    private showHelp() {
        const help = `
╔═══════════════════════════════════════════════════════════════╗
║                    ALPICIA COMMAND REFERENCE                  ║
╠═══════════════════════════════════════════════════════════════╣
║ AI INTERACTION                                                ║
║   <message>          - Chat with AI agent                     ║
║                                                                ║
║ SYSTEM COMMANDS                                               ║
║   /help              - Show this help                         ║
║   /status            - Show system status                     ║
║   /agents            - List all agents                        ║
║   /sessions          - Show agent sessions                    ║
║   /stats             - Show swarm statistics                  ║
║   /clear             - Clear log                              ║
║                                                                ║
║ AGENT MANAGEMENT                                              ║
║   /spawn <type>      - Spawn new agent (researcher/executor)  ║
║   /task <type> <msg> - Create swarm task                      ║
║                                                                ║
║ FILE OPERATIONS                                               ║
║   /read <path>       - Read file                              ║
║   /write <path> <txt>- Write to file                          ║
║   /ls [path]         - List directory                         ║
║                                                                ║
║ EXECUTION                                                     ║
║   /exec <command>    - Execute shell command                  ║
║   /search <query>    - Web search (simulated)                 ║
╚═══════════════════════════════════════════════════════════════╝`;

        help.split('\n').forEach(line => {
            this.log('HELP', line, 'INFO');
        });
    }

    private showSystemStatus() {
        const stats = sessionManager.getStats();
        this.log('STATUS', `═══ SYSTEM STATUS ═══`, 'SUCCESS');
        this.log('STATUS', `Sessions: ${stats.total} (Active: ${stats.active}, Idle: ${stats.idle}, Busy: ${stats.busy})`, 'INFO');
        this.log('STATUS', `Pending Messages: ${stats.pendingMessages}`, 'INFO');
        this.log('STATUS', `Memory: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, 'INFO');
        this.log('STATUS', `Uptime: ${process.uptime().toFixed(0)}s`, 'INFO');
        this.log('STATUS', `AI Agent: ${this.agent ? 'Connected' : 'Offline'}`, this.agent ? 'SUCCESS' : 'WARN');
    }

    private showAgents() {
        this.log('AGENTS', `═══ REGISTERED AGENTS ═══`, 'SUCCESS');
        const swarmAgents = agentSwarm.getAllAgents();
        swarmAgents.forEach(agent => {
            this.log('AGENTS', `[${agent.id}] ${agent.name} - ${agent.role}`, 'INFO');
            this.log('AGENTS', `  Capabilities: ${agent.capabilities.join(', ')}`, 'INFO');
        });
    }

    private showSessions() {
        this.log('SESSIONS', `═══ ACTIVE SESSIONS ═══`, 'SUCCESS');
        const sessions = sessionManager.getActiveSessions();
        sessions.forEach(session => {
            this.log('SESSIONS', `[${session.id}] ${session.name} - ${session.type} (${session.status})`, 'INFO');
            this.log('SESSIONS', `  Tools: ${session.metadata.tools.join(', ')}`, 'INFO');
        });
    }

    private showSwarmStats() {
        const stats = agentSwarm.getStats();
        this.log('STATS', `═══ SWARM STATISTICS ═══`, 'SUCCESS');
        this.log('STATS', `Total Agents: ${stats.totalAgents}`, 'INFO');
        this.log('STATS', `Active Tasks: ${stats.activeTasks}`, 'INFO');
        this.log('STATS', `Completed: ${stats.completedTasks}`, 'SUCCESS');
        this.log('STATS', `Failed: ${stats.failedTasks}`, stats.failedTasks > 0 ? 'WARN' : 'INFO');
        this.log('STATS', `Avg Response Time: ${stats.avgResponseTime.toFixed(2)}ms`, 'INFO');
    }

    private async spawnAgent(args: string[]) {
        const type = args[0] || 'custom';
        const validTypes = ['researcher', 'executor', 'analyst', 'creative', 'custom'];

        if (!validTypes.includes(type)) {
            this.log('ERROR', `Invalid agent type. Valid: ${validTypes.join(', ')}`, 'ERROR');
            return;
        }

        const agentId = `agent-${randomUUID().slice(0, 8)}`;
        const session = sessionManager.createSession(
            agentId,
            `${type.charAt(0).toUpperCase() + type.slice(1)} Agent`,
            type as any,
            {
                capabilities: [type, 'communication'],
                tools: ['shell', 'filesystem']
            }
        );

        this.syncAgentsFromSessions();
        this.log('SUCCESS', `Spawned ${session.name} [${session.id}]`, 'SUCCESS');
    }

    private async createTask(args: string[]) {
        const taskType = args[0] || 'generic';
        const message = args.slice(1).join(' ') || 'No description';

        const task = await agentSwarm.submitTask({
            type: taskType,
            payload: { message },
            priority: 5
        });

        this.log('TASK', `Created task [${task.id}]: ${taskType}`, 'SUCCESS');

        // Simulate task completion
        setTimeout(() => {
            agentSwarm.completeTask(task.id, { status: 'completed', result: 'Task executed successfully' });
            this.log('TASK', `Task ${task.id} completed`, 'SUCCESS');
        }, 2000);
    }

    private async readFile(path: string) {
        if (!path) {
            this.log('ERROR', 'Usage: /read <path>', 'ERROR');
            return;
        }

        if (!this.agent) {
            this.log('ERROR', 'Agent not available for file operations', 'ERROR');
            return;
        }

        try {
            const result = await this.agent.readFile(path);
            this.log('FILE', `Read ${path}:`, 'SUCCESS');
            const content = String(result).slice(0, 200);
            this.log('FILE', content + (String(result).length > 200 ? '...' : ''), 'INFO');
        } catch (error) {
            this.log('ERROR', `Failed to read ${path}: ${error instanceof Error ? error.message : String(error)}`, 'ERROR');
        }
    }

    private async writeFile(path: string, content: string) {
        if (!path || !content) {
            this.log('ERROR', 'Usage: /write <path> <content>', 'ERROR');
            return;
        }

        if (!this.agent) {
            this.log('ERROR', 'Agent not available for file operations', 'ERROR');
            return;
        }

        try {
            await this.agent.writeFile(path, content);
            this.log('FILE', `Wrote to ${path}`, 'SUCCESS');
        } catch (error) {
            this.log('ERROR', `Failed to write ${path}: ${error instanceof Error ? error.message : String(error)}`, 'ERROR');
        }
    }

    private async listDirectory(path: string) {
        if (!this.agent) {
            this.log('ERROR', 'Agent not available for file operations', 'ERROR');
            return;
        }

        try {
            const result = await this.agent.listDirectory(path);
            this.log('FILE', `Contents of ${path}:`, 'SUCCESS');
            this.log('FILE', JSON.stringify(result, null, 2).slice(0, 300), 'INFO');
        } catch (error) {
            this.log('ERROR', `Failed to list ${path}: ${error instanceof Error ? error.message : String(error)}`, 'ERROR');
        }
    }

    private async executeShell(command: string) {
        if (!command) {
            this.log('ERROR', 'Usage: /exec <command>', 'ERROR');
            return;
        }

        if (!this.agent) {
            this.log('ERROR', 'Agent not available for shell execution', 'ERROR');
            return;
        }

        try {
            this.log('SHELL', `Executing: ${command}`, 'INFO');
            const result = await this.agent.executeShell(command);
            this.log('SHELL', String(result).slice(0, 300), 'SUCCESS');
        } catch (error) {
            this.log('ERROR', `Execution failed: ${error instanceof Error ? error.message : String(error)}`, 'ERROR');
        }
    }

    private async searchWeb(query: string) {
        if (!query) {
            this.log('ERROR', 'Usage: /search <query>', 'ERROR');
            return;
        }

        this.log('SEARCH', `Searching for: ${query}`, 'INFO');
        // Simulated search - in real implementation, would use browser automation
        setTimeout(() => {
            this.log('SEARCH', `Found results for "${query}" (simulated)`, 'SUCCESS');
            this.log('SEARCH', '1. Example result - https://example.com', 'INFO');
            this.log('SEARCH', '2. Another result - https://example.org', 'INFO');
        }, 1000);
    }

    async start() {
        process.stdout.write(CLEAR_SCREEN);
        process.stdout.write(HIDE_CURSOR);

        await this.initialize();

        while (this.isRunning) {
            this.updateState();
            const output = this.render();
            process.stdout.write(CORS_TOP_LEFT + output);
            await new Promise(r => setTimeout(r, this.refreshRate));
            this.frames++;
        }

        process.stdout.write(SHOW_CURSOR);
    }

    stop() {
        this.isRunning = false;
        process.stdout.write(SHOW_CURSOR);
        process.stdout.write('\n');
    }

    log(source: string, message: string, level: LogEntry['level'] = 'INFO') {
        const time = new Date().toLocaleTimeString('en-US', { hour12: false });
        this.logs.push({ time, source, message, level });
        if (this.logs.length > 300) this.logs.shift();
    }

    // --- LOGIC ---

    private updateState() {
        const cpuLoad = os.loadavg()[0] * 10;
        this.cpuHistory.push(Math.min(100, Math.max(0, cpuLoad + Math.random() * 5)));
        this.cpuHistory.shift();

        const memUsage = (os.totalmem() - os.freemem()) / os.totalmem() * 100;
        this.memHistory.push(memUsage);
        this.memHistory.shift();

        // Update agent progress
        this.agents.forEach(a => {
            if (a.status === 'THINKING' || a.status === 'EXECUTING') {
                a.progress = Math.min(100, a.progress + Math.random() * 8);
            }
        });

        // Sync with session manager periodically
        if (this.frames % 50 === 0) {
            this.syncAgentsFromSessions();
        }
    }

    // --- RENDERERS ---

    private render(): string {
        const { width, height } = this;
        let buf = '';

        const headerHeight = 3;
        const footerHeight = 3;
        const mainHeight = height - headerHeight - footerHeight;
        const col1Width = Math.floor(width * 0.30);
        const col2Width = width - col1Width - 3;

        // 1. Header
        buf += this.renderHeader(width);

        // 2. Main Body
        const agentPanel = this.renderAgentsPanel(col1Width, Math.floor(mainHeight * 0.6));
        const systemPanel = this.renderSystemPanel(col1Width, mainHeight - Math.floor(mainHeight * 0.6));
        const logPanel = this.renderLogPanel(col2Width, mainHeight);

        const leftColLines = [...agentPanel, ...systemPanel];
        const rightColLines = logPanel;

        for (let i = 0; i < mainHeight; i++) {
            const left = leftColLines[i] || ' '.repeat(col1Width);
            const right = rightColLines[i] || ' '.repeat(col2Width);
            buf += `${left} ${chalk.gray(BOX.V)} ${right}\n`;
        }

        // 3. Input Area (Footer)
        buf += this.renderInputArea(width);

        return buf;
    }

    private renderHeader(w: number): string {
        const title = ' ALPICIA // INTERACTIVE NEURAL INTERFACE ';
        const line = chalk.cyan(BOX.H.repeat(w));
        const padding = Math.floor((w - title.length) / 2);
        const titleLine = ' '.repeat(padding) + chalk.bold.cyan(title) + ' '.repeat(w - padding - title.length);
        return `${line}\n${titleLine}\n${line}\n`;
    }

    private renderInputArea(w: number): string {
        const prompt = 'CMD > ';
        const inputWidth = w - prompt.length - 2;
        const inputDisplay = this.inputBuffer.slice(-inputWidth);
        const cursor = (this.frames % 10 < 5) ? '█' : ' ';

        const line = chalk.white(BOX.H.repeat(w));
        const inputLine = chalk.green(prompt) + chalk.white(inputDisplay) + cursor;

        return `${line}\n${inputLine}${' '.repeat(Math.max(0, w - this.stripAnsi(inputLine).length))}\n`;
    }

    private renderAgentsPanel(w: number, h: number): string[] {
        const lines: string[] = [];
        lines.push(chalk.bold(' AGENT SWARM '));
        lines.push(chalk.gray(BOX.H.repeat(w)));

        this.agents.forEach(agent => {
            const statusColor = agent.status === 'IDLE' ? chalk.gray :
                agent.status === 'EXECUTING' ? chalk.green :
                    agent.status === 'THINKING' ? chalk.yellow : chalk.blue;
            const role = agent.role.padEnd(15).slice(0, 15);

            lines.push(`${statusColor('●')} ${chalk.bold(role)}`);
            lines.push(`  [${agent.status}]`);
            lines.push(`  ${chalk.dim(agent.currentTask.slice(0, w - 4))}`);

            if (agent.status !== 'IDLE' && agent.progress > 0) {
                const barW = w - 6;
                const filled = Math.floor((agent.progress / 100) * barW);
                const bar = '━'.repeat(filled) + chalk.gray('━'.repeat(barW - filled));
                lines.push(`  └─${chalk.blue(bar)}`);
            } else {
                lines.push('');
            }
            lines.push('');
        });

        while (lines.length < h) lines.push(' '.repeat(w));
        return lines.slice(0, h).map(l => l + ' '.repeat(Math.max(0, w - this.stripAnsi(l).length)));
    }

    private renderSystemPanel(w: number, h: number): string[] {
        const lines: string[] = [];
        lines.push(chalk.gray(BOX.H.repeat(w)));
        lines.push(chalk.bold(' SYSTEM METRICS '));

        lines.push(`${chalk.cyan('CPU')} ${this.renderSparkline(this.cpuHistory, w - 6)}`);
        lines.push(`${chalk.magenta('MEM')} ${this.renderSparkline(this.memHistory, w - 6)}`);

        lines.push('');
        lines.push(chalk.gray(`Mem: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(0)}MB | Up: ${process.uptime().toFixed(0)}s`));

        while (lines.length < h) lines.push(' '.repeat(w));
        return lines.slice(0, h).map(l => l + ' '.repeat(Math.max(0, w - this.stripAnsi(l).length)));
    }

    private renderLogPanel(w: number, h: number): string[] {
        const lines: string[] = [];
        lines.push(chalk.bold(' INTERACTIVE FEED ') + chalk.dim(' (Type /help for commands)'));
        lines.push(chalk.gray(BOX.H.repeat(w)));

        const visibleLogs = this.logs.slice(-(h - 2));

        visibleLogs.forEach(entry => {
            let color = chalk.white;
            let prefixColor = chalk.gray;

            if (entry.level === 'WARN') color = chalk.yellow;
            if (entry.level === 'ERROR') color = chalk.red;
            if (entry.level === 'SUCCESS') color = chalk.green;
            if (entry.level === 'USER_QUERY') {
                color = chalk.cyan;
                prefixColor = chalk.cyan;
            }
            if (entry.level === 'BOT_RESPONSE') {
                color = chalk.greenBright;
                prefixColor = chalk.green;
            }

            const prefix = `[${entry.time}] ${entry.source}: `;
            const msgWidth = w - this.stripAnsi(prefix).length - 2;
            let msg = entry.message;
            if (this.stripAnsi(msg).length > msgWidth) {
                msg = msg.slice(0, msgWidth) + '..';
            }

            lines.push(`${prefixColor(prefix)}${color(msg)}`);
        });

        while (lines.length < h) lines.unshift('');

        return lines.slice(0, h).map(l => l + ' '.repeat(Math.max(0, w - this.stripAnsi(l).length)));
    }

    private renderSparkline(data: number[], w: number): string {
        const chars = [' ', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
        const fitData = data.slice(-w);
        return fitData.map(val => {
            const idx = Math.floor((val / 100) * (chars.length - 1));
            return chars[idx] || chars[0];
        }).join('');
    }

    private stripAnsi(str: string): string {
        return str.replace(/\x1B\[\d+m/g, '').replace(/\x1B\[[\d;]+m/g, '');
    }
}

export const startInteractiveDashboard = async () => {
    const dashboard = new InteractiveDashboard();
    await dashboard.start();
};
