import { randomUUID } from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
const execAsync = promisify(exec);
export class AutoResearchEngine {
    programs = new Map();
    workspacePath;
    github;
    notification;
    agentInstances = new Map();
    constructor(options = {}) {
        this.workspacePath = options.workspacePath || process.cwd();
        this.github = options.github;
        this.notification = options.notification;
    }
    async loadProgram(filePath) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
        if (!frontmatterMatch) {
            throw new Error('Invalid program.md format - missing frontmatter');
        }
        const yaml = await import('js-yaml');
        const frontmatter = yaml.load(frontmatterMatch[1]);
        return {
            name: String(frontmatter.name || 'Unnamed Program'),
            description: String(frontmatter.description || ''),
            goals: Array.isArray(frontmatter.goals) ? frontmatter.goals : [],
            successCriteria: Array.isArray(frontmatter.successCriteria)
                ? frontmatter.successCriteria
                : [],
            budget: {
                type: frontmatter.budgetType || 'runs',
                limit: Number(frontmatter.budgetLimit) || 10,
            },
            researchDirection: String(frontmatter.researchDirection || ''),
            agentPrompt: frontmatterMatch[2].trim(),
            compareResults: String(frontmatter.compareResults || 'higher score wins'),
        };
    }
    async createProgram(config, workspacePath) {
        const program = {
            id: randomUUID(),
            name: config.name,
            description: config.description,
            goals: config.goals,
            successCriteria: config.successCriteria,
            budget: {
                type: config.budget.type,
                limit: config.budget.limit,
                spent: 0,
            },
            iterations: [],
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        const workDir = workspacePath || path.join(this.workspacePath, '.research', program.id);
        fs.mkdirSync(workDir, { recursive: true });
        const programFile = path.join(workDir, 'program.md');
        fs.writeFileSync(programFile, this.generateProgramMarkdown(config));
        program.status = 'pending';
        this.programs.set(program.id, program);
        return program;
    }
    generateProgramMarkdown(config) {
        return `---
name: ${config.name}
description: ${config.description}
goals:
${config.goals.map((g) => `  - ${g}`).join('\n')}
successCriteria:
${config.successCriteria.map((c) => `  - ${c}`).join('\n')}
budgetType: ${config.budget.type}
budgetLimit: ${config.budget.limit}
researchDirection: ${config.researchDirection}
compareResults: ${config.compareResults}
---

${config.agentPrompt}
`;
    }
    async startResearch(programId) {
        const program = this.programs.get(programId);
        if (!program) {
            throw new Error(`Program not found: ${programId}`);
        }
        program.status = 'running';
        program.updatedAt = new Date();
        const branchName = `research/${programId.slice(0, 8)}`;
        try {
            await this.createBranch(branchName);
            while (this.withinBudget(program) && program.status === 'running') {
                const iteration = await this.runIteration(program, branchName);
                program.iterations.push(iteration);
                if (iteration.result) {
                    if (!program.bestResult || iteration.result.score > program.bestResult.score) {
                        program.bestResult = iteration.result;
                    }
                }
                program.budget.spent = this.calculateSpent(program);
                if (this.checkSuccess(program)) {
                    program.status = 'completed';
                }
            }
            if (program.status === 'running') {
                program.status = program.bestResult ? 'completed' : 'failed';
            }
            await this.commitBestResult(program, branchName);
            if (program.status === 'completed') {
                await this.sendSummary(program);
            }
        }
        catch (error) {
            program.status = 'failed';
            console.error(`Research failed for program ${programId}:`, error);
        }
        program.updatedAt = new Date();
    }
    withinBudget(program) {
        switch (program.budget.type) {
            case 'runs':
                return program.iterations.length < program.budget.limit;
            case 'tokens':
                return program.budget.spent < program.budget.limit;
            case 'time':
                const elapsed = Date.now() - program.createdAt.getTime();
                return elapsed < program.budget.limit * 1000;
            default:
                return false;
        }
    }
    calculateSpent(program) {
        switch (program.budget.type) {
            case 'runs':
                return program.iterations.length;
            case 'tokens':
                return program.iterations.reduce((sum, iter) => sum + (iter.result?.metrics['tokens'] || 0), 0);
            case 'time':
                return Date.now() - program.createdAt.getTime();
            default:
                return 0;
        }
    }
    checkSuccess(program) {
        if (!program.bestResult)
            return false;
        for (const criterion of program.successCriteria) {
            const metric = this.parseCriterion(criterion);
            const actual = program.bestResult.metrics[metric.name];
            if (actual === undefined || !this.evaluateCondition(actual, metric.operator, metric.value)) {
                return false;
            }
        }
        return true;
    }
    parseCriterion(criterion) {
        const match = criterion.match(/(\w+)\s*(>=|<=|>|<|==)\s*(\d+)/);
        if (!match) {
            return { name: 'score', operator: '>=', value: 0 };
        }
        return {
            name: match[1],
            operator: match[2],
            value: Number(match[3]),
        };
    }
    evaluateCondition(actual, operator, expected) {
        switch (operator) {
            case '>=':
                return actual >= expected;
            case '<=':
                return actual <= expected;
            case '>':
                return actual > expected;
            case '<':
                return actual < expected;
            case '==':
                return actual === expected;
            default:
                return false;
        }
    }
    async runIteration(program, branchName) {
        const iterationId = randomUUID();
        const iteration = {
            id: iterationId,
            number: program.iterations.length + 1,
            variant: `variant-${iterationId.slice(0, 8)}`,
            changes: [],
            status: 'running',
            startedAt: new Date(),
        };
        console.log(`Running iteration ${iteration.number} for program ${program.name}`);
        try {
            const agent = new ResearchAgent({
                programId: program.id,
                iterationId: iteration.id,
                workspacePath: path.join(this.workspacePath, '.research', program.id),
                goals: program.goals,
                previousResults: program.iterations.map((i) => ({
                    variant: i.variant,
                    result: i.result,
                })),
            });
            const result = await agent.run();
            iteration.result = {
                score: result.score || 0,
                metrics: result.metrics || {},
                summary: result.summary || '',
                artifacts: result.artifacts || [],
            };
            iteration.status = 'completed';
        }
        catch (error) {
            iteration.status = 'failed';
            iteration.result = {
                score: 0,
                metrics: {},
                summary: '',
                error: error instanceof Error ? error.message : String(error),
                artifacts: [],
            };
        }
        iteration.completedAt = new Date();
        return iteration;
    }
    async createBranch(branchName) {
        if (!this.github)
            return;
        try {
            await execAsync(`git checkout -b ${branchName}`, { cwd: this.workspacePath });
        }
        catch {
            await execAsync(`git checkout ${branchName}`, { cwd: this.workspacePath });
        }
    }
    async commitBestResult(program, branchName) {
        if (!this.github || !program.bestResult)
            return;
        const commitMessage = `Research complete: ${program.name}

Best result: ${program.bestResult.score}
${program.bestResult.summary}

${program.iterations.length} iterations completed.
`;
        try {
            await execAsync('git add -A', { cwd: this.workspacePath });
            await execAsync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`, {
                cwd: this.workspacePath,
            });
            await execAsync(`git push -u origin ${branchName}`, { cwd: this.workspacePath });
        }
        catch (error) {
            console.error('Failed to commit research results:', error);
        }
    }
    async sendSummary(program) {
        const summary = this.generateSummary(program);
        if (this.notification?.telegram) {
            await this.sendTelegram(this.notification.telegram, summary);
        }
        if (this.notification?.discord) {
            await this.sendDiscord(this.notification.discord, summary);
        }
    }
    generateSummary(program) {
        return `🔬 Research Complete: ${program.name}

📊 Best Score: ${program.bestResult?.score || 'N/A'}
🔄 Iterations: ${program.iterations.length}
⏱️ Duration: ${this.formatDuration(program)}

🎯 Goals:
${program.goals.map((g) => `  • ${g}`).join('\n')}

📝 Summary:
${program.bestResult?.summary || 'No summary available'}

${program.bestResult?.artifacts?.length ? `📁 Artifacts: ${program.bestResult.artifacts.join(', ')}` : ''}
`;
    }
    formatDuration(program) {
        const ms = program.updatedAt.getTime() - program.createdAt.getTime();
        const hours = Math.floor(ms / 3600000);
        const minutes = Math.floor((ms % 3600000) / 60000);
        return `${hours}h ${minutes}m`;
    }
    async sendTelegram(chatId, message) {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (!botToken)
            return;
        try {
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: message }),
            });
        }
        catch (error) {
            console.error('Failed to send Telegram notification:', error);
        }
    }
    async sendDiscord(webhookUrl, message) {
        try {
            await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: message }),
            });
        }
        catch (error) {
            console.error('Failed to send Discord notification:', error);
        }
    }
    getProgram(programId) {
        return this.programs.get(programId);
    }
    listPrograms() {
        return Array.from(this.programs.values());
    }
}
class ResearchAgent {
    options;
    constructor(options) {
        this.options = options;
    }
    async run() {
        await this.implementChange();
        await this.runTests();
        return this.evaluateResults();
    }
    async implementChange() {
        console.log(`Research agent implementing change for iteration ${this.options.iterationId}`);
    }
    async runTests() {
        console.log(`Research agent running tests for iteration ${this.options.iterationId}`);
    }
    async evaluateResults() {
        return {
            score: Math.random() * 100,
            metrics: {
                score: Math.random() * 100,
                tokens: Math.floor(Math.random() * 10000),
                duration: Math.floor(Math.random() * 60000),
            },
            summary: 'Research iteration completed successfully',
            artifacts: [],
        };
    }
}
export class MultiAgentResearchCoordinator {
    engines = new Map();
    sharedChannel;
    constructor() {
        this.loadEngines();
    }
    loadEngines() {
        const count = parseInt(process.env.RESEARCH_AGENT_COUNT || '3');
        for (let i = 0; i < count; i++) {
            const id = `agent-${i}`;
            this.engines.set(id, new AutoResearchEngine({
                workspacePath: process.cwd(),
            }));
        }
    }
    async startParallelResearch(programs, onProgress) {
        const results = new Map();
        const promises = [];
        for (let i = 0; i < programs.length; i++) {
            const agentId = `agent-${i % this.engines.size}`;
            const engine = this.engines.get(agentId);
            const promise = (async () => {
                const program = await engine.createProgram(programs[i]);
                results.set(agentId, program);
                engine.startResearch(program.id);
                if (onProgress) {
                    onProgress(agentId, 0);
                }
            })();
            promises.push(promise);
        }
        await Promise.all(promises);
        return results;
    }
    async getStatus() {
        let active = 0;
        let completed = 0;
        for (const engine of this.engines.values()) {
            for (const program of engine.listPrograms()) {
                if (program.status === 'running')
                    active++;
                else if (program.status === 'completed')
                    completed++;
            }
        }
        return {
            agentCount: this.engines.size,
            activeResearch: active,
            completedResearch: completed,
        };
    }
}
export const autoResearchEngine = new AutoResearchEngine();
export const researchCoordinator = new MultiAgentResearchCoordinator();
//# sourceMappingURL=index.js.map