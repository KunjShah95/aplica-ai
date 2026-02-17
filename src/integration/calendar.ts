import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

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
  attendees?: Array<{ email: string; displayName?: string }>;
  recurrence?: string[];
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{ method: 'email' | 'popup'; minutes: number }>;
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
  calendars: Record<string, { busy: Array<{ start: string; end: string }> }>;
}

export class GoogleCalendarService {
  private oauth2Client: OAuth2Client;
  private calendar: calendar_v3.Calendar | null = null;

  constructor(config: CalendarConfig) {
    this.oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    ) as any;

    if (config.refreshToken) {
      this.oauth2Client.setCredentials({
        refresh_token: config.refreshToken,
      });
    }

    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client as any });
  }

  setCredentials(tokens: { access_token?: string; refresh_token?: string }) {
    this.oauth2Client.setCredentials(tokens);
  }

  getAuthUrl(scopes?: string[]): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes || [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
      ],
      prompt: 'consent',
    });
  }

  async getTokenFromCode(code: string): Promise<{
    access_token: string;
    refresh_token: string;
    expiry_date: number;
  }> {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    return tokens as any;
  }

  async listCalendars(): Promise<CalendarListEntry[]> {
    if (!this.calendar) throw new Error('Calendar not initialized');

    const response = await this.calendar.calendarList.list();

    return (response.data.items || []).map((cal) => ({
      id: cal.id || '',
      summary: cal.summary || '',
      description: cal.description || undefined,
      primary: cal.primary || false,
      accessRole: cal.accessRole || 'freeBusyReader',
    }));
  }

  async getCalendar(calendarId: string): Promise<CalendarListEntry> {
    if (!this.calendar) throw new Error('Calendar not initialized');

    const response = await this.calendar.calendars.get({ calendarId });
    const cal = response.data;

    return {
      id: cal.id || '',
      summary: cal.summary || '',
      description: cal.description || undefined,
      accessRole: 'owner',
    };
  }

  async createCalendar(summary: string, description?: string, timeZone?: string): Promise<string> {
    if (!this.calendar) throw new Error('Calendar not initialized');

    const response = await this.calendar.calendars.insert({
      requestBody: {
        summary,
        description,
        timeZone: timeZone || 'UTC',
      },
    });

    return response.data.id || '';
  }

  async deleteCalendar(calendarId: string): Promise<void> {
    if (!this.calendar) throw new Error('Calendar not initialized');

    await this.calendar.calendars.delete({ calendarId });
  }

  async listEvents(
    calendarId: string,
    options?: {
      timeMin?: string;
      timeMax?: string;
      maxResults?: number;
      singleEvents?: boolean;
      orderBy?: 'startTime' | 'updated';
      q?: string;
    }
  ): Promise<CalendarEvent[]> {
    if (!this.calendar) throw new Error('Calendar not initialized');

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
      reminders: event.reminders as any,
    }));
  }

  async getEvent(calendarId: string, eventId: string): Promise<CalendarEvent | null> {
    if (!this.calendar) throw new Error('Calendar not initialized');

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
        reminders: event.reminders as any,
      };
    } catch {
      return null;
    }
  }

  async createEvent(calendarId: string, event: CalendarEvent): Promise<string> {
    if (!this.calendar) throw new Error('Calendar not initialized');

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

  async updateEvent(
    calendarId: string,
    eventId: string,
    event: Partial<CalendarEvent>
  ): Promise<void> {
    if (!this.calendar) throw new Error('Calendar not initialized');

    const updateData: calendar_v3.Schema$Event = {};

    if (event.summary !== undefined) updateData.summary = event.summary;
    if (event.description !== undefined) updateData.description = event.description;
    if (event.location !== undefined) updateData.location = event.location;
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
    if (event.recurrence !== undefined) updateData.recurrence = event.recurrence;
    if (event.reminders !== undefined) updateData.reminders = event.reminders as any;

    await this.calendar.events.patch({
      calendarId,
      eventId,
      requestBody: updateData,
    });
  }

  async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    if (!this.calendar) throw new Error('Calendar not initialized');

    await this.calendar.events.delete({
      calendarId,
      eventId,
    });
  }

  async getFreeBusy(request: FreeBusyRequest): Promise<FreeBusyResult> {
    if (!this.calendar) throw new Error('Calendar not initialized');

    const response = await this.calendar.freebusy.query({
      requestBody: {
        timeMin: request.timeMin,
        timeMax: request.timeMax,
        items: request.calendars.map((id) => ({ id })),
      },
    });

    const result: FreeBusyResult = {
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

  async quickAdd(calendarId: string, text: string): Promise<string> {
    if (!this.calendar) throw new Error('Calendar not initialized');

    const response = await this.calendar.events.quickAdd({
      calendarId,
      text,
    });

    return response.data.id || '';
  }

  async watchChanges(calendarId: string, webhookUrl: string, channelId: string): Promise<string> {
    if (!this.calendar) throw new Error('Calendar not initialized');

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

  async stopWatch(channelId: string): Promise<void> {
    if (!this.calendar) throw new Error('Calendar not initialized');

    await this.calendar.channels.stop({
      requestBody: {
        id: channelId,
      },
    });
  }
}

export function createCalendarService(config: CalendarConfig): GoogleCalendarService {
  return new GoogleCalendarService(config);
}
