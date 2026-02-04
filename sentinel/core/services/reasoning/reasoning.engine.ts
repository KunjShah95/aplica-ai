import { LLMProvider } from '../../core/llm/index.js';
import { ToolRegistry } from '../tools/registry.js';
import { MemorySystem } from '../memory/system.js';
import { Tracer } from '../observability/tracing/tracer.js';
import { config } from '../../config/index.js';

export interface ReasoningStep {
  thought: string;
  action?: ToolCall;
  observation?: string;
  confidence: number;
  reasoningType: 'deductive' | 'inductive' | 'abductive' | 'analogical';
  timestamp: Date;
}

export interface ActionPlan {
  steps: ReasoningStep[];
  estimatedTime: number;
  requiredTools: string[];
  prerequisites: string[];
  risks: RiskAssessment[];
  successCriteria: string[];
}

export interface RiskAssessment {
  risk: string;
  probability: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  mitigation: string;
}

export interface ToolCall {
  tool: string;
  parameters: Record<string, any>;
  expectedOutput?: string;
}

export interface ReasoningContext {
  goal: string;
  constraints: string[];
  availableTools: string[];
  relevantMemories: any[];
  userPreferences: Record<string, any>;
  successCriteria: string[];
}

export interface ReflectionResult {
  mistakes: Mistake[];
  improvements: string[];
  strategyAdjustment: string;
  confidenceUpdate: number;
}

export interface Mistake {
  description: string;
  severity: 'minor' | 'major' | 'critical';
  correction: string;
  prevention: string;
}

export class ReasoningEngine {
  private llm: LLMProvider;
  private tools: ToolRegistry;
  private memory: MemorySystem;
  private tracer: Tracer;
  private maxIterations: number;
  private reflectionInterval: number;

  constructor(llm: LLMProvider, tools: ToolRegistry, memory: MemorySystem) {
    this.llm = llm;
    this.tools = tools;
    this.memory = memory;
    this.tracer = new Tracer('reasoning-engine');
    this.maxIterations = 10;
    this.reflectionInterval = 3;
  }

  async reason(goal: string, context: ReasoningContext): Promise<ActionPlan> {
    return this.tracer.trace('reason', async (span) => {
      span.setAttribute('goal', goal);

      const reasoningHistory: ReasoningStep[] = [];
      let currentThought = goal;
      let iteration = 0;
      let overallConfidence = 1.0;

      while (iteration < this.maxIterations) {
        const stepReasoning = await this.generateThought(currentThought, context, reasoningHistory);

        if (stepReasoning.isComplete) {
          break;
        }

        if (stepReasoning.requiresAction) {
          const actionResult = await this.executeAction(stepReasoning.action!, context);

          reasoningHistory.push({
            thought: stepReasoning.thought,
            action: stepReasoning.action,
            observation: actionResult.observation,
            confidence: actionResult.confidence,
            reasoningType: stepReasoning.reasoningType,
            timestamp: new Date(),
          });

          currentThought = this.synthesizeObservation(
            stepReasoning.thought,
            actionResult.observation
          );

          overallConfidence *= actionResult.confidence;
        } else {
          reasoningHistory.push({
            thought: stepReasoning.thought,
            confidence: stepReasoning.confidence,
            reasoningType: stepReasoning.reasoningType,
            timestamp: new Date(),
          });

          currentThought = stepReasoning.nextThought || currentThought;
        }

        if (iteration % this.reflectionInterval === 0 && iteration > 0) {
          const reflection = await this.reflect(reasoningHistory, goal, context);
          context = await this.adjustStrategy(context, reflection);

          if (reflection.mistakes.length > 0) {
            await this.memory.storeReflection(reflection);
          }
        }

        iteration++;
      }

      const plan = await this.formulatePlan(reasoningHistory, context);

      span.setAttribute('iterations', iteration);
      span.setAttribute('confidence', overallConfidence);

      return plan;
    });
  }

  private async generateThought(
    goal: string,
    context: ReasoningContext,
    history: ReasoningStep[]
  ): Promise<{
    thought: string;
    isComplete: boolean;
    requiresAction: boolean;
    action?: ToolCall;
    reasoningType: ReasoningStep['reasoningType'];
    nextThought?: string;
    confidence: number;
  }> {
    const prompt = this.buildReasoningPrompt(goal, context, history);

    const response = await this.llm.complete(prompt, {
      temperature: 0.7,
      maxTokens: 1000,
    });

    return this.parseReasoningResponse(response);
  }

