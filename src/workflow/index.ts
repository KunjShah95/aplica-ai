import { randomUUID } from 'crypto';

export interface WorkflowNode {
  id: string;
  type: 'trigger' | 'action' | 'condition' | 'delay';
  name: string;
  config: Record<string, unknown>;
  position: { x: number; y: number };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  condition?: string;
}

export interface Workflow {
  id: string;
  userId: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Trigger {
  type: 'webhook' | 'schedule' | 'event' | 'manual';
  config: Record<string, unknown>;
}

export class VisualWorkflowBuilder {
  private workflows: Map<string, Workflow> = new Map();

  createWorkflow(userId: string, name: string, description?: string): Workflow {
    const workflow: Workflow = {
      id: randomUUID(),
      userId,
      name,
      description,
      nodes: [],
      edges: [],
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.workflows.set(workflow.id, workflow);
    return workflow;
  }

  addNode(workflowId: string, node: Omit<WorkflowNode, 'id'>): WorkflowNode {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const newNode: WorkflowNode = {
      ...node,
      id: randomUUID(),
    };

    workflow.nodes.push(newNode);
    workflow.updatedAt = new Date();

    return newNode;
  }

  addEdge(workflowId: string, edge: Omit<WorkflowEdge, 'id'>): WorkflowEdge {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const newEdge: WorkflowEdge = {
      ...edge,
      id: randomUUID(),
    };

    workflow.edges.push(newEdge);
    workflow.updatedAt = new Date();

    return newEdge;
  }

  async execute(workflowId: string): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow || !workflow.isActive) {
      return;
    }

    const triggerNode = workflow.nodes.find((n) => n.type === 'trigger');
    if (!triggerNode) {
      throw new Error('No trigger found');
    }

    await this.executeFromNode(workflow, triggerNode.id);
  }

  private async executeFromNode(workflow: Workflow, nodeId: string): Promise<void> {
    const node = workflow.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    console.log(`Executing node: ${node.name} (${node.type})`);

    switch (node.type) {
      case 'action':
        await this.executeAction(node);
        break;
      case 'condition':
        const result = await this.evaluateCondition(node);
        const outgoingEdges = workflow.edges.filter((e) => e.source === nodeId);

        if (result) {
          const trueEdge = outgoingEdges.find((e) => e.condition === 'true');
          if (trueEdge) {
            await this.executeFromNode(workflow, trueEdge.target);
          }
        } else {
          const falseEdge = outgoingEdges.find((e) => e.condition === 'false');
          if (falseEdge) {
            await this.executeFromNode(workflow, falseEdge.target);
          }
        }
        break;
      case 'delay':
        const delayMs = (node.config.delay as number) || 1000;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        break;
    }

    const outgoingEdges = workflow.edges.filter((e) => e.source === nodeId && !e.condition);
    for (const edge of outgoingEdges) {
      await this.executeFromNode(workflow, edge.target);
    }
  }

  private async executeAction(node: WorkflowNode): Promise<void> {
    console.log(`Action: ${node.name}`, node.config);
  }

  private async evaluateCondition(node: WorkflowNode): Promise<boolean> {
    const expr = node.config.expression as string;

    try {
      return new Function('return ' + expr)() as boolean;
    } catch {
      return false;
    }
  }

  exportToJSON(workflowId: string): string {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }
    return JSON.stringify(workflow, null, 2);
  }

  importFromJSON(json: string): Workflow {
    const data = JSON.parse(json) as Workflow;
    data.id = randomUUID();
    data.createdAt = new Date();
    data.updatedAt = new Date();
    this.workflows.set(data.id, data);
    return data;
  }
}

export const visualWorkflowBuilder = new VisualWorkflowBuilder();

export interface ContractClause {
  id: string;
  text: string;
  risk: 'high' | 'medium' | 'low';
  category: string;
  explanation: string;
  suggestion?: string;
}

