import { randomUUID } from 'crypto';
import { Agent } from '../../core/agent.js';
/**
 * Foresight Agent - Proactive context monitoring and alerting
 */
export class ForesightAgent extends Agent {
    calendars = new Map();
    inboxes = new Map();
    codebaseWatchers = new Map();
    userHabits = [];
    alerts = [];
    monitoringEnabled = new Set();
    constructor(options) {
        super(options);
    }
    /**
     * Start monitoring a calendar
     */
    startCalendarMonitoring(userId, calendarId) {
        this.calendars.set(`${userId}:${calendarId}`, []);
        this.monitoringEnabled.add(`calendar:${userId}:${calendarId}`);
        console.log(`[ForesightAgent] Started calendar monitoring for ${userId}`);
    }
    /**
     * Start monitoring an inbox
     */
    startInboxMonitoring(userId, inboxId) {
        this.inboxes.set(`${userId}:${inboxId}`, []);
        this.monitoringEnabled.add(`inbox:${userId}:${inboxId}`);
        console.log(`[ForesightAgent] Started inbox monitoring for ${userId}`);
    }
    /**
     * Start watching codebase changes
     */
    startCodebaseMonitoring(userId, repoPath, patterns) {
        this.codebaseWatchers.set(`${userId}:${repoPath}`, {
            repoPath,
            patterns,
            lastScan: new Date(),
            changes: [],
        });
        this.monitoringEnabled.add(`codebase:${userId}:${repoPath}`);
        console.log(`[ForesightAgent] Started codebase monitoring for ${userId}`);
    }
    /**
     * Process calendar event
     */
    async processCalendarEvent(userId, event) {
        const alerts = [];
        // Check if event is upcoming
        const now = new Date();
        const eventTime = new Date(event.startTime);
        if (eventTime.getTime() - now.getTime() < 60000 * 30) { // 30 minutes before
            alerts.push({
                id: randomUUID(),
                type: 'calendar',
                title: 'Upcoming Event',
                description: `${event.summary} starts in 30 minutes`,
                context: { event },
                timestamp: new Date(),
                suggestedAction: 'Prepare for meeting',
            });
        }
        // Check for conflicts (simplified)
        const existingEvents = this.calendars.get(`${userId}:${event.calendarId}`) || [];
        for (const existing of existingEvents) {
            if (this.eventsConflict(event, existing) && event.id !== existing.id) {
                alerts.push({
                    id: randomUUID(),
                    type: 'calendar',
                    title: 'Calendar Conflict',
                    description: `New event conflicts with "${existing.summary}"`,
                    context: { event, conflict: existing },
                    timestamp: new Date(),
                    suggestedAction: 'Review calendar',
                });
            }
        }
        // Update calendar
        this.updateCalendar(userId, event);
        return alerts;
    }
    /**
     * Check if two events conflict
     */
    eventsConflict(a, b) {
        const aStart = new Date(a.startTime);
        const aEnd = new Date(a.startTime);
        aEnd.setMinutes(aEnd.getMinutes() + (a.duration || 60));
        const bStart = new Date(b.startTime);
        const bEnd = new Date(b.startTime);
        bEnd.setMinutes(bEnd.getMinutes() + (b.duration || 60));
        return aStart < bEnd && bStart < aEnd;
    }
    /**
     * Update calendar with new event
     */
    updateCalendar(userId, event) {
        const key = `${userId}:${event.calendarId}`;
        const events = this.calendars.get(key) || [];
        events.push(event);
        this.calendars.set(key, events);
    }
    /**
     * Process inbox item
     */
    async processInboxItem(userId, item) {
        const alerts = [];
        // Check for important keywords
        const importantKeywords = ['urgent', 'asap', 'deadline', 'meeting', 'review'];
        const contentLower = (item.subject + item.body).toLowerCase();
        const hasImportant = importantKeywords.some((k) => contentLower.includes(k));
        if (hasImportant) {
            alerts.push({
                id: randomUUID(),
                type: 'inbox',
                title: 'Important Message',
                description: `Message from ${item.sender} may require attention`,
                context: { item },
                timestamp: new Date(),
                suggestedAction: 'Review email',
            });
        }
        // Update inbox
        this.updateInbox(userId, item);
        return alerts;
    }
    /**
     * Update inbox with new item
     */
    updateInbox(userId, item) {
        const key = `${userId}:${item.inboxId}`;
        const items = this.inboxes.get(key) || [];
        items.push(item);
        this.inboxes.set(key, items);
    }
    /**
     * Scan codebase for changes
     */
    async scanCodebase(userId, repoPath) {
        const alerts = [];
        const watcher = this.codebaseWatchers.get(`${userId}:${repoPath}`);
        if (!watcher) {
            return alerts;
        }
        // Simulate codebase scan
        const changes = this.simulateScan(watcher.patterns);
        if (changes.length > 0) {
            // Check if it's related to recent work
            for (const change of changes) {
                alerts.push({
                    id: randomUUID(),
                    type: 'codebase',
                    title: 'Code Change Detected',
                    description: `${change.file}: ${change.changeType}`,
                    context: { change, repo: repoPath },
                    timestamp: new Date(),
                    suggestedAction: 'Review changes',
                });
            }
            // Update watcher
            watcher.lastScan = new Date();
            watcher.changes.push(...changes);
        }
        return alerts;
    }
    /**
     * Simulate codebase scan
     */
    simulateScan(patterns) {
        // In production, would scan actual filesystem
        // For simulation, return structured data
        if (Math.random() < 0.3) { // 30% chance of changes
            return [
                {
                    file: 'src/app.ts',
                    changeType: 'modified',
                    linesChanged: Math.floor(Math.random() * 10),
                    timestamp: new Date(),
                },
            ];
        }
        return [];
    }
    /**
     * Monitor user habits
     */
    async monitorHabits(userId) {
        const alerts = [];
        const now = new Date();
        // Check for irregular patterns (simplified)
        // In production, would analyze actual usage patterns
        // Simulate: if user typically works 9-5 but activity at unusual hours
        const hour = now.getHours();
        if (hour < 6 || hour > 22) {
            alerts.push({
                id: randomUUID(),
                type: 'habit',
                title: 'Unusual Activity',
                description: 'You\'re active at an unusual hour',
                context: { hour, typicalHours: '9-17' },
                timestamp: new Date(),
                suggestedAction: 'Consider rest if tired',
            });
        }
        // Record habit
        this.userHabits.push({
            userId,
            hour,
            activityLevel: Math.random(),
            timestamp: now,
        });
        return alerts;
    }
    /**
     * Get all pending alerts
     */
    getAlerts() {
        return this.alerts;
    }
    /**
     * Clear alerts
     */
    clearAlerts() {
        this.alerts = [];
        console.log('[ForesightAgent] Alerts cleared');
    }
    /**
     * Generate proactive context summary
     */
    async generateContextSummary(userId) {
        // Get upcoming events
        const calendarKey = `${userId}:main`;
        const events = this.calendars.get(calendarKey) || [];
        const upcomingEvents = events.filter((e) => {
            const eventTime = new Date(e.startTime);
            return eventTime.getTime() > new Date().getTime();
        });
        // Get recent inbox items
        const inboxKey = `${userId}:main`;
        const inboxItems = this.inboxes.get(inboxKey) || [];
        const recentInbox = inboxItems.slice(-5);
        // Get recent codebase changes
        const watcher = this.codebaseWatchers.get(`${userId}:default`);
        const recentChanges = watcher?.changes.slice(-5) || [];
        return {
            timestamp: new Date(),
            userId,
            upcomingEvents: upcomingEvents.slice(0, 3),
            recentInbox: recentInbox,
            recentCodebaseChanges: recentChanges,
            userHabitsSummary: this.summarizeHabits(userId),
        };
    }
    /**
     * Summarize user habits
     */
    summarizeHabits(userId) {
        if (this.userHabits.length === 0)
            return 'No habit data available';
        const lastHabits = this.userHabits.slice(-10);
        const avgActivity = lastHabits.reduce((a, h) => a + h.activityLevel, 0) / lastHabits.length;
        const typicalHour = lastHabits.reduce((a, h) => a + h.hour, 0) / lastHabits.length;
        return `Typical activity hour: ${Math.round(typicalHour)}, Avg activity level: ${avgActivity.toFixed(2)}`;
    }
}
/**
 * Factory function to create a foresight agent
 */
export function createForesightAgent(options) {
    return new ForesightAgent(options);
}
//# sourceMappingURL=foresight-agent.js.map