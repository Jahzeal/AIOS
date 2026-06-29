import { OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FirecrawlService } from '../firecrawl/firecrawl.service';
import { EmailService } from '../email/email.service';
import { HunterService } from '../hunter/hunter.service';
import { ApolloService } from '../apollo/apollo.service';
export declare class JobsService implements OnModuleInit {
    private prisma;
    private firecrawl;
    private emailService;
    private hunter;
    private apollo;
    private readonly logger;
    private isProcessing;
    constructor(prisma: PrismaService, firecrawl: FirecrawlService, emailService: EmailService, hunter: HunterService, apollo: ApolloService);
    onModuleInit(): void;
    createSearchJob(query: string, location: string): Promise<{
        status: string;
        query: string | null;
        error: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: string;
        location: string | null;
    }>;
    createUrlJob(urls: string[]): Promise<{
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
    private processQueue;
    private executeSearchJob;
    private executeUrlListJob;
    private enrichLeadWithContacts;
}
