import { exec, execSync, spawn, SpawnOptionsWithoutStdio } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

export interface CommandResult {
  success: boolean;
  command: string;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  duration: number;
}

export interface CommandOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  maxBuffer?: number;
  shell?: string;
}

export interface ProcessInfo {
  pid: number;
  command: string;
  arguments: string[];
  startTime: Date;
  cwd: string;
}

export interface StreamingResult {
  command: string;
  pid: number;
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

export class ShellTool {
  private allowedCommands: Set<string>;
  private blockedCommands: Set<string>;
  private commandHistory: Map<string, CommandResult>;
  private readonly MAX_HISTORY = 1000;
  private readonly DEFAULT_TIMEOUT = 30000;
  private readonly MAX_BUFFER = 10 * 1024 * 1024;
  private readonly DEFAULT_SHELL = process.platform === 'win32' ? 'cmd.exe' : '/bin/bash';

  constructor(config?: { allowedCommands?: string[]; blockedCommands?: string[] }) {
    this.allowedCommands = new Set(
      config?.allowedCommands || [
        'ls',
        'cat',
        'echo',
        'pwd',
        'mkdir',
        'touch',
        'rm',
        'cp',
        'mv',
        'head',
        'tail',
        'grep',
        'find',
        'wc',
        'sort',
        'uniq',
        'cut',
        'tr',
        'sed',
        'awk',
        'diff',
        'patch',
        'git',
        'npm',
        'yarn',
        'pnpm',
        'docker',
        'docker-compose',
        'kubectl',
        'helm',
        'curl',
        'wget',
        'ping',
        'traceroute',
        'netstat',
        'ss',
        'ip',
        'ifconfig',
        'ps',
        'top',
        'htop',
        'kill',
        'killall',
        'jobs',
        'bg',
        'fg',
        'nohup',
        'tar',
        'gzip',
        'bzip2',
        'xz',
        'zip',
        'unzip',
        'rsync',
        'scp',
        'ssh',
        'chmod',
        'chown',
        'chgrp',
        'ln',
        'readlink',
        'realpath',
        'basename',
        'dirname',
        'date',
        'cal',
        'whoami',
        'hostname',
        'uname',
        'uptime',
        'df',
        'du',
        'free',
      ]
    );
    this.blockedCommands = new Set(
      config?.blockedCommands || [
        'sudo',
        'su',
        'chroot',
        'mount',
        'umount',
        'fdisk',
        'mkfs',
        'dd',
        ' shred',
        'passwd',
        'useradd',
        'userdel',
        'usermod',
        'groupadd',
        'groupdel',
        'init',
        'shutdown',
        'reboot',
        'halt',
        'poweroff',
        'systemctl',
      ]
    );
    this.commandHistory = new Map();
  }

  async execute(command: string, options?: CommandOptions): Promise<CommandResult> {
    const startTime = Date.now();

    try {
      this.validateCommand(command);

      const { stdout, stderr } = await execAsync(command, {
        cwd: options?.cwd,
        env: { ...process.env, ...options?.env },
        maxBuffer: options?.maxBuffer || this.MAX_BUFFER,
        timeout: options?.timeout || this.DEFAULT_TIMEOUT,
        shell: options?.shell || this.DEFAULT_SHELL,
      });

      const result: CommandResult = {
        success: true,
        command,
        exitCode: 0,
        stdout: stdout.toString(),
        stderr: stderr.toString(),
        duration: Date.now() - startTime,
      };

      this.addToHistory(result);
      return result;
    } catch (error: any) {
      const result: CommandResult = {
        success: error.code === 0,
        command,
        exitCode: error.code || null,
        stdout: error.stdout?.toString() || '',
        stderr: error.stderr?.toString() || error.message,
        duration: Date.now() - startTime,
      };

      this.addToHistory(result);
      return result;
    }
  }

  async executeSync(command: string, options?: CommandOptions): Promise<CommandResult> {
    const startTime = Date.now();

    try {
      this.validateCommand(command);

      const stdout = execSync(command, {
        cwd: options?.cwd,
        env: { ...process.env, ...options?.env },
        maxBuffer: options?.maxBuffer || this.MAX_BUFFER,
        timeout: options?.timeout || this.DEFAULT_TIMEOUT,
        shell: options?.shell || this.DEFAULT_SHELL,
        encoding: 'utf-8',
      });

      const result: CommandResult = {
        success: true,
        command,
        exitCode: 0,
        stdout: stdout,
        stderr: '',
        duration: Date.now() - startTime,
      };

      this.addToHistory(result);
      return result;
    } catch (error: any) {
      const result: CommandResult = {
        success: false,
        command,
        exitCode: error.status || null,
        stdout: error.stdout?.toString() || '',
        stderr: error.stderr?.toString() || error.message,
        duration: Date.now() - startTime,
      };

      this.addToHistory(result);
      return result;
    }
  }

  async executeStreaming(
    command: string,
    onData?: (data: string, type: 'stdout' | 'stderr') => void,
    options?: CommandOptions
  ): Promise<StreamingResult> {
    this.validateCommand(command);

    const parts = this.parseCommand(command);
    const executable = parts[0];
    const args = parts.slice(1);

    const spawnOptions: SpawnOptionsWithoutStdio = {
      cwd: options?.cwd,
      env: { ...process.env, ...options?.env },
      shell: options?.shell || this.DEFAULT_SHELL,
    };

    let stdout = '';
    let stderr = '';

    return new Promise((resolve) => {
      const child = spawn(executable, args, spawnOptions);

      child.stdout?.on('data', (data) => {
        const chunk = data.toString();
        stdout += chunk;
        onData?.(chunk, 'stdout');
      });

      child.stderr?.on('data', (data) => {
        const chunk = data.toString();
        stderr += chunk;
        onData?.(chunk, 'stderr');
      });

      child.on('close', (code) => {
        resolve({
          command,
          pid: child.pid || 0,
          stdout,
          stderr,
          exitCode: code,
        });
      });

      child.on('error', (error) => {
        resolve({
          command,
          pid: child.pid || 0,
          stdout,
          stderr: stderr + error.message,
          exitCode: -1,
        });
      });
    });
  }

