import { JobsService } from './jobs.service';
export declare class JobsController {
    private readonly jobsService;
    constructor(jobsService: JobsService);
    createSearchJob(body: {
        query: string;
        location: string;
    }): Promise<{
        status: string;
        query: string | null;
        error: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: string;
        location: string | null;
    }>;
    createUrlJob(body: {
        urls: string[];
    }): Promise<{
        status: string;
        query: string | null;
        error: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: string;
        location: string | null;
    }>;
    findAllJobs(): Promise<({
        _count: {
            leads: number;
        };
    } & {
        status: string;
        query: string | null;
        error: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: string;
        location: string | null;
    })[]>;
    findOneJob(id: string): Promise<({
        leads: ({
            contacts: {
                email: string | null;
                linkedin: string | null;
                id: string;
                emailStatus: string | null;
                sentAt: Date | null;
                createdAt: Date;
                updatedAt: Date;
                name: string | null;
                leadId: string;
                role: string | null;
            }[];
        } & {
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
        })[];
    } & {
        status: string;
        query: string | null;
        error: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: string;
        location: string | null;
    }) | null>;
    findAllLeads(search?: string): Promise<({
        job: {
            query: string | null;
            type: string;
            location: string | null;
        };
        contacts: {
            email: string | null;
            linkedin: string | null;
            id: string;
            emailStatus: string | null;
            sentAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            name: string | null;
            leadId: string;
            role: string | null;
        }[];
    } & {
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
    })[]>;
    deleteJob(id: string): Promise<{
        status: string;
        query: string | null;
        error: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: string;
        location: string | null;
    }>;
}
