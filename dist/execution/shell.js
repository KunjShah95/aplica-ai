import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
export class ShellExecutor {
    allowedCommands = new Set();
    blockedCommands = new Set([
        'rm',
        'del',
        'erase',
        'format',
        'mkfs',
        'dd',
        'shred',
        'rmdir',
        'rd',
        'shutdown',
        'diskpart',
        'bcdedit',
        'wget',
        'curl',
        'nc',
        'sudo',
        'su',
        'chmod',
        'chown',
        'ssh',
        'scp',
        'sftp',
    ]);
    shellInterpreters = new Set([
        'bash',
        'sh',
        'zsh',
        'cmd',
        'cmd.exe',
        'powershell',
        'powershell.exe',
        'pwsh',
        'pwsh.exe',
        'node',
        'python',
        'perl',
        'ruby',
    ]);
    windowsBuiltins = new Set([
        'dir',
        'copy',
        'move',
        'type',
        'echo',
        'mkdir',
        'rmdir',
        'rd',
        'ren',
        'rename',
        'del',
        'cls',
        'ver',
        'set',
        'path',
        'cd',
    ]);
    maxOutputSize = 1024 * 1024;
    defaultTimeout = 30000;
    enforceAllowlist = false;
    blockChaining = false;
    secureMode = process.env.SECURE_MODE === 'true';
    constructor(options = {}) {
        const envAllowed = process.env.EXEC_ALLOWED_COMMANDS || process.env.SHELL_ALLOWLIST;
        const envBlocked = process.env.EXEC_BLOCKED_COMMANDS || process.env.SHELL_BLOCKLIST;
        const envAllowlistEnabled = process.env.EXEC_ALLOWLIST_ENABLED === 'true';
        if (envAllowed) {
            envAllowed
                .split(',')
                .map((cmd) => cmd.trim())
                .filter(Boolean)
                .forEach((cmd) => this.allowedCommands.add(cmd));
        }
        if (envBlocked) {
            envBlocked
                .split(',')
                .map((cmd) => cmd.trim())
                .filter(Boolean)
                .forEach((cmd) => this.blockedCommands.add(cmd));
        }
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
        this.enforceAllowlist = options.enforceAllowlist ?? envAllowlistEnabled;
        this.blockChaining = options.blockChaining ?? this.secureMode;
    }
    isCommandAllowed(command) {
        const baseCommand = command.split(' ')[0].toLowerCase().trim();
        if (this.blockedCommands.has(baseCommand)) {
            return false;
        }
        if ((this.enforceAllowlist || this.allowedCommands.size > 0) && !this.allowedCommands.has(baseCommand)) {
            return false;
        }
        return true;
    }
    areArgsAllowed(command, args) {
        const baseCommand = command.split(' ')[0].toLowerCase().trim();
        // Block command chaining in secure mode to reduce injection risk
        if (this.blockChaining) {
            const joinedArgs = args.join(' ');
            if (/[;&|]{1,2}/.test(joinedArgs)) {
                return { allowed: false, reason: 'Argument contains command chaining operators' };
            }
        }
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
        const isWindows = process.platform === 'win32';
        const baseCommand = command.split(' ')[0].toLowerCase().trim();
        const isWindowsBuiltin = isWindows && this.windowsBuiltins.has(baseCommand);
        const argCheck = isWindowsBuiltin
            ? this.areArgsAllowed('cmd', [command, ...args])
            : this.areArgsAllowed(command, args);
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
            const executionCommand = isWindowsBuiltin ? 'cmd' : command;
            const executionArgs = isWindowsBuiltin
                ? ['/C', `${command} ${args.join(' ')}`.trim()]
                : args;
            const childProcess = spawn(executionCommand, executionArgs, spawnOptions);
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