import { JobsService } from './jobs.service';
export declare class JobsController {
    private readonly jobsService;
    constructor(jobsService: JobsService);
    createSearchJob(body: {
        query: string;
        location: string;
    }): Promise<{
        query: string | null;
        error: string | null;
        id: string;
        type: string;
        location: string | null;
        status: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    createUrlJob(body: {
        urls: string[];
    }): Promise<{
        query: string | null;
        error: string | null;
        id: string;
        type: string;
        location: string | null;
        status: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    findAllJobs(): Promise<({
        _count: {
            leads: number;
        };
    } & {
        query: string | null;
        error: string | null;
        id: string;
        type: string;
        location: string | null;
        status: string;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
    findOneJob(id: string): Promise<({
        leads: ({
            contacts: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string | null;
                email: string | null;
                linkedin: string | null;
                emailStatus: string | null;
                sentAt: Date | null;
                leadId: string;
                role: string | null;
            }[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            companyName: string | null;
            website: string;
            email: string | null;
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
            jobId: string;
        })[];
    } & {
        query: string | null;
        error: string | null;
        id: string;
        type: string;
        location: string | null;
        status: string;
        createdAt: Date;
        updatedAt: Date;
    }) | null>;
    findAllLeads(search?: string): Promise<({
        job: {
            query: string | null;
            type: string;
            location: string | null;
        };
        contacts: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string | null;
            email: string | null;
            linkedin: string | null;
            emailStatus: string | null;
            sentAt: Date | null;
            leadId: string;
            role: string | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyName: string | null;
        website: string;
        email: string | null;
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
        jobId: string;
    })[]>;
    deleteJob(id: string): Promise<{
        query: string | null;
        error: string | null;
        id: string;
        type: string;
        location: string | null;
        status: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
