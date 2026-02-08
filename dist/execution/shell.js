import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
export class ShellExecutor {
    allowedCommands = new Set();
    blockedCommands = new Set(['rm', 'del', 'format', 'mkfs', 'dd', 'shred', 'wget', 'curl', 'nc']);
    shellInterpreters = new Set(['bash', 'sh', 'zsh', 'cmd', 'powershell', 'pwsh', 'node', 'python', 'perl', 'ruby']);
    maxOutputSize = 1024 * 1024;
    defaultTimeout = 30000;
    constructor(options = {}) {
        if (options.allowedCommands) {
            options.allowedCommands.forEach((cmd) => this.allowedCommands.add(cmd));
        }
        if (options.blockedCommands) {
            options.blockedCommands.forEach((cmd) => this.blockedCommands.add(cmd));
        }
        if (options.maxOutputSize) {
            this.maxOutputSize = options.maxOutputSize;
        }
        if (options.defaultTimeout) {
            this.defaultTimeout = options.defaultTimeout;
        }
    }
    isCommandAllowed(command) {
        const baseCommand = command.split(' ')[0].toLowerCase().trim();
        if (this.blockedCommands.has(baseCommand)) {
            return false;
        }
        if (this.allowedCommands.size > 0 && !this.allowedCommands.has(baseCommand)) {
            return false;
        }
        return true;
    }
    areArgsAllowed(command, args) {
        const baseCommand = command.split(' ')[0].toLowerCase().trim();
        // If the command is a shell interpreter, we MUST check its arguments for dangerous sub-commands
        if (this.shellInterpreters.has(baseCommand)) {
            const joinedArgs = args.join(' ').toLowerCase();
            // Check for blocked commands inside the arguments
            for (const blocked of this.blockedCommands) {
                // Simple heuristic: check if the blocked command appears as a word
                // This is not perfect but covers basic execution like "sh -c 'rm -rf'"
                // Regex looks for: start of string or whitespace + blocked command + end of string or whitespace
                const regex = new RegExp(`(^|\\s|;|&|\\|)${blocked}(\\s|$|;|&|\\|)`, 'i');
                if (regex.test(joinedArgs)) {
                    return { allowed: false, reason: `Argument contains blocked command: ${blocked}` };
                }
            }
        }
        return { allowed: true };
    }
    async execute(options) {
        const id = randomUUID();
        const startTime = Date.now();
        const { command, args = [], workingDirectory, environment, timeout = this.defaultTimeout, } = options;
        if (!this.isCommandAllowed(command)) {
            return {
                id,
                command: `${command} ${args.join(' ')}`,
                success: false,
                exitCode: -1,
                stdout: '',
                stderr: `Command "${command}" is not allowed in the allowlist/blocklist configuration`,
                duration: Date.now() - startTime,
                timestamp: new Date(),
            };
        }
        const argCheck = this.areArgsAllowed(command, args);
        if (!argCheck.allowed) {
            return {
                id,
                command: `${command} ${args.join(' ')}`,
                success: false,
                exitCode: -1,
                stdout: '',
                stderr: `Security Violation: ${argCheck.reason}`,
                duration: Date.now() - startTime,
                timestamp: new Date(),
            };
        }
        return new Promise((resolve) => {
            let stdout = '';
            let stderr = '';
            let killed = false;
            const spawnOptions = {
                cwd: workingDirectory,
                env: { ...process.env, ...environment },
                maxBuffer: this.maxOutputSize,
                encoding: 'utf8',
            };
            const childProcess = spawn(command, args, spawnOptions);
            const outputTimer = setTimeout(() => {
                killed = true;
                childProcess.kill('SIGTERM');
            }, timeout);
            childProcess.stdout?.on('data', (data) => {
                const chunk = data.toString();
                if (stdout.length + chunk.length <= this.maxOutputSize) {
                    stdout += chunk;
                }
            });
            childProcess.stderr?.on('data', (data) => {
                const chunk = data.toString();
                if (stderr.length + chunk.length <= this.maxOutputSize) {
                    stderr += chunk;
                }
            });
            childProcess.on('close', (code) => {
                clearTimeout(outputTimer);
                const duration = Date.now() - startTime;
                resolve({
                    id,
                    command: `${command} ${args.join(' ')}`,
                    success: code === 0 && !killed,
                    exitCode: code,
                    stdout: stdout.slice(0, this.maxOutputSize),
                    stderr: stderr.slice(0, this.maxOutputSize),
                    duration,
                    timestamp: new Date(),
                });
            });
            childProcess.on('error', (error) => {
                clearTimeout(outputTimer);
                const duration = Date.now() - startTime;
                resolve({
                    id,
                    command: `${command} ${args.join(' ')}`,
                    success: false,
                    exitCode: -1,
                    stdout: '',
                    stderr: error.message,
                    duration,
                    timestamp: new Date(),
                });
            });
        });
    }
    async executeScript(script, language = 'bash') {
        const command = language === 'bash' ? 'bash' : language === 'powershell' ? 'powershell' : 'cmd';
        const args = language === 'bash'
            ? ['-c', script]
            : language === 'powershell'
                ? ['-Command', script]
                : ['/C', script];
        return this.execute({
            command,
            args,
            timeout: 60000,
        });
    }
    getStatus() {
        return {
            allowedCount: this.allowedCommands.size,
            blockedCount: this.blockedCommands.size,
        };
    }
}
export const shellExecutor = new ShellExecutor();
//# sourceMappingURL=shell.js.map