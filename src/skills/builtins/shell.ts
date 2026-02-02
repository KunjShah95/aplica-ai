import { Skill, SkillExecutionContext, SkillResult } from '../loader.js';
import { shellExecutor } from '../../execution/shell.js';

export const manifest: Skill['manifest'] = {
  name: 'shell',
  version: '1.0.0',
  description: 'Shell command execution skill',
  triggers: [
    { type: 'command', value: '/shell', description: 'Execute shell command' },
    { type: 'keyword', value: 'run command', description: 'Run a shell command' },
    { type: 'keyword', value: 'execute', description: 'Execute a command' },
  ],
  parameters: [
    { name: 'command', type: 'string', required: true, description: 'Command to execute' },
    { name: 'args', type: 'array', required: false, description: 'Command arguments' },
    {
      name: 'timeout',
      type: 'number',
      required: false,
      description: 'Timeout in ms',
      default: 30000,
    },
  ],
  permissions: ['shell'],
  examples: ['run command ls -la', 'execute git status', 'shell npm run build'],
};

export class ShellSkill implements Skill {
  manifest = manifest;

  async execute(context: SkillExecutionContext): Promise<SkillResult> {
    const { parameters } = context;
    const command = parameters.command as string;
    const args = parameters.args as string[] | undefined;
    const timeout = parameters.timeout as number | undefined;

    if (!command) {
      return { success: false, output: 'Command is required' };
    }

    const result = await shellExecutor.execute({
      command,
      args: args || [],
      timeout: timeout || 30000,
    });

    let output = '';
    if (result.stdout) {
      output += `STDOUT:\n${result.stdout}\n`;
    }
    if (result.stderr) {
      output += `STDERR:\n${result.stderr}\n`;
    }

    return {
      success: result.success,
      output: output.trim() || `Command executed (exit code: ${result.exitCode})`,
      data: {
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        duration: result.duration,
      },
    };
  }
}
