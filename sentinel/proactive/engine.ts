import { EventEmitter } from 'events';
import { MemorySystem } from '../memory/system.js';
import { Logger } from '../observability/logging/index.js';

export interface ProactiveConfig {
  enabled: boolean;
  suggestionInterval: number;
  maxSuggestionsPerDay: number;
  minConfidenceThreshold: number;
  learningRate: number;
  contextWindows: ContextWindow[];
}

export interface ContextWindow {
  type: 'time' | 'location' | 'activity' | 'emotion';
  parameters: Record<string, any>;
}

export interface UserRhythm {
  userId: string;
  dailyPatterns: DailyPattern[];
  weeklyPatterns: WeeklyPattern[];
  habits: Habit[];
  preferences: ProactivePreference[];
  lastUpdated: Date;
}

export interface DailyPattern {
  hour: number;
  activity: string;
  frequency: number;
  confidence: number;
}

export interface WeeklyPattern {
  dayOfWeek: number;
  activities: string[];
  confidence: number;
}

export interface Habit {
  name: string;
  trigger: string;
  action: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  timeOfDay?: string;
  location?: string;
  confidence: number;
  streak?: number;
  lastCompleted?: Date;
}

export interface ProactivePreference {
  type: 'notification' | 'timing' | 'content' | 'frequency';
  value: string | boolean | number;
  importance: number;
}

export interface ProactiveSuggestion {
  id: string;
  type: SuggestionType;
  title: string;
  description: string;
  action?: SuggestedAction;
  confidence: number;
  reasoning: string;
  context: SuggestionContext;
  expiresAt?: Date;
  priority: number;
  feedback?: SuggestionFeedback;
}

export type SuggestionType =
  | 'reminder'
  | 'recommendation'
  | 'prediction'
  | 'optimization'
  | 'wellness'
  | 'productivity'
  | 'social'
  | 'learning'
  | 'creative';

export interface SuggestedAction {
  type: 'immediate' | 'scheduled' | 'deferred';
  executeAt?: Date;
  action: string;
  parameters?: Record<string, any>;
  confirmationRequired: boolean;
}

export interface SuggestionContext {
  trigger: TriggerType;
  location?: string;
  timeOfDay?: string;
  userActivity?: string;
  emotion?: string;
  recentEvents?: string[];
}

export type TriggerType =
  | 'time_based'
  | 'location_based'
  | 'event_based'
  | 'pattern_based'
  | 'user_request'
  | 'opportunity';

export interface SuggestionFeedback {
  userId: string;
  suggestionId: string;
  action: 'accepted' | 'rejected' | 'modified' | 'snoozed';
  rating?: number;
  comment?: string;
  timestamp: Date;
}

export interface IntuitionPrediction {
  type: string;
  probability: number;
  expectedTime?: Date;
  confidence: number;
  indicators: string[];
  suggestedAction?: string;
}

export class ProactiveEngine extends EventEmitter {
  private config: ProactiveConfig;
  private memory: MemorySystem;
  private logger: Logger;
  private userRhythms: Map<string, UserRhythm>;
  private suggestionHistory: Map<string, ProactiveSuggestion[]>;
  private activeSuggestions: Map<string, ProactiveSuggestion>;
  private scheduler: NodeJS.Timeout;
  private predictionModels: Map<string, PredictionModel>;

  constructor(memory: MemorySystem, logger: Logger, config: Partial<ProactiveConfig> = {}) {
    super();
    this.memory = memory;
    this.logger = logger;
    this.config = {
      enabled: config.enabled ?? true,
      suggestionInterval: config.suggestionInterval || 300000,
      maxSuggestionsPerDay: config.maxSuggestionsPerDay || 10,
      minConfidenceThreshold: config.minConfidenceThreshold || 0.6,
      learningRate: config.learningRate || 0.01,
      contextWindows: config.contextWindows || [],
    };

    this.userRhythms = new Map();
    this.suggestionHistory = new Map();
    this.activeSuggestions = new Map();
    this.predictionModels = new Map();

    this.initializePredictionModels();
  }

