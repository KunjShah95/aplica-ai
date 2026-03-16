import { randomUUID } from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';

const execAsync = promisify(exec);

export interface WorkflowFailure {
  workflowId: string;
  runId: string;
  repository: string;
  branch: string;
  status: string;
  conclusion: string;
  logs: string;
  failedStep?: string;
  errorMessage?: string;
}

export interface DiagnosisResult {
  rootCause: string;
  category:
    | 'flaky_test'
    | 'missing_env'
    | 'broken_lockfile'
    | 'dependency_error'
    | 'permission_error'
    | 'timeout'
    | 'unknown';
  confidence: number;
  suggestedFix: string;
  patch?: string;
}

export class CICSelfHealer {
  private githubToken?: string;
  private autoFixEnabled: boolean = true;

  constructor(options?: { githubToken?: string; autoFix?: boolean }) {
    this.githubToken = options?.githubToken || process.env.GITHUB_TOKEN;
    this.autoFixEnabled = options?.autoFix ?? true;
  }

  async handleWorkflowFailure(failure: WorkflowFailure): Promise<DiagnosisResult> {
    console.log(`Analyzing workflow failure: ${failure.workflowId}`);

    const diagnosis = await this.diagnose(failure);

    console.log(`Diagnosis: ${diagnosis.rootCause} (${diagnosis.category})`);

    if (this.autoFixEnabled && diagnosis.confidence > 0.7 && diagnosis.patch) {
      const fixResult = await this.applyFix(failure, diagnosis);

      if (fixResult.success) {
        await this.retriggerPipeline(failure);
      }
    }

    return diagnosis;
  }

  private async diagnose(failure: WorkflowFailure): Promise<DiagnosisResult> {
    const logs = failure.logs.toLowerCase();

    if (this.looksLikeFlakyTest(logs)) {
      return {
        rootCause: 'Flaky test detected in test suite',
        category: 'flaky_test',
        confidence: 0.85,
        suggestedFix: 'Rerun tests with retry mechanism or fix test isolation',
        patch: this.generateFlakyTestPatch(),
      };
    }

    if (this.looksLikeMissingEnv(logs)) {
      const missingVar = this.extractMissingEnv(logs);
      return {
        rootCause: `Missing environment variable: ${missingVar}`,
        category: 'missing_env',
        confidence: 0.9,
        suggestedFix: `Add ${missingVar} to GitHub secrets or .env file`,
        patch: this.generateEnvPatch(missingVar),
      };
    }

    if (this.looksLikeBrokenLockfile(logs)) {
      return {
        rootCause: 'Outdated lockfile causing dependency conflicts',
        category: 'broken_lockfile',
        confidence: 0.8,
        suggestedFix: 'Update lockfile with npm install/update',
        patch: this.generateLockfilePatch(),
      };
    }

    if (this.looksLikeDependencyError(logs)) {
      const dep = this.extractDependency(logs);
      return {
        rootCause: `Dependency error: ${dep}`,
        category: 'dependency_error',
        confidence: 0.75,
        suggestedFix: `Fix dependency ${dep} version`,
        patch: this.generateDependencyPatch(dep),
      };
    }

    if (this.looksLikePermissionError(logs)) {
      return {
        rootCause: 'Permission denied error in workflow',
        category: 'permission_error',
        confidence: 0.8,
        suggestedFix: 'Fix file permissions or GitHub token scopes',
      };
    }

    if (this.looksLikeTimeout(logs)) {
      return {
        rootCause: 'Workflow step timed out',
        category: 'timeout',
        confidence: 0.7,
        suggestedFix: 'Increase timeout or optimize the step',
      };
    }

    return {
      rootCause: 'Unknown error - requires manual investigation',
      category: 'unknown',
      confidence: 0.3,
      suggestedFix: 'Review logs manually',
    };
  }

  private looksLikeFlakyTest(logs: string): boolean {
    const patterns = [
      /flaky/i,
      /sometimes pass/i,
      /sometimes fail/i,
      /race condition/i,
      /test.*?(pass|fail).*?pass.*?fail/i,
      /network.*?(intermittent|flaky)/i,
    ];
    return patterns.some((p) => p.test(logs));
  }

  private looksLikeMissingEnv(logs: string): boolean {
    return /is not defined|undefined|not found|missing.*env/i.test(logs);
  }

