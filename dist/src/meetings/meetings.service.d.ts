import { PrismaService } from '../prisma/prisma.service';
export declare class MeetingsService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    getLead(leadId: string): Promise<{
        website: string;
        companyName: string | null;
        email: string | null;
        phone: string | null;
        facebook: string | null;
        instagram: string | null;
        linkedin: string | null;
        twitter: string | null;
        address: string | null;
        description: string | null;
        id: string;
        jobId: string;
        emailStatus: string | null;
        emailSubject: string | null;
        emailBody: string | null;
        complianceReason: string | null;
        sentAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
    createMeeting(leadId: string, title: string, email: string, meetingLink: string, scheduledAt: string): Promise<{
        email: string;
        id: string;
        createdAt: Date;
        leadId: string;
        title: string;
        meetingLink: string;
        scheduledAt: Date;
    }>;
    findAllMeetings(): Promise<({
        lead: {
            website: string;
            companyName: string | null;
            email: string | null;
            phone: string | null;
            facebook: string | null;
            instagram: string | null;
            linkedin: string | null;
            twitter: string | null;
            address: string | null;
            description: string | null;
            id: string;
            jobId: string;
            emailStatus: string | null;
            emailSubject: string | null;
            emailBody: string | null;
            complianceReason: string | null;
            sentAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
        };
    } & {
        email: string;
        id: string;
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
