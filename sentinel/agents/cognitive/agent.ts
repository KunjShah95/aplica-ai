import { EventEmitter } from 'events';
import { ReasoningEngine } from '../core/services/reasoning/reasoning.engine.js';
import { ContextManager } from '../core/services/context/manager.js';
import { MemorySystem } from '../memory/system.js';
import { ToolRegistry } from '../tools/registry.js';
import { SafetyLayer } from '../core/services/safety/safety.layer.js';
import { Tracer } from '../observability/tracing/tracer.js';

export interface AgentConfig {
  id: string;
  name: string;
  role: string;
  systemPrompt: string;
  capabilities: string[];
  maxIterations: number;
  reflectionInterval: number;
  temperature: number;
  model: string;
}

export interface AgentState {
  status: 'idle' | 'reasoning' | 'acting' | 'reflecting' | 'completed' | 'error';
  currentTask?: string;
  progress: number;
  lastThought?: string;
  confidence: number;
  errors: AgentError[];
  startTime: Date;
}

export interface AgentError {
  type: string;
  message: string;
  timestamp: Date;
  recoverable: boolean;
  suggestion?: string;
}

export interface AgentResult {
  success: boolean;
  output: string;
  confidence: number;
  iterations: number;
  duration: number;
  memoryUpdates: MemoryUpdate[];
  errors: AgentError[];
}

export interface MemoryUpdate {
  type: 'remember' | 'forget' | 'update';
  content: string;
  importance: number;
}

export interface TaskDecomposition {
  task: string;
  subtasks: Subtask[];
  estimatedDuration: number;
  parallelizable: boolean[];
}

export interface Subtask {
  id: string;
  description: string;
  dependencies: string[];
  estimatedDuration: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export interface CognitiveCycle {
  thought: string;
  action?: ToolAction;
  observation?: string;
  reflection?: ReflectionResult;
  confidence: number;
  timestamp: Date;
}

export interface ToolAction {
  tool: string;
  parameters: Record<string, any>;
}

export interface ReflectionResult {
  quality: number;
  mistakes: Mistake[];
  improvements: string[];
  strategyAdjustment?: string;
}

export interface Mistake {
  description: string;
  severity: 'minor' | 'major' | 'critical';
  correction: string;
}

export class CognitiveAgent extends EventEmitter {
  private config: AgentConfig;
  private state: AgentState;
  private reasoningEngine: ReasoningEngine;
  private contextManager: ContextManager;
  private memorySystem: MemorySystem;
  private toolRegistry: ToolRegistry;
  private safetyLayer: SafetyLayer;
  private tracer: Tracer;
  private cycleHistory: CognitiveCycle[];

  constructor(config: Partial<AgentConfig>) {
    super();
    this.config = {
      id: config.id || `agent_${Date.now()}`,
      name: config.name || 'Assistant',
      role: config.role || 'general',
      systemPrompt:
        config.systemPrompt || 'You are a helpful AI assistant that reasons step by step.',
      capabilities: config.capabilities || [],
      maxIterations: config.maxIterations || 10,
      reflectionInterval: config.reflectionInterval || 3,
      temperature: config.temperature || 0.7,
      model: config.model || 'claude',
    };

    this.state = {
      status: 'idle',
      progress: 0,
      confidence: 1.0,
      errors: [],
      startTime: new Date(),
    };

    this.cycleHistory = [];
  }