  private looksLikeBrokenLockfile(logs: string): boolean {
    return /lock file|package-lock|yarn.lock|integrity check failed|hash mismatch/i.test(logs);
  }

  private looksLikeDependencyError(logs: string): boolean {
    return /cannot find module|module not found|failed to resolve|peer dependency|conflicting/i.test(
      logs
    );
  }

  private looksLikePermissionError(logs: string): boolean {
    return /permission denied|eacces|readonly| denied/i.test(logs);
  }

  private looksLikeTimeout(logs: string): boolean {
    return /timeout|timed out|took too long|exceeded/i.test(logs);
  }

  private extractMissingEnv(logs: string): string {
    const match = logs.match(
      /(?:is not defined|not defined|undefined variable)\s+['"]?(\w+)['"]?/i
    );
    return match?.[1] || 'UNKNOWN_VAR';
  }

  private extractDependency(logs: string): string {
    const match = logs.match(/cannot find module ['"]([^'"]+)['"]/i);
    return match?.[1] || 'unknown';
  }

  private generateFlakyTestPatch(): string {
    return `
# To fix flaky tests, add retry logic to your test runner:
# For Jest:
# jest.config.js:
# {
#   "retryTimes": 2,
#   "flakyTestsTimeout": 10000
# }
`;
  }

  private generateEnvPatch(varName: string): string {
    return `
# Add to your workflow or .env:
# ${varName}=your_value_here
# Or add to GitHub Secrets
`;
  }

  private generateLockfilePatch(): string {
    return `# Run these commands:
# npm install
# git add package-lock.json
# git commit -m "chore: update lockfile"
`;
  }

  private generateDependencyPatch(dep: string): string {
    return `# Run:
# npm install ${dep}@latest
# or check for version conflicts with:
# npm ls ${dep}
`;
  }

  private async applyFix(
    failure: WorkflowFailure,
    diagnosis: DiagnosisResult
  ): Promise<{ success: boolean; error?: string }> {
    if (!diagnosis.patch) {
      return { success: false, error: 'No patch available' };
    }

    console.log(`Applying fix for ${diagnosis.category}...`);

    try {
      const { stdout } = await execAsync('git status --porcelain', { cwd: process.cwd() });

      if (stdout.trim()) {
        await execAsync('git stash', { cwd: process.cwd() });
      }

      const branchName = `fix/${failure.workflowId}-${Date.now()}`;
      await execAsync(`git checkout -b ${branchName}`, { cwd: process.cwd() });

      if (diagnosis.category === 'missing_env') {
        const envExamplePath = '.env.example';
        if (fs.existsSync(envExamplePath)) {
          const content = fs.readFileSync(envExamplePath, 'utf-8');
          const varName = diagnosis.rootCause.split(':')[1]?.trim() || 'NEW_VAR';
            fs.writeFileSync(envExamplePath, content + `\n${varName}=`);
        }
      }

      if (diagnosis.category === 'broken_lockfile') {
        await execAsync('rm -rf node_modules package-lock.json', { cwd: process.cwd() });
        await execAsync('npm install', { cwd: process.cwd() });
      }

      await execAsync('git add -A', { cwd: process.cwd() });
      await execAsync(`git commit -m "fix(ci): ${diagnosis.rootCause}"`, { cwd: process.cwd() });
      await execAsync(`git push -u origin ${branchName}`, { cwd: process.cwd() });

      console.log('Fix committed and pushed');
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  private async retriggerPipeline(failure: WorkflowFailure): Promise<void> {
    console.log(`Retriggering workflow ${failure.workflowId}...`);
  }

  async listenForWebhook(payload: any): Promise<void> {
    if (payload.action === 'completed' && payload.workflow_run?.conclusion === 'failure') {
      const failure: WorkflowFailure = {
        workflowId: payload.workflow.id,
        runId: payload.workflow_run.id,
        repository: payload.repository.full_name,
        branch: payload.workflow_run.head_branch,
        status: payload.workflow_run.status,
        conclusion: payload.workflow_run.conclusion,
        logs: 'Logs would be fetched from GitHub API',
      };

      await this.handleWorkflowFailure(failure);
    }
  }
}

export const ciSelfHealer = new CICSelfHealer();
