import { MeetingsService } from './meetings.service';
export declare class MeetingsController {
    private readonly meetingsService;
    constructor(meetingsService: MeetingsService);
    renderBookingPage(leadId: string): Promise<string>;
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
        leadId: string;
        title: string;
        meetingLink: string;
        scheduledAt: Date;
    }>;
    findAllMeetings(req: any): Promise<({
        lead: {
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
        leadId: string;
        title: string;
        meetingLink: string;
        scheduledAt: Date;
    })[]>;
    deleteMeeting(id: string): Promise<{
        success: boolean;
    }>;
}
