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
        createdAt: Date;
        userId: string | null;
        updatedAt: Date;
        type: string;
        location: string | null;
        keywords: string | null;
        status: string;
    }>;
    createUrlJob(req: any, body: {
        urls: string[];
    }): Promise<{
        query: string | null;
        error: string | null;
        id: string;
        createdAt: Date;
        userId: string | null;
        updatedAt: Date;
        type: string;
        location: string | null;
        keywords: string | null;
        status: string;
    }>;
    findAllJobs(req: any): Promise<({
        _count: {
            leads: number;
        };
    } & {
        query: string | null;
        error: string | null;
        id: string;
        createdAt: Date;
        userId: string | null;
        updatedAt: Date;
        type: string;
        location: string | null;
        keywords: string | null;
        status: string;
    })[]>;
    findOneJob(req: any, id: string): Promise<({
        leads: ({
            contacts: {
                id: string;
                createdAt: Date;
                name: string | null;
                leadId: string;
                email: string | null;
                updatedAt: Date;
                phone: string | null;
                linkedin: string | null;
                emailStatus: string | null;
                sentAt: Date | null;
                role: string | null;
            }[];
        } & {
            id: string;
            createdAt: Date;
            email: string | null;
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
        createdAt: Date;
        userId: string | null;
        updatedAt: Date;
        type: string;
        location: string | null;
        keywords: string | null;
        status: string;
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
            leadId: string;
            updatedAt: Date;
            from: string;
            subject: string;
            bodyText: string | null;
            bodyHtml: string | null;
            receivedAt: Date;
            draftedReplySubject: string | null;
            draftedReplyBody: string | null;
            draftedReplyStatus: string;
        }[];
        contacts: {
            id: string;
            createdAt: Date;
            name: string | null;
            leadId: string;
            email: string | null;
            updatedAt: Date;
            phone: string | null;
            linkedin: string | null;
            emailStatus: string | null;
            sentAt: Date | null;
            role: string | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        email: string | null;
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
        createdAt: Date;
        userId: string | null;
        updatedAt: Date;
        type: string;
        location: string | null;
        keywords: string | null;
        status: string;
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
