import { Agent } from '../../core/agent.js';
import { AgentOptions } from '../../core/agent.js';
import { ProactiveAlert } from '../types.js';
/**
 * Foresight Agent - Proactive context monitoring and alerting
 */
export declare class ForesightAgent extends Agent {
    private calendars;
    private inboxes;
    private codebaseWatchers;
    private userHabits;
    private alerts;
    private monitoringEnabled;
    constructor(options: AgentOptions);
    /**
     * Start monitoring a calendar
     */
    startCalendarMonitoring(userId: string, calendarId: string): void;
    /**
     * Start monitoring an inbox
     */
    startInboxMonitoring(userId: string, inboxId: string): void;
    /**
     * Start watching codebase changes
     */
    startCodebaseMonitoring(userId: string, repoPath: string, patterns: string[]): void;
    /**
     * Process calendar event
     */
    processCalendarEvent(userId: string, event: CalendarEvent): Promise<ProactiveAlert[]>;
    /**
     * Check if two events conflict
     */
    private eventsConflict;
    /**
     * Update calendar with new event
     */
    private updateCalendar;
    /**
     * Process inbox item
     */
    processInboxItem(userId: string, item: InboxItem): Promise<ProactiveAlert[]>;
    /**
     * Update inbox with new item
     */
    private updateInbox;
    /**
     * Scan codebase for changes
     */
    scanCodebase(userId: string, repoPath: string): Promise<ProactiveAlert[]>;
    /**
     * Simulate codebase scan
     */
    private simulateScan;
    /**
     * Monitor user habits
     */
    monitorHabits(userId: string): Promise<ProactiveAlert[]>;
    /**
     * Get all pending alerts
     */
    getAlerts(): ProactiveAlert[];
    /**
     * Clear alerts
     */
    clearAlerts(): void;
    /**
     * Generate proactive context summary
     */
    generateContextSummary(userId: string): Promise<ContextSummary>;
    /**
     * Summarize user habits
     */
    private summarizeHabits;
}
export interface CalendarEvent {
    id: string;
    calendarId: string;
    summary: string;
    startTime: string;
    duration?: number;
    participants?: string[];
}
export interface InboxItem {
    id: string;
    inboxId: string;
    sender: string;
    subject: string;
    body: string;
    timestamp: string;
}
export interface FileWatcher {
    repoPath: string;
    patterns: string[];
    lastScan: Date;
    changes: FileChange[];
}
export interface FileChange {
    file: string;
    changeType: 'added' | 'modified' | 'deleted';
    linesChanged: number;
    timestamp: Date;
}
export interface HabitRecord {
    userId: string;
    hour: number;
    activityLevel: number;
    timestamp: Date;
}
export interface ContextSummary {
    timestamp: Date;
    userId: string;
    upcomingEvents: CalendarEvent[];
    recentInbox: InboxItem[];
    recentCodebaseChanges: FileChange[];
    userHabitsSummary: string;
}
/**
 * Factory function to create a foresight agent
 */
export declare function createForesightAgent(options: AgentOptions): ForesightAgent;
//# sourceMappingURL=foresight-agent.d.ts.map