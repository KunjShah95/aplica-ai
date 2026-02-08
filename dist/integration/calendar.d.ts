export interface CalendarConfig {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    refreshToken?: string;
}
export interface CalendarEvent {
    id?: string;
    summary: string;
    description?: string;
    location?: string;
    start: {
        dateTime: string;
        timeZone?: string;
    };
    end: {
        dateTime: string;
        timeZone?: string;
    };
    attendees?: Array<{
        email: string;
        displayName?: string;
    }>;
    recurrence?: string[];
    reminders?: {
        useDefault: boolean;
        overrides?: Array<{
            method: 'email' | 'popup';
            minutes: number;
        }>;
    };
}
export interface CalendarListEntry {
    id: string;
    summary: string;
    description?: string;
    primary?: boolean;
    accessRole: string;
}
export interface FreeBusyRequest {
    timeMin: string;
    timeMax: string;
    calendars: string[];
}
export interface FreeBusyResult {
    calendars: Record<string, {
        busy: Array<{
            start: string;
            end: string;
        }>;
    }>;
}
export declare class GoogleCalendarService {
    private oauth2Client;
    private calendar;
    constructor(config: CalendarConfig);
    setCredentials(tokens: {
        access_token?: string;
        refresh_token?: string;
    }): void;
    getAuthUrl(scopes?: string[]): string;
    getTokenFromCode(code: string): Promise<{
        access_token: string;
        refresh_token: string;
        expiry_date: number;
    }>;
    listCalendars(): Promise<CalendarListEntry[]>;
    getCalendar(calendarId: string): Promise<CalendarListEntry>;
    createCalendar(summary: string, description?: string, timeZone?: string): Promise<string>;
    deleteCalendar(calendarId: string): Promise<void>;
    listEvents(calendarId: string, options?: {
        timeMin?: string;
        timeMax?: string;
        maxResults?: number;
        singleEvents?: boolean;
        orderBy?: 'startTime' | 'updated';
        q?: string;
    }): Promise<CalendarEvent[]>;
    getEvent(calendarId: string, eventId: string): Promise<CalendarEvent | null>;
    createEvent(calendarId: string, event: CalendarEvent): Promise<string>;
    updateEvent(calendarId: string, eventId: string, event: Partial<CalendarEvent>): Promise<void>;
    deleteEvent(calendarId: string, eventId: string): Promise<void>;
    getFreeBusy(request: FreeBusyRequest): Promise<FreeBusyResult>;
    quickAdd(calendarId: string, text: string): Promise<string>;
    watchChanges(calendarId: string, webhookUrl: string, channelId: string): Promise<string>;
    stopWatch(channelId: string): Promise<void>;
}
export declare function createCalendarService(config: CalendarConfig): GoogleCalendarService;
//# sourceMappingURL=calendar.d.ts.map