import { Skill, SkillExecutionContext, SkillResult } from '../../loader.js';
import { createAgentOrchestrator } from '../../../core/orchestrator.js';
import { createProvider } from '../../../core/llm/index.js';
import { configLoader } from '../../../config/loader.js';

export const manifest: Skill['manifest'] = {
  name: 'delegate_task',
  version: '1.0.0',
  description: 'Delegate a complex sub-task to a specialized sub-agent.',
  triggers: [{ type: 'keyword', value: 'delegate', description: 'Delegate task to sub-agent' }],
  parameters: [
    {
      name: 'task',
      type: 'string',
      required: true,
      description: 'The specific task description for the sub-agent',
    },
    {
      name: 'role',
      type: 'string',
      required: true,
      description:
        'The role/persona of the sub-agent (e.g., "Senior Python Developer", "Legal Expert")',
    },
    {
      name: 'context',
      type: 'string',
      required: false,
      description: 'Additional context or background information',
    },
  ],
  permissions: ['llm'],
  examples: [
    'delegate_task --role "Data Scientist" --task "Analyze this CSV data for trends"',
    'delegate to "Copywriter" task "Draft a viral tweet about AI"',
  ],
};

export class DelegateSkill implements Skill {
  manifest = manifest;

  async execute(context: SkillExecutionContext): Promise<SkillResult> {
    const { parameters, userId } = context;
    const task = parameters.task as string;
    const role = parameters.role as string;
    const taskContext = (parameters.context as string) || '';

    if (!task || !role) {
      return { success: false, output: 'Task and Role are required for delegation.' };
    }

    try {
      console.log(`[Delegation] Spawning sub-agent: ${role}`);

      const config = await configLoader.load();
      const llmProvider = createProvider(config.llm);
      const orchestrator = createAgentOrchestrator(llmProvider as any, 5); // Limit sub-agent iterations

      // Create a specialized system prompt for the sub-agent
      const systemPrompt = `
        You are a specialized sub-agent with the role: ${role}.
        Your goal is to complete the assigned task efficiently.
        
        Task: ${task}
        Context: ${taskContext}
        
        Report your findings back to the main agent clearly and concisely.
      `;

      // We need to inject this system prompt.
      // The current orchestrator uses 'personaId' to fetch prompt from DB,
      // or defaults. We might need to bypass that or create a temporary persona.
      // For now, let's just pass it as the first message in a new conversation context,
      // effectively overriding the "default" if we don't pass a personaId.

      // Wait, the orchestrator 'run' method builds the prompt internally.
      // We should probably modify Orchestrator to accept an override system prompt
      // or we construct a "Virtual Persona".

      // Let's rely on the user instructions being strong enough for now
      // and maybe passing it as a "System Note".

      const subAgentResponse = await orchestrator.run(
        `[SYSTEM: ACT AS ${role}]\nTask: ${task}\nContext: ${taskContext}`,
        {
          userId: userId,
          maxIterations: 5,
          temperature: 0.3, // More focused
          tools: [], // Sub-agents might not need all tools, or maybe they do? Let's limit for safety/speed.
          // Ideally we pass relevant tools only.
        }
      );

      return {
        success: true,
        output: `Sub-Agent (${role}) Report:\n${subAgentResponse.response}`,
        data: {
          role,
          task,
          iterations: subAgentResponse.iterations,
          toolsUsed: subAgentResponse.toolsUsed,
        },
      };
    } catch (error) {
      return {
        success: false,
        output: `Delegation failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}
