import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export interface CommitResult {
  success: boolean;
  commitHash?: string;
  message?: string;
  error?: string;
}

export interface PRResult {
  success: boolean;
  prUrl?: string;
  prNumber?: number;
  error?: string;
}

export interface GitAutopilotConfig {
  autoCommit: boolean;
  autoPush: boolean;
  autoPR: boolean;
  branchPrefix: string;
  conventionalCommits: boolean;
  requirePRApproval: boolean;
}

const DEFAULT_CONFIG: GitAutopilotConfig = {
  autoCommit: true,
  autoPush: true,
  autoPR: true,
  branchPrefix: 'agent',
  conventionalCommits: true,
  requirePRApproval: false,
};

export class GitAutopilot {
  private config: GitAutopilotConfig;
  private workspacePath: string;

  constructor(workspacePath: string = process.cwd(), config: Partial<GitAutopilotConfig> = {}) {
    this.workspacePath = workspacePath;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async analyzeChanges(): Promise<{ staged: string[]; unstaged: string[]; untracked: string[] }> {
    try {
      const { stdout: staged } = await execAsync('git diff --cached --name-only', {
        cwd: this.workspacePath,
      });
      const { stdout: unstaged } = await execAsync('git diff --name-only', {
        cwd: this.workspacePath,
      });
      const { stdout: untracked } = await execAsync('git ls-files --others --exclude-standard', {
        cwd: this.workspacePath,
      });

      return {
        staged: staged.trim().split('\n').filter(Boolean),
        unstaged: unstaged.trim().split('\n').filter(Boolean),
        untracked: untracked.trim().split('\n').filter(Boolean),
      };
    } catch (error) {
      return { staged: [], unstaged: [], untracked: [] };
    }
  }

  async stagePatterns(patterns: string[]): Promise<void> {
    for (const pattern of patterns) {
      await execAsync(`git add ${pattern}`, { cwd: this.workspacePath });
    }
  }

  async commit(message: string): Promise<CommitResult> {
    try {
      const changes = await this.analyzeChanges();
      const hasChanges =
        changes.staged.length > 0 || changes.unstaged.length > 0 || changes.untracked.length > 0;

      if (!hasChanges) {
        return { success: false, error: 'No changes to commit' };
      }

      let finalMessage = message;

      if (this.config.conventionalCommits) {
        finalMessage = this.formatConventionalCommit(message);
      }

      await this.stagePatterns(['.']);
      const { stdout } = await execAsync(`git commit -m "${finalMessage.replace(/"/g, '\\"')}"`, {
        cwd: this.workspacePath,
      });

      const hashMatch = stdout.match(/\[([^\s]+)\]/);
      const commitHash = hashMatch ? hashMatch[1] : undefined;

      if (this.config.autoPush) {
        await this.push();
      }

      return { success: true, commitHash, message: finalMessage };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  private formatConventionalCommit(message: string): string {
    const typeMatch = message.match(/^(\w+)(\(.+\))?:\s*/);

    if (typeMatch) {
      return message;
    }

    const types: Record<string, string> = {
      fix: 'fix',
      bug: 'fix',
      feat: 'feat',
      feature: 'feat',
      docs: 'docs',
      doc: 'docs',
      test: 'test',
      tests: 'test',
      refactor: 'refactor',
      perf: 'perf',
      chore: 'chore',
      ci: 'ci',
    };

    const lowerMessage = message.toLowerCase();
    for (const [keyword, type] of Object.entries(types)) {
      if (lowerMessage.startsWith(keyword)) {
        return `${type}: ${message}`;
      }
    }

    return `chore: ${message}`;
  }

  async createBranch(branchName: string, baseBranch?: string): Promise<boolean> {
    try {
      const base = baseBranch || 'main';
      await execAsync(`git checkout -b ${this.config.branchPrefix}/${branchName} ${base}`, {
        cwd: this.workspacePath,
      });
      return true;
    } catch (error) {
      console.error('Failed to create branch:', error);
      return false;
    }
  }

  async switchBranch(branchName: string): Promise<boolean> {
    try {
      await execAsync(`git checkout ${branchName}`, { cwd: this.workspacePath });
      return true;
    } catch (error) {
      return false;
    }
  }

  async push(): Promise<boolean> {
    try {
      const currentBranch = await this.getCurrentBranch();
      await execAsync(`git push -u origin ${currentBranch}`, { cwd: this.workspacePath });
      return true;
    } catch (error) {
      console.error('Push failed:', error);
      return false;
    }
  }

  async createPR(title: string, body: string, baseBranch?: string): Promise<PRResult> {
    try {
      const currentBranch = await this.getCurrentBranch();
      const base = baseBranch || 'main';

      const { GITHUB_TOKEN, GITHUB_REPO } = process.env;

      if (!GITHUB_TOKEN || !GITHUB_REPO) {
        return { success: false, error: 'GitHub token or repo not configured' };
      }

      const [owner, repo] = GITHUB_REPO.split('/');

      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
        method: 'POST',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          body,
          head: currentBranch,
          base: base,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: errorText };
      }

      const pr = await response.json();

      return {
        success: true,
        prUrl: pr.html_url,
        prNumber: pr.number,
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async mergeBranch(
    sourceBranch: string,
    targetBranch: string,
    message?: string
  ): Promise<boolean> {
    try {
      const currentBranch = await this.getCurrentBranch();

      await this.switchBranch(targetBranch);
      await execAsync(`git merge ${sourceBranch}`, { cwd: this.workspacePath });

      await this.push();
      await this.switchBranch(currentBranch);

      return true;
    } catch (error) {
      console.error('Merge failed:', error);
      return false;
    }
  }

  async resolveConflict(ours: string, theirs: string): Promise<boolean> {
    try {
      await execAsync(`git checkout --ours ${ours}`, { cwd: this.workspacePath });
      await execAsync(`git add ${ours}`, { cwd: this.workspacePath });
      return true;
    } catch (error) {
      console.error('Conflict resolution failed:', error);
      return false;
    }
  }

  async getCurrentBranch(): Promise<string> {
    try {
      const { stdout } = await execAsync('git branch --show-current', { cwd: this.workspacePath });
      return stdout.trim();
    } catch {
      return 'main';
    }
  }

  async getFileDiff(filePath: string): Promise<string> {
    try {
      const { stdout } = await execAsync(`git diff HEAD -- ${filePath}`, {
        cwd: this.workspacePath,
      });
      return stdout;
    } catch {
      return '';
    }
  }

  async getCommitHistory(
    count: number = 10
  ): Promise<{ hash: string; message: string; date: string }[]> {
    try {
      const { stdout } = await execAsync(`git log -${count} --format="%H|%s|%ai"`, {
        cwd: this.workspacePath,
      });
      return stdout
        .trim()
        .split('\n')
        .map((line) => {
          const [hash, message, date] = line.split('|');
          return { hash, message, date };
        });
    } catch {
      return [];
    }
  }

  async threeWayMerge(
    sourceBranch: string
  ): Promise<{ success: boolean; hasConflicts: boolean; conflictFiles: string[] }> {
    try {
      const currentBranch = await this.getCurrentBranch();

      await execAsync(`git merge ${sourceBranch} --no-edit`, { cwd: this.workspacePath });

      return { success: true, hasConflicts: false, conflictFiles: [] };
    } catch (error) {
      const conflictFiles = await this.getConflictFiles();
      return { success: false, hasConflicts: true, conflictFiles };
    }
  }

  private async getConflictFiles(): Promise<string[]> {
    try {
      const { stdout } = await execAsync('git diff --name-only --diff-filter=U', {
        cwd: this.workspacePath,
      });
      return stdout.trim().split('\n').filter(Boolean);
    } catch {
      return [];
    }
  }
}

export const gitAutopilot = new GitAutopilot();