export interface ContractReview {
  id: string;
  filename: string;
  overallRisk: 'high' | 'medium' | 'low';
  clauses: ContractClause[];
  summary: string;
  reviewedAt: Date;
}

export class ContractReviewer {
  private riskPatterns: Map<
    string,
    { risk: ContractClause['risk']; category: string; explanation: string }[]
  > = new Map();

  constructor() {
    this.initializePatterns();
  }

  private initializePatterns(): void {
    this.riskPatterns.set('auto-renewal', [
      {
        risk: 'high',
        category: 'Auto-Renewal',
        explanation: 'Contract automatically renews unless explicitly cancelled',
      },
      {
        risk: 'medium',
        category: 'Renewal Notice',
        explanation: 'Requires advance notice to prevent automatic renewal',
      },
    ]);

    this.riskPatterns.set('liability', [
      {
        risk: 'high',
        category: 'Liability Cap',
        explanation: 'Damages are capped at a specific amount',
      },
      {
        risk: 'medium',
        category: 'Indemnification',
        explanation: 'You may be required to indemnify the other party',
      },
    ]);

    this.riskPatterns.set('ip', [
      {
        risk: 'high',
        category: 'IP Assignment',
        explanation: 'All intellectual property may be assigned to the other party',
      },
      {
        risk: 'medium',
        category: 'License Grant',
        explanation: 'Broad license granted to the other party',
      },
    ]);

    this.riskPatterns.set('termination', [
      {
        risk: 'high',
        category: 'Termination',
        explanation: 'Limited ability to terminate the contract',
      },
      {
        risk: 'medium',
        category: 'Notice Period',
        explanation: 'Requires significant notice period to terminate',
      },
    ]);

    this.riskPatterns.set('payment', [
      {
        risk: 'medium',
        category: 'Late Payment',
        explanation: 'Late fees or penalties for late payment',
      },
      { risk: 'low', category: 'Payment Terms', explanation: 'Net payment terms specified' },
    ]);
  }

  async review(content: string, filename: string): Promise<ContractReview> {
    const clauses: ContractClause[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineLower = line.toLowerCase();

      for (const [pattern, risks] of this.riskPatterns.entries()) {
        if (lineLower.includes(pattern)) {
          for (const risk of risks) {
            clauses.push({
              id: randomUUID(),
              text: line.trim(),
              risk: risk.risk,
              category: risk.category,
              explanation: risk.explanation,
              suggestion: this.generateSuggestion(risk.category, risk.risk),
            });
          }
        }
      }
    }

    const highRisk = clauses.filter((c) => c.risk === 'high').length;
    const overallRisk: ContractReview['overallRisk'] =
      highRisk > 0
        ? 'high'
        : clauses.filter((c) => c.risk === 'medium').length > 2
          ? 'medium'
          : 'low';

    return {
      id: randomUUID(),
      filename,
      overallRisk,
      clauses,
      summary: this.generateSummary(clauses),
      reviewedAt: new Date(),
    };
  }

  private generateSuggestion(category: string, risk: ContractClause['risk']): string {
    if (risk === 'high') {
      return `⚠️ Consult a lawyer before signing. ${category} clause poses significant risk.`;
    }
    if (risk === 'medium') {
      return `Consider negotiating more favorable ${category.toLowerCase()} terms.`;
    }
    return `Review and ensure ${category.toLowerCase()} terms align with your expectations.`;
  }

  private generateSummary(clauses: ContractClause[]): string {
    const high = clauses.filter((c) => c.risk === 'high').length;
    const medium = clauses.filter((c) => c.risk === 'medium').length;
    const low = clauses.filter((c) => c.risk === 'low').length;

    if (high > 0) {
      return `Found ${high} high-risk clauses. Strongly recommend legal review before signing.`;
    }
    if (medium > 2) {
      return `Found ${medium} medium-risk clauses. Some negotiation recommended.`;
    }
    return `Contract looks relatively standard with ${low} low-risk items to review.`;
  }
}

