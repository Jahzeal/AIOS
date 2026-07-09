"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var GoogleCalendarService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleCalendarService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const config_1 = require("@nestjs/config");
const axios_1 = __importDefault(require("axios"));
let GoogleCalendarService = GoogleCalendarService_1 = class GoogleCalendarService {
    prisma;
    configService;
    logger = new common_1.Logger(GoogleCalendarService_1.name);
    constructor(prisma, configService) {
        this.prisma = prisma;
        this.configService = configService;
    }
    onModuleInit() {
        this.logger.log('Initializing Google Calendar Synchronization loop (2m)...');
        setInterval(() => {
            this.syncAll().catch((err) => {
                this.logger.error(`Error in automated calendar sync loop: ${err.message}`);
            });
        }, 120000);
    }
    getAuthUrl() {
        const clientId = this.configService.get('GOOGLE_CLIENT_ID');
        const redirectUri = this.configService.get('GOOGLE_REDIRECT_URI') ||
            'http://localhost:5173/dashboard';
        if (!clientId) {
            throw new common_1.BadRequestException('Google Client ID is not configured on the server');
        }
        const scope = 'https://www.googleapis.com/auth/calendar.events';
        return (`https://accounts.google.com/o/oauth2/v2/auth?` +
            `client_id=${encodeURIComponent(clientId)}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `response_type=code&` +
            `scope=${encodeURIComponent(scope)}&` +
            `access_type=offline&` +
            `prompt=consent`);
    }
    async connect(userId, code) {
        const clientId = this.configService.get('GOOGLE_CLIENT_ID');
        const clientSecret = this.configService.get('GOOGLE_CLIENT_SECRET');
        const redirectUri = this.configService.get('GOOGLE_REDIRECT_URI') ||
            'http://localhost:5173/dashboard';
        if (!clientId || !clientSecret) {
            throw new common_1.BadRequestException('Google OAuth client credentials are not configured on the server');
        }
        let tokens;
        try {
            const res = await axios_1.default.post('https://oauth2.googleapis.com/token', {
                client_id: clientId,
                client_secret: clientSecret,
                code,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
            });
            tokens = res.data;
        }
        catch (err) {
            const details = err.response?.data
                ? JSON.stringify(err.response.data)
                : err.message;
            this.logger.error(`Failed to exchange auth code: ${details}`);
            throw new common_1.BadRequestException(`Failed to exchange Google authorization code: ${details}`);
        }
        let email = 'unknown@google.com';
        try {
            const infoRes = await axios_1.default.get('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: { Authorization: `Bearer ${tokens.access_token}` },
            });
            email = infoRes.data.email || email;
        }
        catch {
            if (tokens.id_token) {
                try {
                    const parts = tokens.id_token.split('.');
                    if (parts[1]) {
                        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
                        email = payload.email || email;
                    }
                }
                catch { }
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
        }
        else {
            if (!tokens.refresh_token) {
                throw new common_1.BadRequestException('Did not receive a refresh token from Google. Please disconnect the app in your Google Account Settings -> Security, and try connecting again.');
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
        this.syncUserCalendarByUserId(userId).catch((err) => {
            this.logger.error(`Failed to perform initial sync for user ${userId}: ${err.message}`);
        });
        return { success: true };
    }
    async getConnection(userId) {
        const conn = await this.prisma.googleCalendarConnection.findUnique({
            where: { userId },
            select: { email: true, calendarId: true, connectedAt: true },
        });
        if (!conn)
            return { connected: false };
        return { connected: true, ...conn };
    }
    async disconnect(userId) {
        try {
            await this.prisma.googleCalendarConnection.delete({
                where: { userId },
            });
            return { success: true };
        }
        catch {
            throw new common_1.NotFoundException('No active Google Calendar connection found for this user');
        }
    }
    async getValidAccessToken(userId) {
        const conn = await this.prisma.googleCalendarConnection.findUnique({
            where: { userId },
        });
        if (!conn)
            throw new common_1.NotFoundException('No Google Calendar connection found');
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
    async refreshTokens(refreshToken) {
        const clientId = this.configService.get('GOOGLE_CLIENT_ID');
        const clientSecret = this.configService.get('GOOGLE_CLIENT_SECRET');
        try {
            const res = await axios_1.default.post('https://oauth2.googleapis.com/token', {
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: refreshToken,
                grant_type: 'refresh_token',
            });
            return res.data;
        }
        catch (err) {
            const details = err.response?.data
                ? JSON.stringify(err.response.data)
                : err.message;
            this.logger.error(`Failed to refresh Google token: ${details}`);
            throw new common_1.UnauthorizedException('Failed to refresh Google authorization token');
        }
    }
    async getCalendars(userId) {
        const token = await this.getValidAccessToken(userId);
        try {
            const res = await axios_1.default.get('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
                headers: { Authorization: `Bearer ${token}` },
            });
            return (res.data.items || []).map((c) => ({
                id: c.id,
                summary: c.summary,
                primary: c.primary || false,
            }));
        }
        catch {
            throw new common_1.BadRequestException('Failed to fetch calendar list from Google');
        }
    }
    async selectCalendar(userId, calendarId) {
        try {
            await this.prisma.googleCalendarConnection.update({
                where: { userId },
                data: { calendarId },
            });
            this.syncUserCalendarByUserId(userId).catch((err) => {
                this.logger.error(`Failed to perform initial sync after calendar change for user ${userId}: ${err.message}`);
            });
            return { success: true };
        }
        catch {
            throw new common_1.NotFoundException('No active Google Calendar connection found to update');
        }
    }
    async syncUserCalendarByUserId(userId) {
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
            }
            catch (err) {
                this.logger.error(`Failed to sync calendar for user ${conn.userId}: ${err.message}`);
            }
        }
    }
    async syncUserCalendar(conn) {
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
            }
            catch (err) {
                this.logger.error(`Failed to automatically refresh token for connection ID ${conn.id}: ${err.message}`);
                return;
            }
        }
        let events = [];
        try {
            const res = await axios_1.default.get(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(conn.calendarId)}/events`, {
                params: {
                    timeMin: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                    singleEvents: true,
                    maxResults: 100,
                },
                headers: { Authorization: `Bearer ${token}` },
            });
            events = res.data.items || [];
        }
        catch (err) {
            this.logger.error(`Failed to fetch events from Google for connection ID ${conn.id}: ${err.message}`);
            return;
        }
        for (const event of events) {
            if (!event.id)
                continue;
            const attendees = event.attendees || [];
            const clientAttendee = attendees.find((a) => a.email && a.email.toLowerCase() !== conn.email.toLowerCase());
            const clientEmail = clientAttendee?.email?.toLowerCase().trim();
            if (!clientEmail)
                continue;
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
            if (!leadId)
                continue;
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
                }
                else {
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
            }
            else if (!isCancelled) {
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
    async revertLeadStatusIfNoMeetings(leadId) {
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
};
exports.GoogleCalendarService = GoogleCalendarService;
exports.GoogleCalendarService = GoogleCalendarService = GoogleCalendarService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], GoogleCalendarService);
//# sourceMappingURL=google-calendar.service.js.map