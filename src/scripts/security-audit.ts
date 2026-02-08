import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';

console.log('🔍 Starting Alpicia Security Audit...');

let issues: { severity: string; message: string; mitigation: string }[] = [];

// 1. Check Environment
const envPath = path.resolve(process.cwd(), '.env');
const isProd = process.env.NODE_ENV === 'production';

// Check for .env file existence
if (!fs.existsSync(envPath)) {
    issues.push({
        severity: 'critical',
        message: '.env file not found',
        mitigation: 'Create a .env file from .env.example'
    });
} else {
    // Check for weak keys
    const content = fs.readFileSync(envPath, 'utf-8');
    if (content.includes('your-anthropic-api-key') || content.includes('your-telegram-bot-token')) {
        issues.push({
            severity: 'high',
            message: 'Detected placeholder values in .env',
            mitigation: 'Replace placeholder API keys with real values'
        });
    }

    // Check file permissions (Unix only, skip on win32)
    if (process.platform !== 'win32') {
        const stats = fs.statSync(envPath);
        const mode = stats.mode & 0o777;
        if (mode !== 0o600 && mode !== 0o400) {
            issues.push({
                severity: 'medium',
                message: `.env file permissions are too open (${mode.toString(8)})`,
                mitigation: 'Run `chmod 600 .env` to restrict access'
            });
        }
    }
}

// 2. Check Allowed Commands
const allowedCommands = (process.env.ALLOWED_COMMANDS || '').split(',');
const dangerousCommands = ['rm', 'dd', 'mkfs', 'shred', 'mv', 'wget', 'curl'];

const dangerousAllowed = allowedCommands.filter(cmd => dangerousCommands.includes(cmd.trim()));
if (dangerousAllowed.length > 0) {
    issues.push({
        severity: 'critical',
        message: `Dangerous commands are allowed: ${dangerousAllowed.join(', ')}`,
        mitigation: 'Remove these commands from ALLOWED_COMMANDS in .env'
    });
}

// 3. Check Sandbox Settings
const sandboxEnabled = process.env.SANDBOX_ENABLED === 'true';
if (!sandboxEnabled) {
    issues.push({
        severity: 'high',
        message: 'Task Sandbox is disabled',
        mitigation: 'Set SANDBOX_ENABLED=true in .env'
    });
}

// 4. Check API Exposure
const apiHost = process.env.API_HOST || 'localhost';
if (apiHost === '0.0.0.0' && !isProd) {
    issues.push({
        severity: 'medium',
        message: 'API is listening on all interfaces (0.0.0.0)',
        mitigation: 'Set API_HOST=127.0.0.1 for local development'
    });
}

// 5. Check Default Secrets
const secrets = [
    'JWT_SECRET',
    'SESSION_SECRET',
    'ENCRYPTION_KEY'
];

secrets.forEach(secret => {
    const allowlist = ['change-me', 'secret', 'default'];
    const value = process.env[secret];
    if (value && allowlist.some(s => value.includes(s))) {
        issues.push({
            severity: 'high',
            message: `Weak ${secret} detected`,
            mitigation: `Generate a strong random string for ${secret}`
        });
    }
});

// 6. Check Injection Defenses
const promptGuardPath = path.resolve(process.cwd(), 'src/security/prompt-guard.ts');
if (!fs.existsSync(promptGuardPath)) {
    issues.push({
        severity: 'high',
        message: 'Prompt Injection Defense (PromptGuard) is missing',
        mitigation: 'Implement src/security/prompt-guard.ts'
    });
}

// 7. Check Docker Sandbox Integration
const dockerSandboxPath = path.resolve(process.cwd(), 'src/execution/docker-sandbox.ts');
if (!fs.existsSync(dockerSandboxPath)) {
    issues.push({
        severity: 'high',
        message: 'Docker Sandbox implementation is missing',
        mitigation: 'Implement src/execution/docker-sandbox.ts'
    });
} else {
    // Check if it's actually used in sandbox.ts (basic string check)
    const sandboxTsPath = path.resolve(process.cwd(), 'src/execution/sandbox.ts');
    if (fs.existsSync(sandboxTsPath)) {
        const content = fs.readFileSync(sandboxTsPath, 'utf-8');
        if (!content.includes('DockerSandboxExecutor')) {
            issues.push({
                severity: 'medium',
                message: 'Docker Sandbox is implemented but not integrated into main Executor',
                mitigation: 'Update src/execution/sandbox.ts to use DockerSandboxExecutor'
            });
        }
    }
}

// Report Results
console.log('\nAudit Results:');
if (issues.length === 0) {
    console.log('✅ No security issues found used settings appear safe.');
} else {
    issues.forEach(issue => {
        const icon = issue.severity === 'critical' ? '🔴' : issue.severity === 'high' ? '🟠' : '🟡';
        console.log(`${icon} [${issue.severity.toUpperCase()}] ${issue.message}`);
        console.log(`   👉 Mitigation: ${issue.mitigation}\n`);
    });
    process.exit(issues.some(i => i.severity === 'critical') ? 1 : 0);
}