export const contractReviewer = new ContractReviewer();

export interface Habit {
  id: string;
  userId: string;
  name: string;
  frequency: 'daily' | 'weekly' | 'custom';
  customDays?: number[];
  targetTime?: string;
  streak: number;
  bestStreak: number;
  completedToday: boolean;
  lastCompleted?: Date;
  completionHistory: Date[];
}

export interface HabitCoachConfig {
  nudgeMorning: string;
  nudgeEvening: string;
  gracePeriod: number;
}

export class HabitCoach {
  private habits: Map<string, Habit> = new Map();
  private config: HabitCoachConfig = {
    nudgeMorning: '09:00',
    nudgeEvening: '18:00',
    gracePeriod: 2,
  };

  createHabit(userId: string, name: string, frequency: Habit['frequency'] = 'daily'): Habit {
    const habit: Habit = {
      id: randomUUID(),
      userId,
      name,
      frequency,
      streak: 0,
      bestStreak: 0,
      completedToday: false,
      completionHistory: [],
    };

    this.habits.set(habit.id, habit);
    return habit;
  }

  async complete(habitId: string): Promise<{ streak: number; message: string }> {
    const habit = this.habits.get(habitId);
    if (!habit) {
      throw new Error('Habit not found');
    }

    const today = new Date().toDateString();
    const lastCompleted = habit.lastCompleted?.toDateString();

    if (lastCompleted === today) {
      return { streak: habit.streak, message: 'Already completed today!' };
    }

    const yesterday = new Date(Date.now() - 86400000).toDateString();

    if (lastCompleted === yesterday || habit.completedToday) {
      habit.streak++;
    } else {
      habit.streak = 1;
    }

    if (habit.streak > habit.bestStreak) {
      habit.bestStreak = habit.streak;
    }

    habit.completedToday = true;
    habit.lastCompleted = new Date();
    habit.completionHistory.push(new Date());

    let message = '';
    if (habit.streak === 1) {
      message = 'Great start! First completion today.';
    } else if (habit.streak % 7 === 0) {
      message = `🎉 Amazing! ${habit.streak} day streak! One week strong!`;
    } else if (habit.streak % 30 === 0) {
      message = `🏆 Incredible! ${habit.streak} day streak! Monthly champion!`;
    } else {
      message = `🔥 ${habit.streak} day streak! Keep it up!`;
    }

    return { streak: habit.streak, message };
  }

  getNudgeTime(): { morning: string; evening: string } {
    const hour = new Date().getHours();

    if (hour < 12) {
      return { morning: this.config.nudgeMorning, evening: '' };
    }
    return { morning: '', evening: this.config.nudgeEvening };
  }

  async getNudge(userId: string): Promise<string | null> {
    const userHabits = Array.from(this.habits.values()).filter((h) => h.userId === userId);
    const incomplete = userHabits.filter((h) => !h.completedToday);

    if (incomplete.length === 0) {
      return null;
    }

    const { morning, evening } = this.getNudgeTime();

    if (morning && incomplete.length > 0) {
      return `Good morning! You have ${incomplete.length} habits to complete today. Start with: ${incomplete[0].name}`;
    }

    if (evening) {
      const pending = incomplete.map((h) => h.name).join(', ');
      return `Evening check! Still pending: ${pending}. You can do it!`;
    }

    return null;
  }

  getStats(habitId: string): { streak: number; bestStreak: number; completionRate: number } {
    const habit = this.habits.get(habitId);
    if (!habit) {
      return { streak: 0, bestStreak: 0, completionRate: 0 };
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const recentCompletions = habit.completionHistory.filter((d) => d > thirtyDaysAgo);
    const completionRate = (recentCompletions.length / 30) * 100;

    return {
      streak: habit.streak,
      bestStreak: habit.bestStreak,
      completionRate: Math.round(completionRate),
    };
  }
}

export const habitCoach = new HabitCoach();