  private buildReasoningPrompt(
    goal: string,
    context: ReasoningContext,
    history: ReasoningStep[]
  ): string {
    return `
Goal: ${goal}

Constraints: ${context.constraints.join(', ')}

Available Tools:
${context.availableTools.map((t) => `- ${t}`).join('\n')}

Relevant Memories:
${context.relevantMemories.map((m) => `- ${JSON.stringify(m)}`).join('\n')}

Previous Reasoning Steps:
${history.map((h, i) => `${i + 1}. [${h.reasoningType}] ${h.thought}${h.observation ? `\n   Observation: ${h.observation}` : ''}`).join('\n')}

Think step by step. For each step:
1. What is the current state?
2. What needs to be done next?
3. Should I use a tool or reason further?

Respond in JSON format:
{
  "thought": "your reasoning",
  "isComplete": true/false,
  "requiresAction": true/false,
  "action": {"tool": "tool_name", "parameters": {...}},
  "reasoningType": "deductive|inductive|abductive|analogical",
  "nextThought": "optional next step",
  "confidence": 0.0-1.0
}
`.trim();
  }

  private parseReasoningResponse(response: string): any {
    try {
      const parsed = JSON.parse(response);
      return {
        thought: parsed.thought || '',
        isComplete: parsed.isComplete || false,
        requiresAction: parsed.requiresAction || false,
        action: parsed.action,
        reasoningType: parsed.reasoningType || 'deductive',
        nextThought: parsed.nextThought,
        confidence: parsed.confidence || 0.5,
      };
    } catch {
      return {
        thought: response,
        isComplete: false,
        requiresAction: false,
        reasoningType: 'deductive',
        confidence: 0.5,
      };
    }
  }

  private async executeAction(
    action: ToolCall,
    context: ReasoningContext
  ): Promise<{ observation: string; confidence: number }> {
    const tool = this.tools.getTool(action.tool);

    if (!tool) {
      return {
        observation: `Tool '${action.tool}' not found`,
        confidence: 0,
      };
    }

    try {
      const result = await tool.execute(action.parameters);

      return {
        observation: typeof result === 'string' ? result : JSON.stringify(result),
        confidence: 0.9,
      };
    } catch (error) {
      return {
        observation: `Error executing ${action.tool}: ${error}`,
        confidence: 0.1,
      };
    }
  }

  private synthesizeObservation(thought: string, observation: string): string {
    return `Based on the thought "${thought}" and observation "${observation}", what should I do next?`;
  }

  private async reflect(
    history: ReasoningStep[],
    goal: string,
    context: ReasoningContext
  ): Promise<ReflectionResult> {
    const reflectionPrompt = `
Reflect on the reasoning history for goal: ${goal}

Reasoning History:
${history.map((h, i) => `${i + 1}. ${h.thought}${h.observation ? `\n   Result: ${h.observation}` : ''}`).join('\n')}

Identify:
1. Any mistakes made
2. Areas for improvement
3. Strategy adjustments needed
4. Updated confidence level

Respond in JSON format:
{
  "mistakes": [{"description": "", "severity": "minor|major|critical", "correction": "", "prevention": ""}],
  "improvements": [""],
  "strategyAdjustment": "",
  "confidenceUpdate": 0.0-1.0
}
`.trim();

    try {
      const response = await this.llm.complete(reflectionPrompt, {
        temperature: 0.3,
        maxTokens: 500,
      });

      return JSON.parse(response);
    } catch {
      return {
        mistakes: [],
        improvements: [],
        strategyAdjustment: '',
        confidenceUpdate: 0.5,
      };
    }
  }

  private async adjustStrategy(
    context: ReasoningContext,
    reflection: ReflectionResult
  ): Promise<ReasoningContext> {
    if (reflection.strategyAdjustment) {
      context.constraints.push(`Strategy note: ${reflection.strategyAdjustment}`);
    }

    return context;
  }

  private async formulatePlan(
    history: ReasoningStep[],
    context: ReasoningContext
  ): Promise<ActionPlan> {
    const planSteps = history
      .filter((h) => h.action)
      .map((h) => ({
        thought: h.thought,
        action: h.action!,
        observation: h.observation,
        confidence: h.confidence,
        reasoningType: h.reasoningType,
        timestamp: h.timestamp,
      }));

    const risks: RiskAssessment[] = await this.assessRisks(context, planSteps);

    return {
      steps: planSteps,
      estimatedTime: planSteps.length * 30,
      requiredTools: [...new Set(planSteps.map((s) => s.action!.tool))],
      prerequisites: [],
      risks,
      successCriteria: context.successCriteria,
    };
  }

  private async assessRisks(
    context: ReasoningContext,
    steps: ReasoningStep[]
  ): Promise<RiskAssessment[]> {
    return [];
  }

  async suggestActions(intent: string, entities: any[], memoryResults: any[]): Promise<any[]> {
    return [];
  }
}

export { ReasoningEngine };