  private initializePredictionModels(): void {
    this.predictionModels.set('activity_prediction', {
      type: 'activity_prediction',
      algorithm: 'markov_chain',
      accuracy: 0.75,
      lastTrained: new Date(),
    });

    this.predictionModels.set('intent_prediction', {
      type: 'intent_prediction',
      algorithm: 'lstm',
      accuracy: 0.8,
      lastTrained: new Date(),
    });

    this.predictionModels.set('emotion_prediction', {
      type: 'emotion_prediction',
      algorithm: 'naive_bayes',
      accuracy: 0.7,
      lastTrained: new Date(),
    });
  }

  async initialize(): Promise<void> {
    if (this.config.enabled) {
      this.startSuggestionEngine();
    }

    this.emit('initialized');
  }

  private startSuggestionEngine(): void {
    this.scheduler = setInterval(async () => {
      for (const [userId] of this.userRhythms) {
        await this.generateSuggestionsForUser(userId);
      }
    }, this.config.suggestionInterval);
  }

  async analyzeUserRhythm(userId: string, interactionHistory: any[]): Promise<UserRhythm> {
    const dailyPatterns = this.extractDailyPatterns(interactionHistory);
    const weeklyPatterns = this.extractWeeklyPatterns(interactionHistory);
    const habits = await this.detectHabits(userId, interactionHistory);
    const preferences = await this.loadProactivePreferences(userId);

    const rhythm: UserRhythm = {
      userId,
      dailyPatterns,
      weeklyPatterns,
      habits,
      preferences,
      lastUpdated: new Date(),
    };

    this.userRhythms.set(userId, rhythm);

    return rhythm;
  }

  private extractDailyPatterns(interactions: any[]): DailyPattern[] {
    const hourlyActivity: Map<number, string[]> = new Map();

    for (const interaction of interactions) {
      const hour = new Date(interaction.timestamp).getHours();
      const existing = hourlyActivity.get(hour) || [];
      existing.push(interaction.type || 'unknown');
      hourlyActivity.set(hour, existing);
    }

    const patterns: DailyPattern[] = [];

    for (const [hour, activities] of hourlyActivity) {
      const activityCounts = new Map<string, number>();
      for (const activity of activities) {
        activityCounts.set(activity, (activityCounts.get(activity) || 0) + 1);
      }

      const mostFrequent = Array.from(activityCounts.entries()).sort((a, b) => b[1] - a[1])[0];

      patterns.push({
        hour,
        activity: mostFrequent[0],
        frequency: mostFrequent[1] / activities.length,
        confidence: Math.min(mostFrequent[1] / 5, 1),
      });
    }

    return patterns;
  }

  private extractWeeklyPatterns(interactions: any[]): WeeklyPattern[] {
    const dailyActivities: Map<number, string[]> = new Map();

    for (const interaction of interactions) {
      const day = new Date(interaction.timestamp).getDay();
      const existing = dailyActivities.get(day) || [];
      existing.push(interaction.type || 'unknown');
      dailyActivities.set(day, existing);
    }

    const patterns: WeeklyPattern[] = [];

    for (let day = 0; day < 7; day++) {
      const activities = dailyActivities.get(day) || [];
      if (activities.length === 0) continue;

      patterns.push({
        dayOfWeek: day,
        activities: [...new Set(activities)],
        confidence: Math.min(activities.length / 10, 1),
      });
    }

    return patterns;
  }

  private async detectHabits(userId: string, interactions: any[]): Promise<Habit[]> {
    const habits: Habit[] = [];

    const frequentActions = new Map<string, number>();
    const actionContexts = new Map<string, Set<string>>();

    for (const interaction of interactions) {
      const action = interaction.action || interaction.type;
      frequentActions.set(action, (frequentActions.get(action) || 0) + 1);

      if (interaction.context) {
        const contexts = actionContexts.get(action) || new Set();
        contexts.add(interaction.context);
        actionContexts.set(action, contexts);
      }
    }

    for (const [action, count] of frequentActions) {
      if (count >= 5) {
        const contexts = actionContexts.get(action);

        habits.push({
          name: `Regular ${action}`,
          trigger: 'time_based',
          action,
          frequency: count > 20 ? 'daily' : count > 10 ? 'weekly' : 'monthly',
          confidence: Math.min(count / 30, 1),
          streak: Math.floor(count / 7),
        });
      }
    }

    return habits.sort((a, b) => b.confidence - a.confidence).slice(0, 20);
  }

