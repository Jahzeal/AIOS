import { JobsService } from './jobs.service';
export declare class JobsController {
    private readonly jobsService;
    constructor(jobsService: JobsService);
    createSearchJob(req: any, body: {
        query: string;
        location: string;
        keywords?: string;
    }): Promise<{
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
    }>;
    createUrlJob(req: any, body: {
        urls: string[];
    }): Promise<{
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
    }>;
    findAllJobs(req: any): Promise<({
        _count: {
            leads: number;
        };
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
    })[]>;
    findOneJob(req: any, id: string): Promise<({
        leads: ({
            contacts: {
                id: string;
                email: string | null;
                createdAt: Date;
                updatedAt: Date;
                name: string | null;
                linkedin: string | null;
                emailStatus: string | null;
                sentAt: Date | null;
                leadId: string;
                role: string | null;
            }[];
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
        })[];
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
    }) | null>;
    findAllLeads(req: any, search?: string): Promise<({
        job: {
            query: string | null;
            type: string;
            location: string | null;
        };
        receivedEmails: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            leadId: string;
            subject: string;
            from: string;
            bodyText: string | null;
            bodyHtml: string | null;
            receivedAt: Date;
            draftedReplySubject: string | null;
            draftedReplyBody: string | null;
            draftedReplyStatus: string;
        }[];
        contacts: {
            id: string;
            email: string | null;
            createdAt: Date;
            updatedAt: Date;
            name: string | null;
            linkedin: string | null;
            emailStatus: string | null;
            sentAt: Date | null;
            leadId: string;
            role: string | null;
        }[];
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
    })[]>;
    deleteJob(req: any, id: string): Promise<{
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
    } | {
        error: string;
    }>;
    stopJob(req: any, id: string): Promise<{
        error: string;
        success?: undefined;
    } | {
        success: boolean;
        error?: undefined;
    }>;
}
