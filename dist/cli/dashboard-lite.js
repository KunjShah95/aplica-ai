import * as os from 'os';
import chalk from 'chalk';
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
class AdvancedDashboard {
    width;
    height;
    frames = 0;
    isRunning = true;
    refreshRate = 80;
    // Data Stores
    logs = [];
    cpuHistory = [];
    memHistory = [];
    agents = [];
    inputBuffer = '';
    constructor() {
        this.width = process.stdout.columns || 100;
        this.height = process.stdout.rows || 30;
        // Seed initial data
        this.agents = [
            { id: '1', role: 'Orchestrator', status: 'EXECUTING', currentTask: 'Monitoring system events', progress: 0 },
            { id: '2', role: 'SecurityGuard', status: 'IDLE', currentTask: 'Awaiting signals', progress: 0 },
            { id: '3', role: 'ResearchAgent', status: 'THINKING', currentTask: 'Analyzing "Future of AI"', progress: 45 }
        ];
        this.cpuHistory = new Array(40).fill(0);
        this.memHistory = new Array(40).fill(0);
        process.stdout.on('resize', () => {
            this.width = process.stdout.columns || 100;
            this.height = process.stdout.rows || 30;
        });
        // Setup Readline for Input Overlay
        // We use Raw Mode for keypress handling to build our own input line
        if (process.stdin.isTTY) {
            process.stdin.setRawMode(true);
            process.stdin.resume();
            process.stdin.setEncoding('utf8');
            process.stdin.on('data', this.handleInput.bind(this));
        }
    }
    handleInput(key) {
        if (key === '\u0003') { // Ctrl+C
            this.stop();
            process.exit();
        }
        else if (key === '\r' || key === '\n') { // Enter
            if (this.inputBuffer.trim()) {
                this.processUserCommand(this.inputBuffer.trim());
                this.inputBuffer = '';
            }
        }
        else if (key === '\u007F' || key === '\b') { // Backspace
            this.inputBuffer = this.inputBuffer.slice(0, -1);
        }
        else {
            // Filter non-printable
            if (/^[\x20-\x7E]$/.test(key)) {
                this.inputBuffer += key;
            }
        }
    }
    async processUserCommand(cmd) {
        this.log('USER', cmd, 'USER_QUERY');
        // Simulate "Thinking" agent
        const agent = this.agents.find(a => a.role === 'Orchestrator');
        if (agent) {
            agent.status = 'THINKING';
            agent.currentTask = `Processing: "${cmd.slice(0, 20)}..."`;
            agent.progress = 10;
        }
        setTimeout(() => {
            // Mock Response Logic since DB is offline
            let response = "I'm sorry, I can't do that right now.";
            if (cmd.toLowerCase().includes('status'))
                response = "System is online and running optimally.";
            else if (cmd.toLowerCase().includes('analysis'))
                response = "Running deep analysis... (simulated)";
            else if (cmd.toLowerCase().includes('hello'))
                response = "Hello! I am Alpicia v2.1. How can I assist you?";
            else
                response = `Command received: "${cmd}". Agent is working on it.`;
            if (agent) {
                agent.status = 'IDLE';
                agent.progress = 0;
                agent.currentTask = 'Task completed';
            }
            this.log('ALPICIA', response, 'BOT_RESPONSE');
        }, 1500);
    }
    async start() {
        process.stdout.write(CLEAR_SCREEN);
        process.stdout.write(HIDE_CURSOR);
        this.log('SYSTEM', 'Dashboard Initialized v2.1', 'SUCCESS');
        this.log('NETWORK', 'Connected to Neural Grid', 'INFO');
        this.log('ALPICIA', 'Ready for input. Type below.', 'BOT_RESPONSE');
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
    log(source, message, level = 'INFO') {
        const time = new Date().toLocaleTimeString('en-US', { hour12: false });
        this.logs.push({ time, source, message, level });
        // Keep more history for chat
        if (this.logs.length > 200)
            this.logs.shift();
    }
    // --- LOGIC ---
    updateState() {
        // Simulating data updates for the viral demo visual
        const cpuLoad = os.loadavg()[0] * 10;
        this.cpuHistory.push(Math.min(100, Math.max(0, cpuLoad + Math.random() * 10)));
        this.cpuHistory.shift();
        const memUsage = (os.totalmem() - os.freemem()) / os.totalmem() * 100;
        this.memHistory.push(memUsage);
        this.memHistory.shift();
        this.agents.forEach(a => {
            if (a.status === 'THINKING' || a.status === 'EXECUTING') {
                a.progress += Math.random() * 5;
                if (a.progress >= 100 && a.role !== 'Orchestrator') { // Orchestrator controlled by input mostly
                    a.progress = 0;
                    a.status = Math.random() > 0.7 ? 'IDLE' : 'THINKING';
                }
            }
        });
    }
    // --- RENDERERS ---
    render() {
        const { width, height } = this;
        let buf = '';
        // Layout Config
        const headerHeight = 3;
        const footerHeight = 3; // Input area
        const mainHeight = height - headerHeight - footerHeight;
        const col1Width = Math.floor(width * 0.30); // Sidebar
        const col2Width = width - col1Width - 3; // Chat/Logs
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
    renderHeader(w) {
        const title = ' ALPICIA // NEURAL INTERFACE ';
        const line = chalk.cyan(BOX.H.repeat(w));
        const padding = Math.floor((w - title.length) / 2);
        const titleLine = ' '.repeat(padding) + chalk.bold.cyan(title) + ' '.repeat(w - padding - title.length);
        return `${line}\n${titleLine}\n${line}\n`;
    }
    renderInputArea(w) {
        const prompt = 'CMD > ';
        const inputWidth = w - prompt.length - 2;
        const inputDisplay = this.inputBuffer.slice(-inputWidth); // scroll right
        const cursorValues = (this.frames % 10 < 5) ? '█' : ' ';
        const line = chalk.white(BOX.H.repeat(w));
        const inputLine = chalk.green(prompt) + chalk.white(inputDisplay) + cursorValues;
        return `${line}\n${inputLine}${' '.repeat(Math.max(0, w - this.stripAnsi(inputLine).length))}\n`;
    }
    renderAgentsPanel(w, h) {
        const lines = [];
        lines.push(chalk.bold(' AGENT SWARM '));
        lines.push(chalk.gray(BOX.H.repeat(w)));
        this.agents.forEach(agent => {
            const statusColor = agent.status === 'IDLE' ? chalk.gray : agent.status === 'EXECUTING' ? chalk.green : chalk.yellow;
            const role = agent.role.padEnd(15).slice(0, 15);
            lines.push(`${statusColor('●')} ${chalk.bold(role)}`);
            lines.push(`  [${agent.status}]`);
            lines.push(`  ${chalk.dim(agent.currentTask.slice(0, w - 4))}`);
            if (agent.status !== 'IDLE') {
                const barW = w - 6;
                const filled = Math.floor((agent.progress / 100) * barW);
                const bar = '━'.repeat(filled) + chalk.gray('━'.repeat(barW - filled));
                lines.push(`  └─${chalk.blue(bar)}`);
            }
            else {
                lines.push('');
            }
            lines.push('');
        });
        while (lines.length < h)
            lines.push(' '.repeat(w));
        return lines.slice(0, h).map(l => l + ' '.repeat(Math.max(0, w - this.stripAnsi(l).length)));
    }
    renderSystemPanel(w, h) {
        const lines = [];
        lines.push(chalk.gray(BOX.H.repeat(w)));
        lines.push(chalk.bold(' SYSTEM METRICS '));
        lines.push(`${chalk.cyan('CPU')} ${this.renderSparkline(this.cpuHistory, w - 6)}`);
        lines.push(`${chalk.magenta('MEM')} ${this.renderSparkline(this.memHistory, w - 6)}`);
        lines.push('');
        lines.push(chalk.gray(`Mem: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(0)}MB | Uptime: ${process.uptime().toFixed(0)}s`));
        while (lines.length < h)
            lines.push(' '.repeat(w));
        return lines.slice(0, h).map(l => l + ' '.repeat(Math.max(0, w - this.stripAnsi(l).length)));
    }
    renderLogPanel(w, h) {
        const lines = [];
        lines.push(chalk.bold(' INTERACTIVE FEED '));
        lines.push(chalk.gray(BOX.H.repeat(w)));
        // Filter last N messages to fit
        // Note: Chat messages take priority visually
        const visibleLogs = this.logs.slice(-(h - 2));
        visibleLogs.forEach(entry => {
            let color = chalk.white;
            let prefixColor = chalk.gray;
            if (entry.level === 'WARN')
                color = chalk.yellow;
            if (entry.level === 'ERROR')
                color = chalk.red;
            if (entry.level === 'SUCCESS')
                color = chalk.green;
            if (entry.level === 'USER_QUERY') {
                color = chalk.cyan;
                prefixColor = chalk.cyan;
            }
            if (entry.level === 'BOT_RESPONSE') {
                color = chalk.greenBright;
                prefixColor = chalk.green;
            }
            const prefix = `[${entry.time}] ${entry.source}: `;
            // Wrap text if needed
            const msgWidth = w - prefix.length - 2;
            let msg = entry.message;
            if (msg.length > msgWidth) {
                msg = msg.slice(0, msgWidth) + '..'; // Simple truncate for performance in TUI
            }
            lines.push(`${prefixColor(prefix)}${color(msg)}`);
        });
        // Fill from top if few logs
        while (lines.length < h)
            lines.unshift('');
        return lines.slice(0, h).map(l => l + ' '.repeat(Math.max(0, w - this.stripAnsi(l).length)));
    }
    renderSparkline(data, w) {
        const chars = [' ', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
        const fitData = data.slice(-w);
        return fitData.map(val => {
            const idx = Math.floor((val / 100) * (chars.length - 1));
            return chars[idx] || chars[0];
        }).join('');
    }
    stripAnsi(str) {
        return str.replace(/\x1B\[\d+m/g, '');
    }
}
export const startDashboard = async () => {
    const dashboard = new AdvancedDashboard();
    // Simulate background traffic
    setInterval(() => {
        if (Math.random() > 0.7) {
            const sources = ['NETWORK', 'DB', 'SECURITY', 'SYSTEM'];
            const msgs = ['Heartbeat OK', 'Index optimized', 'Scan complete', 'GC running'];
            const r = Math.floor(Math.random() * sources.length);
            dashboard.log(sources[r], msgs[r], 'INFO');
        }
    }, 2000);
    await dashboard.start();
};
//# sourceMappingURL=dashboard-lite.js.map