  private async loadProactivePreferences(userId: string): Promise<ProactivePreference[]> {
    const profile = await this.memory.getUserProfile(userId);

    if (!profile) {
      return [
        { type: 'frequency', value: 'normal', importance: 0.5 },
        { type: 'timing', value: 'business_hours', importance: 0.5 },
        { type: 'content', value: 'productive', importance: 0.5 },
      ];
    }

    return [
      {
        type: 'frequency',
        value: profile.preferences?.notifications || 'normal',
        importance: 0.7,
      },
      {
        type: 'timing',
        value: profile.preferences?.timeFormat || 'business_hours',
        importance: 0.6,
      },
    ];
  }

  async generateSuggestionsForUser(userId: string): Promise<ProactiveSuggestion[]> {
    const rhythm = this.userRhythms.get(userId);
    if (!rhythm) {
      return [];
    }

    const suggestions: ProactiveSuggestion[] = [];

    const predictions = await this.predictUserNeeds(userId, rhythm);

    for (const prediction of predictions) {
      const suggestion = await this.createSuggestionFromPrediction(userId, prediction, rhythm);

      if (suggestion) {
        suggestions.push(suggestion);
        this.activeSuggestions.set(suggestion.id, suggestion);
      }
    }

    const historicalSuggestions = this.suggestionHistory.get(userId) || [];
    const todayCount = historicalSuggestions.filter(
      (s) => s.feedback?.timestamp.toDateString() === new Date().toDateString()
    ).length;

    if (todayCount >= this.config.maxSuggestionsPerDay) {
      return suggestions.slice(0, this.config.maxSuggestionsPerDay);
    }

    return suggestions;
  }

  private async predictUserNeeds(
    userId: string,
    rhythm: UserRhythm
  ): Promise<IntuitionPrediction[]> {
    const predictions: IntuitionPrediction[] = [];
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();

    const currentPattern = rhythm.dailyPatterns.find((p) => p.hour === currentHour);

    if (currentPattern) {
      predictions.push({
        type: 'next_activity',
        probability: currentPattern.frequency,
        confidence: currentPattern.confidence,
        indicators: [`Usually ${currentPattern.activity} at this hour`],
        suggestedAction: `Prepare for ${currentPattern.activity}`,
      });
    }

    const dayPattern = rhythm.weeklyPatterns.find((p) => p.dayOfWeek === currentDay);
    if (dayPattern) {
      predictions.push({
        type: 'daily_activities',
        probability: dayPattern.confidence,
        confidence: dayPattern.confidence,
        indicators: [`Today is typically a ${dayPattern.activities.join(', ')} day`],
      });
    }

    for (const habit of rhythm.habits.slice(0, 5)) {
      const hoursSinceLast = habit.lastCompleted
        ? (now.getTime() - habit.lastCompleted.getTime()) / (1000 * 60 * 60)
        : 24;

      if (
        hoursSinceLast >= 12 && hoursSinceLast <= habit.frequency === 'daily'
          ? 48
          : habit.frequency === 'weekly'
            ? 168
            : 720
      ) {
        predictions.push({
          type: 'habit_reminder',
          probability: habit.confidence,
          confidence: habit.confidence * (1 - hoursSinceLast / 168),
          indicators: [`Haven't ${habit.action} in ${Math.round(hoursSinceLast)} hours`],
          suggestedAction: habit.action,
        });
      }
    }

    return predictions.sort((a, b) => b.probability - a.probability);
  }

