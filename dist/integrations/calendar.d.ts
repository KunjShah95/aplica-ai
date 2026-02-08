export interface CalendarEvent {
    id: string;
    title: string;
    description?: string;
    start: Date;
    end: Date;
    location?: string;
    attendees?: string[];
    reminders?: {
        minutes: number;
        method: 'email' | 'popup';
    }[];
    recurrence?: string;
    metadata?: Record<string, unknown>;
}
export interface CreateEventInput {
    title: string;
    description?: string;
    start: Date;
    end: Date;
    location?: string;
    attendees?: string[];
    reminders?: {
        minutes: number;
        method: 'email' | 'popup';
    }[];
    recurrence?: string;
}
export interface CalendarProvider {
    listEvents(startDate: Date, endDate: Date): Promise<CalendarEvent[]>;
    getEvent(eventId: string): Promise<CalendarEvent | null>;
    createEvent(event: CreateEventInput): Promise<CalendarEvent>;
    updateEvent(eventId: string, event: Partial<CreateEventInput>): Promise<CalendarEvent>;
    deleteEvent(eventId: string): Promise<void>;
    findFreeSlots(startDate: Date, endDate: Date, duration: number): Promise<{
        start: Date;
        end: Date;
    }[]>;
}
export declare class GoogleCalendarProvider implements CalendarProvider {
    private accessToken;
    private calendarId;
    private baseUrl;
    constructor(accessToken: string, calendarId?: string);
    private request;
    listEvents(startDate: Date, endDate: Date): Promise<CalendarEvent[]>;
    getEvent(eventId: string): Promise<CalendarEvent | null>;
    createEvent(input: CreateEventInput): Promise<CalendarEvent>;
    updateEvent(eventId: string, input: Partial<CreateEventInput>): Promise<CalendarEvent>;
    deleteEvent(eventId: string): Promise<void>;
    findFreeSlots(startDate: Date, endDate: Date, durationMinutes: number): Promise<{
        start: Date;
        end: Date;
    }[]>;
    private mapEvent;
}
export declare class LocalCalendarProvider implements CalendarProvider {
    private userId;
    constructor(userId: string);
    listEvents(startDate: Date, endDate: Date): Promise<CalendarEvent[]>;
    getEvent(eventId: string): Promise<CalendarEvent | null>;
    createEvent(input: CreateEventInput): Promise<CalendarEvent>;
    updateEvent(eventId: string, input: Partial<CreateEventInput>): Promise<CalendarEvent>;
    deleteEvent(eventId: string): Promise<void>;
    findFreeSlots(startDate: Date, endDate: Date, durationMinutes: number): Promise<{
        start: Date;
        end: Date;
    }[]>;
}
export declare class CalendarService {
    private providers;
    registerProvider(name: string, provider: CalendarProvider): void;
    getProvider(name: string): CalendarProvider | undefined;
    listAllEvents(startDate: Date, endDate: Date): Promise<CalendarEvent[]>;
    suggestMeetingTime(attendees: string[], durationMinutes: number, preferredStartDate: Date, preferredEndDate: Date): Promise<{
        start: Date;
        end: Date;
    }[]>;
    getUpcoming(hours?: number): Promise<CalendarEvent[]>;
    getTodaySchedule(): Promise<CalendarEvent[]>;
}
export declare const calendarService: CalendarService;
//# sourceMappingURL=calendar.d.ts.map