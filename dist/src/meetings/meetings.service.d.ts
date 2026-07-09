import { PrismaService } from '../prisma/prisma.service';
export declare class MeetingsService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    getLead(leadId: string): Promise<{
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
    } | null>;
    createMeeting(leadId: string, title: string, email: string, meetingLink: string, scheduledAt: string): Promise<{
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
    createMeetingByEmail(email: string, title: string, meetingLink: string, scheduledAt: string): Promise<{
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
    findAllMeetings(userId?: string): Promise<({
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