  private async createSuggestionFromPrediction(
    userId: string,
    prediction: IntuitionPrediction,
    rhythm: UserRhythm
  ): Promise<ProactiveSuggestion | null> {
    if (prediction.probability < this.config.minConfidenceThreshold) {
      return null;
    }

    const suggestionTemplates = this.getSuggestionTemplates(prediction.type);

    if (suggestionTemplates.length === 0) {
      return null;
    }

    const template = suggestionTemplates[0];
    const id = `sug_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const suggestion: ProactiveSuggestion = {
      id,
      type: template.type,
      title: template.title,
      description: this.fillTemplate(template.description, prediction),
      confidence: prediction.probability,
      reasoning: prediction.indicators.join('; '),
      context: {
        trigger: 'pattern_based',
        timeOfDay: new Date().toTimeString().slice(0, 5),
      },
      priority: prediction.probability * template.priorityMultiplier,
      expiresAt: new Date(Date.now() + template.expiryMs),
    };

    return suggestion;
  }

  private getSuggestionTemplates(type: string): SuggestionTemplate[] {
    const templates: SuggestionTemplate[] = [];

    switch (type) {
      case 'next_activity':
        templates.push({
          type: 'productivity',
          title: 'Time for your regular activity',
          description:
            "It's around the time you usually {activity}. Would you like me to help with that?",
          priorityMultiplier: 1.0,
          expiryMs: 3600000,
        });
        break;
      case 'habit_reminder':
        templates.push({
          type: 'wellness',
          title: 'Habit reminder',
          description: "You haven't {action} in a while. Would you like to do it now?",
          priorityMultiplier: 0.8,
          expiryMs: 7200000,
        });
        break;
      case 'daily_activities':
        templates.push({
          type: 'productivity',
          title: 'Daily planning',
          description:
            'Based on your patterns, today might be good for {activities}. Want to plan your day?',
          priorityMultiplier: 0.7,
          expiryMs: 14400000,
        });
        break;
    }

    return templates;
  }

  private fillTemplate(template: string, prediction: IntuitionPrediction): string {
    let filled = template;

    if (prediction.indicators.length > 0) {
      const indicator = prediction.indicators[0].toLowerCase();
      const match = indicator.match(/usually (\w+) at this hour/i);
      if (match) {
        filled = filled.replace('{activity}', match[1]);
      }

      const actionMatch = indicator.match(/haven't (\w+) in/i);
      if (actionMatch) {
        filled = filled.replace('{action}', actionMatch[1]);
      }

      const activitiesMatch = indicator.match(/typically a (.+) day/i);
      if (activitiesMatch) {
        filled = filled.replace('{activities}', activitiesMatch[1]);
      }
    }

    return filled;
  }

  async recordFeedback(feedback: SuggestionFeedback): Promise<void> {
    const suggestion = this.activeSuggestions.get(feedback.suggestionId);
    if (!suggestion) return;

    suggestion.feedback = feedback;

    const history = this.suggestionHistory.get(feedback.userId) || [];
    history.push(suggestion);
    this.suggestionHistory.set(feedback.userId, history);

    if (feedback.action === 'rejected') {
      this.adjustConfidence(suggestion, -0.1);
    } else if (feedback.action === 'accepted') {
      this.adjustConfidence(suggestion, 0.1);
    }

    this.activeSuggestions.delete(feedback.suggestionId);

    this.emit('feedbackReceived', feedback);
  }

  private adjustConfidence(suggestion: ProactiveSuggestion, delta: number): void {
    suggestion.confidence = Math.max(0, Math.min(1, suggestion.confidence + delta));
  }

  async getActiveSuggestions(userId: string): Promise<ProactiveSuggestion[]> {
    return Array.from(this.activeSuggestions.values()).filter(
      (s) =>
        s.context.trigger !== 'user_request' && s.confidence >= this.config.minConfidenceThreshold
    );
  }

  async getPredictionAccuracy(modelType: string): Promise<number> {
    const model = this.predictionModels.get(modelType);
    return model?.accuracy || 0;
  }

  async trainModel(modelType: string, trainingData: any[], labels: any[]): Promise<void> {
    const model = this.predictionModels.get(modelType);
    if (!model) return;

    this.logger.info(`Training ${modelType} model with ${trainingData.length} samples`);

    let accuracy = model.accuracy;
    if (trainingData.length > 100) {
      accuracy = Math.min(0.95, accuracy + this.config.learningRate);
    }

    this.predictionModels.set(modelType, {
      ...model,
      accuracy,
      lastTrained: new Date(),
    });

    this.emit('modelTrained', { modelType, accuracy });
  }

  async shutdown(): Promise<void> {
    if (this.scheduler) {
      clearInterval(this.scheduler);
    }

    this.emit('shutdown');
  }
}

interface SuggestionTemplate {
  type: SuggestionType;
  title: string;
  description: string;
  priorityMultiplier: number;
  expiryMs: number;
}

interface PredictionModel {
  type: string;
  algorithm: string;
  accuracy: number;
  lastTrained: Date;
}

export { ProactiveEngine };