  async execute(goal: string, context?: any): Promise<AgentResult> {
    return this.tracer.trace('execute', async (span) => {
      span.setAttribute('agentId', this.config.id);
      span.setAttribute('goal', goal);

      this.state.status = 'reasoning';
      this.state.currentTask = goal;
      this.state.startTime = new Date();
      this.emit('executionStarted', { agentId: this.config.id, goal });

      const ctx = await this.contextManager.loadContext(
        context?.sessionId || this.config.id,
        context?.userId || 'default'
      );

      await this.contextManager.updateWorkingMemory(ctx, {
        currentFocus: goal,
      });

      const memoryUpdates: MemoryUpdate[] = [];
      let iterations = 0;
      let currentThought = goal;
      let overallConfidence = 1.0;

      while (iterations < this.config.maxIterations) {
        this.state.status = 'reasoning';
        iterations++;

        const cycle = await this.runCognitiveCycle(currentThought, ctx, iterations);

        this.cycleHistory.push(cycle);
        this.state.lastThought = cycle.thought;
        this.state.confidence = cycle.confidence;
        overallConfidence *= cycle.confidence;

        if (cycle.reflection) {
          this.state.status = 'reflecting';

          if (cycle.reflection.quality < 0.5) {
            const error: AgentError = {
              type: 'quality_warning',
              message: `Low quality reasoning detected: ${cycle.reflection.mistakes.map((m) => m.description).join(', ')}`,
              timestamp: new Date(),
              recoverable: true,
              suggestion: cycle.reflection.improvements[0],
            };
            this.state.errors.push(error);
          }

          if (cycle.reflection.strategyAdjustment) {
            await this.contextManager.updateWorkingMemory(ctx, {
              constraints: [
                ...(await this.getConstraints(ctx)),
                cycle.reflection.strategyAdjustment,
              ],
            });
          }

          memoryUpdates.push({
            type: 'remember',
            content: `Reflection on iteration ${iterations}: ${cycle.reflection.improvements.join('; ')}`,
            importance: 0.6,
          });
        }

        if (cycle.observation && cycle.observation.includes('COMPLETE')) {
          this.state.status = 'completed';
          this.state.progress = 100;

          span.setAttribute('iterations', iterations);
          span.setAttribute('success', true);
          span.setAttribute('confidence', overallConfidence);

          await this.contextManager.saveContext(ctx);

          const result: AgentResult = {
            success: true,
            output: this.synthesizeOutput(cycle.observation),
            confidence: overallConfidence,
            iterations,
            duration: Date.now() - this.state.startTime.getTime(),
            memoryUpdates,
            errors: this.state.errors,
          };

          this.emit('executionCompleted', result);
          return result;
        }

        if (cycle.action) {
          this.state.status = 'acting';

          const safetyResult = await this.safetyLayer.evaluate({
            type: 'tool_call',
            content: JSON.stringify(cycle.action),
            context: {
              userId: context?.userId || 'default',
              sessionId: context?.sessionId || this.config.id,
            },
          });

          if (!safetyResult.isAllowed) {
            const error: AgentError = {
              type: 'safety_block',
              message: `Action blocked: ${safetyResult.explanation}`,
              timestamp: new Date(),
              recoverable: false,
            };
            this.state.errors.push(error);
            this.state.status = 'error';

            const result: AgentResult = {
              success: false,
              output: `Action was blocked for safety: ${safetyResult.explanation}`,
              confidence: 0,
              iterations,
              duration: Date.now() - this.state.startTime.getTime(),
              memoryUpdates,
              errors: this.state.errors,
            };

            this.emit('executionFailed', result);
            return result;
          }

          try {
            const tool = this.toolRegistry.getTool(cycle.action.tool);
            if (tool) {
              const result = await tool.execute(cycle.action.parameters);
              cycle.observation = result;
            } else {
              cycle.observation = `Tool '${cycle.action.tool}' not found`;
              overallConfidence *= 0.5;
            }
          } catch (error) {
            cycle.observation = `Error: ${error}`;
            overallConfidence *= 0.3;

            if (iterations > this.config.maxIterations * 0.7) {
              this.state.status = 'error';
            }
          }
        }

        currentThought = this.synthesizeNextThought(cycle, iterations);

        this.state.progress = (iterations / this.config.maxIterations) * 100;
        this.emit('iterationCompleted', {
          agentId: this.config.id,
          iteration: iterations,
          thought: cycle.thought,
          confidence: cycle.confidence,
        });
      }

      this.state.status = 'error';

      const result: AgentResult = {
        success: false,
        output: 'Maximum iterations reached without completion',
        confidence: overallConfidence,
        iterations,
        duration: Date.now() - this.state.startTime.getTime(),
        memoryUpdates,
        errors: this.state.errors,
      };

      this.emit('executionFailed', result);
      return result;
    });
  }

  private async runCognitiveCycle(
    goal: string,
    context: any,
    iteration: number
  ): Promise<CognitiveCycle> {
    const relevantMemories = await this.memorySystem.recall(goal, [], context);

    const reasoningContext = {
      goal,
      constraints: await this.getConstraints(context),
      availableTools: this.config.capabilities,
      relevantMemories: relevantMemories.memories,
      userPreferences: (await this.memorySystem.getUserProfile(context.userId))?.preferences || {},
      successCriteria: [],
    };

    const reasoningResult = await this.reasoningEngine.reason(goal, reasoningContext);

    let reflection: ReflectionResult | undefined;

    if (iteration % this.config.reflectionInterval === 0) {
      reflection = await this.reflect(goal, reasoningContext, reasoningResult);
    }

    return {
      thought: reasoningResult.steps[0]?.thought || goal,
      action: reasoningResult.steps[0]?.action
        ? {
            tool: reasoningResult.steps[0].action.tool,
            parameters: reasoningResult.steps[0].action.parameters,
          }
        : undefined,
      observation: reasoningResult.steps[0]?.observation,
      reflection,
      confidence: reasoningResult.steps[0]?.confidence || 0.5,
      timestamp: new Date(),
    };
  }

  private async reflect(goal: string, context: any, plan: any): Promise<ReflectionResult> {
    const quality = Math.random() * 0.3 + 0.7;

    const mistakes: Mistake[] = [];
    if (quality < 0.7) {
      mistakes.push({
        description: 'Some reasoning steps were unclear',
        severity: 'minor',
        correction: 'Provide more explicit reasoning',
      });
    }

    const improvements: string[] = [];
    if (plan.risks?.length > 0) {
      improvements.push('Consider risk mitigation strategies');
    }

    return {
      quality,
      mistakes,
      improvements,
      strategyAdjustment:
        quality < 0.8 ? 'Focus more on explicit step-by-step reasoning' : undefined,
    };
  }

  private async getConstraints(context: any): Promise<string[]> {
    const memory = await this.memorySystem.recall('constraints', [], context);
    return memory.memories.filter((m) => m.type === 'knowledge').map((m) => m.content);
  }

  private synthesizeNextThought(cycle: CognitiveCycle, iteration: number): string {
    if (cycle.observation) {
      return `Based on the observation "${cycle.observation}", what should I do next to achieve the goal?`;
    }
    return cycle.thought;
  }

  private synthesizeOutput(observation: string): string {
    return observation.replace('COMPLETE: ', '').trim();
  }

  getState(): AgentState {
    return { ...this.state };
  }

  getConfig(): AgentConfig {
    return { ...this.config };
  }

  async decomposeTask(task: string): Promise<TaskDecomposition> {
    return {
      task,
      subtasks: [
        {
          id: `subtask_1`,
          description: `Analyze: ${task}`,
          dependencies: [],
          estimatedDuration: 60,
          status: 'pending',
        },
      ],
      estimatedDuration: 120,
      parallelizable: [false],
    };
  }
}

export { CognitiveAgent };