  async backgroundExecute(command: string, options?: CommandOptions): Promise<ProcessInfo> {
    this.validateCommand(command);

    const parts = this.parseCommand(command);
    const executable = parts[0];
    const args = parts.slice(1);

    const spawnOptions: SpawnOptionsWithoutStdio = {
      cwd: options?.cwd,
      env: { ...process.env, ...options?.env },
      detached: true,
      stdio: 'ignore',
    };

    const child = spawn(executable, args, spawnOptions);
    child.unref();

    return {
      pid: child.pid || 0,
      command,
      arguments: args,
      startTime: new Date(),
      cwd: options?.cwd || process.cwd(),
    };
  }

  async killProcess(pid: number, signal = 'SIGTERM'): Promise<boolean> {
    try {
      process.kill(pid, signal as NodeJS.Signals);
      return true;
    } catch {
      return false;
    }
  }

  async getProcessInfo(pid: number): Promise<ProcessInfo | null> {
    try {
      const { stdout } = await execAsync(`ps -p ${pid} -o comm= -o args= -o cwd= -o lstart=`, {
        encoding: 'utf-8',
      });

      const lines = stdout.trim().split('\n');
      if (lines.length < 4) return null;

      return {
        pid,
        command: lines[0].trim(),
        arguments: lines[1].trim().split(' ').filter(Boolean),
        cwd: lines[2].trim(),
        startTime: new Date(lines[3].trim()),
      };
    } catch {
      return null;
    }
  }

  async listProcesses(): Promise<ProcessInfo[]> {
    try {
      const { stdout } = await execAsync('ps aux | head -50', { encoding: 'utf-8' });

      const lines = stdout.split('\n').slice(1);
      const processes: ProcessInfo[] = [];

      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 11) {
          const pid = parseInt(parts[1], 10);
          if (!isNaN(pid)) {
            const command = parts[10];
            if (command && !command.includes('ps aux')) {
              processes.push({
                pid,
                command,
                arguments: [command],
                startTime: new Date(),
                cwd: '',
              });
            }
          }
        }
      }

      return processes.slice(0, 20);
    } catch {
      return [];
    }
  }

  async which(command: string): Promise<string | null> {
    try {
      const { stdout } = await execAsync(`which ${command}`);
      return stdout.trim() || null;
    } catch {
      return null;
    }
  }

  async checkCommandExists(command: string): Promise<boolean> {
    const result = await this.which(command);
    return result !== null;
  }

  getHistory(): CommandResult[] {
    return Array.from(this.commandHistory.values()).slice(-100);
  }

  getHistoryByCommand(commandPrefix: string): CommandResult[] {
    return Array.from(this.commandHistory.values()).filter((r) =>
      r.command.startsWith(commandPrefix)
    );
  }

  clearHistory(): void {
    this.commandHistory.clear();
  }

  allowCommand(command: string): void {
    this.allowedCommands.add(command.toLowerCase());
    this.blockedCommands.delete(command.toLowerCase());
  }

  blockCommand(command: string): void {
    this.blockedCommands.add(command.toLowerCase());
    this.allowedCommands.delete(command.toLowerCase());
  }

  private validateCommand(command: string): void {
    const trimmed = command.trim();

    if (!trimmed) {
      throw new Error('Empty command');
    }

    const baseCommand = trimmed.split(' ')[0].toLowerCase();

    if (this.blockedCommands.has(baseCommand)) {
      throw new Error(`Command blocked: ${baseCommand}`);
    }

    if (this.allowedCommands.size > 0 && !this.allowedCommands.has(baseCommand)) {
      throw new Error(`Command not allowed: ${baseCommand}`);
    }

    const dangerousPatterns = [
      /;\s*rm\s+/i,
      /\|\s*rm\s+/i,
      /\$\(/,
      /`[^`]+`/,
      />\s*\/dev\/null/,
      /2>\s*&1/,
      /&&\s*rm\s+/i,
      /\|\|\s*rm\s+/i,
      /eval\s*\(/i,
      /exec\s+/i,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(trimmed)) {
        throw new Error(`Potentially dangerous pattern detected: ${pattern}`);
      }
    }
  }

  private parseCommand(command: string): string[] {
    const parts: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < command.length; i++) {
      const char = command[i];

      if (char === '"' || char === "'") {
        if (inQuotes && char === quoteChar) {
          inQuotes = false;
          quoteChar = '';
        } else if (!inQuotes) {
          inQuotes = true;
          quoteChar = char;
        } else {
          current += char;
        }
      } else if (char === ' ' && !inQuotes) {
        if (current) {
          parts.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }

    if (current) {
      parts.push(current);
    }

    return parts.length > 0 ? parts : [command];
  }

  private addToHistory(result: CommandResult): void {
    const key = `${Date.now()}-${Math.random()}`;
    this.commandHistory.set(key, result);

    if (this.commandHistory.size > this.MAX_HISTORY) {
      const firstKey = this.commandHistory.keys().next().value;
      if (firstKey) {
        this.commandHistory.delete(firstKey);
      }
    }
  }
}

export { ShellTool };
