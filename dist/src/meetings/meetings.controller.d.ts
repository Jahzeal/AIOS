import { MeetingsService } from './meetings.service';
import { GoogleCalendarService } from './google-calendar.service';
export declare class MeetingsController {
    private readonly meetingsService;
    private readonly googleCalendarService;
    constructor(meetingsService: MeetingsService, googleCalendarService: GoogleCalendarService);
    getGoogleAuthUrl(): {
        authUrl: string;
    };
    connectGoogleCalendar(req: any, body: {
        code: string;
    }): Promise<{
        success: boolean;
    }>;
    getGoogleConnection(req: any): Promise<{
        connected: boolean;
    } | {
        email: string;
        calendarId: string;
        connectedAt: Date;
        connected: boolean;
    }>;
    disconnectGoogleCalendar(req: any): Promise<{
        success: boolean;
    }>;
    getGoogleCalendars(req: any): Promise<any>;
    selectGoogleCalendar(req: any, body: {
        calendarId: string;
    }): Promise<{
        success: boolean;
    }>;
    createMeeting(body: {
        leadId: string;
        title: string;
        email: string;
        meetingLink: string;
        scheduledAt: string;
    }): Promise<{
        id: string;
        email: string;
        createdAt: Date;
        updatedAt: Date;
        status: string | null;
        leadId: string;
        title: string;
        meetingLink: string;
        scheduledAt: Date;
        googleEventId: string | null;
    }>;
    handleCalendarWebhook(body: {
        email: string;
        title?: string;
        meetingLink?: string;
        scheduledAt: string;
    }): Promise<{
        id: string;
        email: string;
        createdAt: Date;
        updatedAt: Date;
        status: string | null;
        leadId: string;
        title: string;
        meetingLink: string;
        scheduledAt: Date;
        googleEventId: string | null;
    }>;
    findAllMeetings(req: any): Promise<({
        lead: {
            job: {
                user: {
                    email: string;
                    username: string | null;
                } | null;
            } & {
                query: string | null;
                error: string | null;
                id: string;
                userId: string | null;
                createdAt: Date;
                updatedAt: Date;
                status: string;
                type: string;
                location: string | null;
                keywords: string | null;
            };
        } & {
            id: string;
            email: string | null;
            createdAt: Date;
            updatedAt: Date;
            jobId: string;
            companyName: string | null;
            website: string;
            phone: string | null;
            facebook: string | null;
            instagram: string | null;
            linkedin: string | null;
            twitter: string | null;
            address: string | null;
            description: string | null;
            emailStatus: string | null;
            emailSubject: string | null;
            emailBody: string | null;
            complianceReason: string | null;
            sentAt: Date | null;
        };
    } & {
        id: string;
        email: string;
        createdAt: Date;
        updatedAt: Date;
        status: string | null;
        leadId: string;
        title: string;
        meetingLink: string;
        scheduledAt: Date;
        googleEventId: string | null;
    })[]>;
    deleteMeeting(id: string): Promise<{
        success: boolean;
    }>;
}
