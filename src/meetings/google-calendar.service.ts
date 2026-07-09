/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any */
import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class GoogleCalendarService implements OnModuleInit {
  private readonly logger = new Logger(GoogleCalendarService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    // Run calendar sync loop every 2 minutes
    this.logger.log(
      'Initializing Google Calendar Synchronization loop (2m)...',
    );
    setInterval(() => {
      this.syncAll().catch((err) => {
        this.logger.error(
          `Error in automated calendar sync loop: ${err.message}`,
        );
      });
    }, 120000);
  }

  getAuthUrl(): string {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const redirectUri =
      this.configService.get<string>('GOOGLE_REDIRECT_URI') ||
      'http://localhost:5173/dashboard';

    if (!clientId) {
      throw new BadRequestException(
        'Google Client ID is not configured on the server',
      );
    }

    const scope = 'https://www.googleapis.com/auth/calendar.events';

    return (
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scope)}&` +
      `access_type=offline&` +
      `prompt=consent`
    );
  }

  async connect(userId: string, code: string) {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
    const redirectUri =
      this.configService.get<string>('GOOGLE_REDIRECT_URI') ||
      'http://localhost:5173/dashboard';

    if (!clientId || !clientSecret) {
      throw new BadRequestException(
        'Google OAuth client credentials are not configured on the server',
      );
    }

    let tokens: any;
    try {
      const res = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      });
      tokens = res.data;
    } catch (err: any) {
      const details = err.response?.data
        ? JSON.stringify(err.response.data)
        : err.message;
      this.logger.error(`Failed to exchange auth code: ${details}`);
      throw new BadRequestException(
        `Failed to exchange Google authorization code: ${details}`,
      );
    }

    let email = 'unknown@google.com';
    try {
      const infoRes = await axios.get(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        },
      );
      email = infoRes.data.email || email;
    } catch {
      if (tokens.id_token) {
        try {
          const parts = tokens.id_token.split('.');
          if (parts[1]) {
            const payload = JSON.parse(
              Buffer.from(parts[1], 'base64').toString(),
            );
            email = payload.email || email;
          }
        } catch { /* ignore */ }
      }
    }

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    const existing = await this.prisma.googleCalendarConnection.findUnique({
      where: { userId },
    });

    if (existing) {
      await this.prisma.googleCalendarConnection.update({
        where: { userId },
        data: {
          email,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || existing.refreshToken,
          expiresAt,
        },
      });
    } else {
      if (!tokens.refresh_token) {
        throw new BadRequestException(
          'Did not receive a refresh token from Google. Please disconnect the app in your Google Account Settings -> Security, and try connecting again.',
        );
      }
      await this.prisma.googleCalendarConnection.create({
        data: {
          userId,
          email,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt,
        },
      });
    }

    // Trigger an immediate initial sync for this user
    this.syncUserCalendarByUserId(userId).catch((err) => {
      this.logger.error(
        `Failed to perform initial sync for user ${userId}: ${err.message}`,
      );
    });

    return { success: true };
  }

  async getConnection(userId: string) {
    const conn = await this.prisma.googleCalendarConnection.findUnique({
      where: { userId },
      select: { email: true, calendarId: true, connectedAt: true },
    });
    if (!conn) return { connected: false };
    return { connected: true, ...conn };
  }

  async disconnect(userId: string) {
    try {
      await this.prisma.googleCalendarConnection.delete({
        where: { userId },
      });
      return { success: true };
    } catch {
      throw new NotFoundException(
        'No active Google Calendar connection found for this user',
      );
    }
  }

  async getValidAccessToken(userId: string): Promise<string> {
    const conn = await this.prisma.googleCalendarConnection.findUnique({
      where: { userId },
    });
    if (!conn)
      throw new NotFoundException('No Google Calendar connection found');

    if (conn.expiresAt.getTime() - Date.now() < 120000) {
      const refreshed = await this.refreshTokens(conn.refreshToken);
      const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000);

      await this.prisma.googleCalendarConnection.update({
        where: { userId },
        data: {
          accessToken: refreshed.access_token,
          expiresAt,
        },
      });
      return refreshed.access_token;
    }

    return conn.accessToken;
  }

  private async refreshTokens(refreshToken: string) {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');

    try {
      const res = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      });
      return res.data;
    } catch (err: any) {
      const details = err.response?.data
        ? JSON.stringify(err.response.data)
        : err.message;
      this.logger.error(`Failed to refresh Google token: ${details}`);
      throw new UnauthorizedException(
        'Failed to refresh Google authorization token',
      );
    }
  }

  async getCalendars(userId: string) {
    const token = await this.getValidAccessToken(userId);
    try {
      const res = await axios.get(
        'https://www.googleapis.com/calendar/v3/users/me/calendarList',
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      return (res.data.items || []).map((c: any) => ({
        id: c.id,
        summary: c.summary,
        primary: c.primary || false,
      }));
    } catch {
      throw new BadRequestException(
        'Failed to fetch calendar list from Google',
      );
    }
  }

  async selectCalendar(userId: string, calendarId: string) {
    try {
      await this.prisma.googleCalendarConnection.update({
        where: { userId },
        data: { calendarId },
      });

      // Trigger an immediate sync using the newly selected calendar
      this.syncUserCalendarByUserId(userId).catch((err) => {
        this.logger.error(
          `Failed to perform initial sync after calendar change for user ${userId}: ${err.message}`,
        );
      });

      return { success: true };
    } catch {
      throw new NotFoundException(
        'No active Google Calendar connection found to update',
      );
    }
  }

  async syncUserCalendarByUserId(userId: string) {
    const conn = await this.prisma.googleCalendarConnection.findUnique({
      where: { userId },
    });
    if (conn) {
      await this.syncUserCalendar(conn);
    }
  }

  async syncAll() {
    const connections = await this.prisma.googleCalendarConnection.findMany();
    for (const conn of connections) {
      try {
        await this.syncUserCalendar(conn);
      } catch (err: any) {
        this.logger.error(
          `Failed to sync calendar for user ${conn.userId}: ${err.message}`,
        );
      }
    }
  }

  async syncUserCalendar(conn: any) {
    let token = conn.accessToken;
    if (conn.expiresAt.getTime() - Date.now() < 120000) {
      try {
        const refreshed = await this.refreshTokens(conn.refreshToken);
        const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000);
        const updated = await this.prisma.googleCalendarConnection.update({
          where: { id: conn.id },
          data: { accessToken: refreshed.access_token, expiresAt },
        });
        token = updated.accessToken;
      } catch (err: any) {
        this.logger.error(
          `Failed to automatically refresh token for connection ID ${conn.id}: ${err.message}`,
        );
        return;
      }
    }

    let events: any[] = [];
    try {
      const res = await axios.get(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(conn.calendarId)}/events`,
        {
          params: {
            timeMin: new Date(
              Date.now() - 7 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            singleEvents: true,
            maxResults: 100,
          },
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      events = res.data.items || [];
    } catch (err: any) {
      this.logger.error(
        `Failed to fetch events from Google for connection ID ${conn.id}: ${err.message}`,
      );
      return;
    }

    for (const event of events) {
      if (!event.id) continue;

      const attendees = event.attendees || [];
      const clientAttendee = attendees.find(
        (a: any) =>
          a.email && a.email.toLowerCase() !== conn.email.toLowerCase(),
      );
      const clientEmail = clientAttendee?.email?.toLowerCase().trim();

      if (!clientEmail) continue;

      const contact = await this.prisma.contact.findFirst({
        where: { email: { equals: clientEmail, mode: 'insensitive' } },
      });
      let leadId = contact?.leadId || null;

      if (!leadId) {
        const lead = await this.prisma.lead.findFirst({
          where: { email: { equals: clientEmail, mode: 'insensitive' } },
        });
        leadId = lead?.id || null;
      }

      if (!leadId) continue;

      const scheduledAt = new Date(event.start?.dateTime || event.start?.date);
      const title = event.summary || 'Google Calendar Meeting';
      const meetingLink = event.hangoutLink || event.htmlLink || '';
      const isCancelled = event.status === 'cancelled';

      const existingMeeting = await this.prisma.upcomingMeeting.findFirst({
        where: { googleEventId: event.id },
      });

      if (existingMeeting) {
        if (isCancelled) {
          await this.prisma.upcomingMeeting.update({
            where: { id: existingMeeting.id },
            data: { status: 'cancelled' },
          });
          await this.revertLeadStatusIfNoMeetings(existingMeeting.leadId);
        } else {
          await this.prisma.upcomingMeeting.update({
            where: { id: existingMeeting.id },
            data: {
              title,
              scheduledAt,
              meetingLink,
              status: 'confirmed',
            },
          });
        }
      } else if (!isCancelled) {
        await this.prisma.upcomingMeeting.create({
          data: {
            leadId,
            title,
            email: clientEmail,
            meetingLink,
            scheduledAt,
            googleEventId: event.id,
            status: 'confirmed',
          },
        });

        await this.prisma.lead.update({
          where: { id: leadId },
          data: { emailStatus: 'MEETING_BOOKED' },
        });
      }
    }
  }

  private async revertLeadStatusIfNoMeetings(leadId: string) {
    const count = await this.prisma.upcomingMeeting.count({
      where: { leadId, status: 'confirmed' },
    });
    if (count === 0) {
      await this.prisma.lead.update({
        where: { id: leadId },
        data: { emailStatus: 'REPLIED' },
      });
    }
  }
}
