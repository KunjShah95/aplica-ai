import { db } from '../db/index.js';
export class GoogleCalendarProvider {
    accessToken;
    calendarId;
    baseUrl = 'https://www.googleapis.com/calendar/v3';
    constructor(accessToken, calendarId = 'primary') {
        this.accessToken = accessToken;
        this.calendarId = calendarId;
    }
    async request(endpoint, options = {}) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Google Calendar API error: ${error}`);
        }
        return response.json();
    }
    async listEvents(startDate, endDate) {
        const params = new URLSearchParams({
            timeMin: startDate.toISOString(),
            timeMax: endDate.toISOString(),
            singleEvents: 'true',
            orderBy: 'startTime',
        });
        const response = await this.request(`/calendars/${this.calendarId}/events?${params}`);
        return response.items.map(this.mapEvent);
    }
    async getEvent(eventId) {
        try {
            const event = await this.request(`/calendars/${this.calendarId}/events/${eventId}`);
            return this.mapEvent(event);
        }
        catch {
            return null;
        }
    }
    async createEvent(input) {
        const body = {
            summary: input.title,
            description: input.description,
            start: { dateTime: input.start.toISOString() },
            end: { dateTime: input.end.toISOString() },
            location: input.location,
            attendees: input.attendees?.map(email => ({ email })),
            reminders: input.reminders ? {
                useDefault: false,
                overrides: input.reminders.map(r => ({
                    method: r.method,
                    minutes: r.minutes,
                })),
            } : undefined,
            recurrence: input.recurrence ? [input.recurrence] : undefined,
        };
        const event = await this.request(`/calendars/${this.calendarId}/events`, { method: 'POST', body: JSON.stringify(body) });
        return this.mapEvent(event);
    }
    async updateEvent(eventId, input) {
        const body = {};
        if (input.title)
            body.summary = input.title;
        if (input.description)
            body.description = input.description;
        if (input.start)
            body.start = { dateTime: input.start.toISOString() };
        if (input.end)
            body.end = { dateTime: input.end.toISOString() };
        if (input.location)
            body.location = input.location;
        if (input.attendees)
            body.attendees = input.attendees.map(email => ({ email }));
        const event = await this.request(`/calendars/${this.calendarId}/events/${eventId}`, { method: 'PATCH', body: JSON.stringify(body) });
        return this.mapEvent(event);
    }
    async deleteEvent(eventId) {
        await this.request(`/calendars/${this.calendarId}/events/${eventId}`, { method: 'DELETE' });
    }
    async findFreeSlots(startDate, endDate, durationMinutes) {
        const events = await this.listEvents(startDate, endDate);
        const slots = [];
        const sortedEvents = events.sort((a, b) => a.start.getTime() - b.start.getTime());
        let currentTime = startDate;
        for (const event of sortedEvents) {
            const gapMinutes = (event.start.getTime() - currentTime.getTime()) / 60000;
            if (gapMinutes >= durationMinutes) {
                slots.push({
                    start: new Date(currentTime),
                    end: new Date(currentTime.getTime() + durationMinutes * 60000),
                });
            }
            if (event.end > currentTime) {
                currentTime = event.end;
            }
        }
        const finalGap = (endDate.getTime() - currentTime.getTime()) / 60000;
        if (finalGap >= durationMinutes) {
            slots.push({
                start: new Date(currentTime),
                end: new Date(currentTime.getTime() + durationMinutes * 60000),
            });
        }
        return slots;
    }
    mapEvent(event) {
        return {
            id: event.id,
            title: event.summary || 'Untitled',
            description: event.description,
            start: new Date(event.start?.dateTime || event.start?.date),
            end: new Date(event.end?.dateTime || event.end?.date),
            location: event.location,
            attendees: event.attendees?.map((a) => a.email),
            recurrence: event.recurrence?.[0],
            metadata: {
                htmlLink: event.htmlLink,
                status: event.status,
                creator: event.creator,
                organizer: event.organizer,
            },
        };
    }
}
export class LocalCalendarProvider {
    userId;
    constructor(userId) {
        this.userId = userId;
    }
    async listEvents(startDate, endDate) {
        const tasks = await db.scheduledTask.findMany({
            where: {
                nextRunAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            orderBy: { nextRunAt: 'asc' },
        });
        return tasks.map((task) => ({
            id: task.id,
            title: task.name,
            description: task.description || undefined,
            start: task.nextRunAt || new Date(),
            end: new Date((task.nextRunAt || new Date()).getTime() + 30 * 60000),
            metadata: task.payload,
        }));
    }
    async getEvent(eventId) {
        const task = await db.scheduledTask.findUnique({
            where: { id: eventId },
        });
        if (!task)
            return null;
        return {
            id: task.id,
            title: task.name,
            description: task.description || undefined,
            start: task.nextRunAt || new Date(),
            end: new Date((task.nextRunAt || new Date()).getTime() + 30 * 60000),
            metadata: task.payload,
        };
    }
    async createEvent(input) {
        const task = await db.scheduledTask.create({
            data: {
                name: input.title,
                description: input.description,
                type: 'ONE_TIME',
                schedule: { at: input.start.toISOString() },
                nextRunAt: input.start,
                payload: {
                    end: input.end.toISOString(),
                    location: input.location,
                    attendees: input.attendees,
                },
            },
        });
        return {
            id: task.id,
            title: task.name,
            description: task.description || undefined,
            start: input.start,
            end: input.end,
            location: input.location,
            attendees: input.attendees,
        };
    }
    async updateEvent(eventId, input) {
        const existing = await this.getEvent(eventId);
        if (!existing)
            throw new Error('Event not found');
        const task = await db.scheduledTask.update({
            where: { id: eventId },
            data: {
                name: input.title || existing.title,
                description: input.description,
                nextRunAt: input.start,
                payload: {
                    ...existing.metadata,
                    end: input.end?.toISOString(),
                    location: input.location,
                    attendees: input.attendees,
                },
            },
        });
        return {
            id: task.id,
            title: task.name,
            description: task.description || undefined,
            start: input.start || existing.start,
            end: input.end || existing.end,
            location: input.location || existing.location,
            attendees: input.attendees || existing.attendees,
        };
    }
    async deleteEvent(eventId) {
        await db.scheduledTask.delete({
            where: { id: eventId },
        });
    }
    async findFreeSlots(startDate, endDate, durationMinutes) {
        const events = await this.listEvents(startDate, endDate);
        const slots = [];
        let currentTime = new Date(startDate);
        const sortedEvents = events.sort((a, b) => a.start.getTime() - b.start.getTime());
        for (const event of sortedEvents) {
            const gapMs = event.start.getTime() - currentTime.getTime();
            if (gapMs >= durationMinutes * 60000) {
                slots.push({
                    start: new Date(currentTime),
                    end: new Date(currentTime.getTime() + durationMinutes * 60000),
                });
            }
            currentTime = new Date(Math.max(currentTime.getTime(), event.end.getTime()));
        }
        if (endDate.getTime() - currentTime.getTime() >= durationMinutes * 60000) {
            slots.push({
                start: new Date(currentTime),
                end: new Date(currentTime.getTime() + durationMinutes * 60000),
            });
        }
        return slots;
    }
}
export class CalendarService {
    providers = new Map();
    registerProvider(name, provider) {
        this.providers.set(name, provider);
    }
    getProvider(name) {
        return this.providers.get(name);
    }
    async listAllEvents(startDate, endDate) {
        const allEvents = [];
        for (const [name, provider] of this.providers) {
            try {
                const events = await provider.listEvents(startDate, endDate);
                allEvents.push(...events.map(e => ({ ...e, metadata: { ...e.metadata, provider: name } })));
            }
            catch (error) {
                console.error(`Failed to fetch events from ${name}:`, error);
            }
        }
        return allEvents.sort((a, b) => a.start.getTime() - b.start.getTime());
    }
    async suggestMeetingTime(attendees, durationMinutes, preferredStartDate, preferredEndDate) {
        const provider = this.providers.get('primary') || this.providers.values().next().value;
        if (!provider) {
            throw new Error('No calendar provider available');
        }
        return provider.findFreeSlots(preferredStartDate, preferredEndDate, durationMinutes);
    }
    async getUpcoming(hours = 24) {
        const now = new Date();
        const endDate = new Date(now.getTime() + hours * 60 * 60 * 1000);
        return this.listAllEvents(now, endDate);
    }
    async getTodaySchedule() {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
        return this.listAllEvents(startOfDay, endOfDay);
    }
}
export const calendarService = new CalendarService();
//# sourceMappingURL=calendar.js.map