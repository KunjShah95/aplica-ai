import { google } from 'googleapis';
export class GoogleCalendarService {
    oauth2Client;
    calendar = null;
    constructor(config) {
        this.oauth2Client = new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUri);
        if (config.refreshToken) {
            this.oauth2Client.setCredentials({
                refresh_token: config.refreshToken,
            });
        }
        this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    }
    setCredentials(tokens) {
        this.oauth2Client.setCredentials(tokens);
    }
    getAuthUrl(scopes) {
        return this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes || [
                'https://www.googleapis.com/auth/calendar',
                'https://www.googleapis.com/auth/calendar.events',
            ],
            prompt: 'consent',
        });
    }
    async getTokenFromCode(code) {
        const { tokens } = await this.oauth2Client.getToken(code);
        this.oauth2Client.setCredentials(tokens);
        return tokens;
    }
    async listCalendars() {
        if (!this.calendar)
            throw new Error('Calendar not initialized');
        const response = await this.calendar.calendarList.list();
        return (response.data.items || []).map((cal) => ({
            id: cal.id || '',
            summary: cal.summary || '',
            description: cal.description || undefined,
            primary: cal.primary || false,
            accessRole: cal.accessRole || 'freeBusyReader',
        }));
    }
    async getCalendar(calendarId) {
        if (!this.calendar)
            throw new Error('Calendar not initialized');
        const response = await this.calendar.calendars.get({ calendarId });
        const cal = response.data;
        return {
            id: cal.id || '',
            summary: cal.summary || '',
            description: cal.description || undefined,
            accessRole: 'owner',
        };
    }
    async createCalendar(summary, description, timeZone) {
        if (!this.calendar)
            throw new Error('Calendar not initialized');
        const response = await this.calendar.calendars.insert({
            requestBody: {
                summary,
                description,
                timeZone: timeZone || 'UTC',
            },
        });
        return response.data.id || '';
    }
    async deleteCalendar(calendarId) {
        if (!this.calendar)
            throw new Error('Calendar not initialized');
        await this.calendar.calendars.delete({ calendarId });
    }
    async listEvents(calendarId, options) {
        if (!this.calendar)
            throw new Error('Calendar not initialized');
        const response = await this.calendar.events.list({
            calendarId,
            timeMin: options?.timeMin || new Date().toISOString(),
            timeMax: options?.timeMax,
            maxResults: options?.maxResults || 100,
            singleEvents: options?.singleEvents ?? true,
            orderBy: options?.orderBy || 'startTime',
            q: options?.q,
        });
        return (response.data.items || []).map((event) => ({
            id: event.id || undefined,
            summary: event.summary || '',
            description: event.description || undefined,
            location: event.location || undefined,
            start: {
                dateTime: event.start?.dateTime || event.start?.date || '',
                timeZone: event.start?.timeZone || undefined,
            },
            end: {
                dateTime: event.end?.dateTime || event.end?.date || '',
                timeZone: event.end?.timeZone || undefined,
            },
            attendees: event.attendees?.map((a) => ({
                email: a.email || '',
                displayName: a.displayName || undefined,
            })),
            recurrence: event.recurrence || undefined,
            reminders: event.reminders,
        }));
    }
    async getEvent(calendarId, eventId) {
        if (!this.calendar)
            throw new Error('Calendar not initialized');
        try {
            const response = await this.calendar.events.get({
                calendarId,
                eventId,
            });
            const event = response.data;
            return {
                id: event.id || undefined,
                summary: event.summary || '',
                description: event.description || undefined,
                location: event.location || undefined,
                start: {
                    dateTime: event.start?.dateTime || event.start?.date || '',
                    timeZone: event.start?.timeZone || undefined,
                },
                end: {
                    dateTime: event.end?.dateTime || event.end?.date || '',
                    timeZone: event.end?.timeZone || undefined,
                },
                attendees: event.attendees?.map((a) => ({
                    email: a.email || '',
                    displayName: a.displayName || undefined,
                })),
                recurrence: event.recurrence || undefined,
                reminders: event.reminders,
            };
        }
        catch {
            return null;
        }
    }
    async createEvent(calendarId, event) {
        if (!this.calendar)
            throw new Error('Calendar not initialized');
        const response = await this.calendar.events.insert({
            calendarId,
            requestBody: {
                summary: event.summary,
                description: event.description,
                location: event.location,
                start: {
                    dateTime: event.start.dateTime,
                    timeZone: event.start.timeZone,
                },
                end: {
                    dateTime: event.end.dateTime,
                    timeZone: event.end.timeZone,
                },
                attendees: event.attendees?.map((a) => ({
                    email: a.email,
                    displayName: a.displayName,
                })),
                recurrence: event.recurrence,
                reminders: event.reminders,
            },
        });
        return response.data.id || '';
    }
    async updateEvent(calendarId, eventId, event) {
        if (!this.calendar)
            throw new Error('Calendar not initialized');
        const updateData = {};
        if (event.summary !== undefined)
            updateData.summary = event.summary;
        if (event.description !== undefined)
            updateData.description = event.description;
        if (event.location !== undefined)
            updateData.location = event.location;
        if (event.start !== undefined)
            updateData.start = {
                dateTime: event.start.dateTime,
                timeZone: event.start.timeZone,
            };
        if (event.end !== undefined)
            updateData.end = {
                dateTime: event.end.dateTime,
                timeZone: event.end.timeZone,
            };
        if (event.attendees !== undefined)
            updateData.attendees = event.attendees.map((a) => ({
                email: a.email,
                displayName: a.displayName,
            }));
        if (event.recurrence !== undefined)
            updateData.recurrence = event.recurrence;
        if (event.reminders !== undefined)
            updateData.reminders = event.reminders;
        await this.calendar.events.patch({
            calendarId,
            eventId,
            requestBody: updateData,
        });
    }
    async deleteEvent(calendarId, eventId) {
        if (!this.calendar)
            throw new Error('Calendar not initialized');
        await this.calendar.events.delete({
            calendarId,
            eventId,
        });
    }
    async getFreeBusy(request) {
        if (!this.calendar)
            throw new Error('Calendar not initialized');
        const response = await this.calendar.freebusy.query({
            requestBody: {
                timeMin: request.timeMin,
                timeMax: request.timeMax,
                items: request.calendars.map((id) => ({ id })),
            },
        });
        const result = {
            calendars: {},
        };
        for (const [calId, busy] of Object.entries(response.data.calendars || {})) {
            result.calendars[calId] = {
                busy: (busy?.busy || []).map((b) => ({
                    start: b.start || '',
                    end: b.end || '',
                })),
            };
        }
        return result;
    }
    async quickAdd(calendarId, text) {
        if (!this.calendar)
            throw new Error('Calendar not initialized');
        const response = await this.calendar.events.quickAdd({
            calendarId,
            text,
        });
        return response.data.id || '';
    }
    async watchChanges(calendarId, webhookUrl, channelId) {
        if (!this.calendar)
            throw new Error('Calendar not initialized');
        const response = await this.calendar.events.watch({
            calendarId,
            requestBody: {
                id: channelId,
                type: 'web_hook',
                address: webhookUrl,
                expiration: String(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        });
        return response.data.resourceId || '';
    }
    async stopWatch(channelId) {
        if (!this.calendar)
            throw new Error('Calendar not initialized');
        await this.calendar.channels.stop({
            requestBody: {
                id: channelId,
            },
        });
    }
}
export function createCalendarService(config) {
    return new GoogleCalendarService(config);
}
//# sourceMappingURL=calendar.js.map