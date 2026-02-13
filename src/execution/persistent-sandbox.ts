
import { spawn, exec } from 'child_process';
import { randomUUID } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ExecutionResult {
    stdout: string;
    stderr: string;
    exitCode: number;
}

export class PersistentSandbox {
    private containerId: string | null = null;
    private image: string;
    public id: string;

    constructor(image: string = 'node:20-alpine') {
        this.id = randomUUID();
        this.image = image;
    }

    /**
     * Starts the persistent container (The "Computer")
     */
    async start(): Promise<string> {
        if (this.containerId) return this.containerId;

        // Start a container that stays alive indefinitely (using tail -f /dev/null)
        const args = [
            'run',
            '-d',                       // Detached mode
            '--rm',                     // Remove when stopped
            '--network', 'none',        // No network (secure by default, enable if needed)
            '--name', `cowork-session-${this.id}`,
            this.image,
            'tail', '-f', '/dev/null'  // Keep running
        ];

        console.log(`[Sandbox] Starting container cowork-session-${this.id}...`);
        const child = await execAsync(`docker ${args.join(' ')}`);
        this.containerId = child.stdout.trim();
        return this.containerId;
    }

    /**
     * Runs a shell command inside the container
     */
    async exec(command: string, workDir: string = '/app'): Promise<ExecutionResult> {
        if (!this.containerId) throw new Error('Sandbox not started');

        // Create workdir if it doesn't exist
        await execAsync(`docker exec ${this.containerId} mkdir -p ${workDir}`);

        try {
            // Execute command
            const { stdout, stderr } = await execAsync(`docker exec -w ${workDir} ${this.containerId} /bin/sh -c "${command.replace(/"/g, '\\"')}"`);
            return { stdout, stderr, exitCode: 0 };
        } catch (error: any) {
            return {
                stdout: error.stdout || '',
                stderr: error.stderr || error.message,
                exitCode: error.code || 1
            };
        }
    }

    /**
     * Writes a file to the container
     */
    async writeFile(filePath: string, content: string): Promise<void> {
        if (!this.containerId) throw new Error('Sandbox not started');

        // We use a temp file on host and docker cp, or echo directly if small.
        // Docker cp is safer for large/complex content.
        const tempPath = path.join(process.cwd(), 'tmp', `upload-${randomUUID()}.tmp`);
        await fs.mkdir(path.dirname(tempPath), { recursive: true });
        await fs.writeFile(tempPath, content);

        try {
            // Ensure directory exists
            const dir = path.dirname(filePath);
            await this.exec(`mkdir -p ${dir}`);

            // Copy file
            await execAsync(`docker cp ${tempPath} ${this.containerId}:${filePath}`);
        } finally {
            await fs.unlink(tempPath).catch(() => { });
        }
    }

    /**
     * Reads a file from the container
     */
    async readFile(filePath: string): Promise<string> {
        if (!this.containerId) throw new Error('Sandbox not started');

        const tempPath = path.join(process.cwd(), 'tmp', `download-${randomUUID()}.tmp`);
        await fs.mkdir(path.dirname(tempPath), { recursive: true });

        try {
            await execAsync(`docker cp ${this.containerId}:${filePath} ${tempPath}`);
            return await fs.readFile(tempPath, 'utf-8');
        } finally {
            await fs.unlink(tempPath).catch(() => { });
        }
    }

    /**
     * Stops and cleans up the container
     */
    async stop(): Promise<void> {
        if (this.containerId) {
            console.log(`[Sandbox] Stopping container ${this.containerId}...`);
            await execAsync(`docker stop ${this.containerId}`);
            this.containerId = null;
        }
    }
}
