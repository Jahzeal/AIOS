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
        query: string | null;
        error: string | null;
        id: string;
        type: string;
        location: string | null;
        status: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    createUrlJob(urls: string[]): Promise<{
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
    private processQueue;
    private executeSearchJob;
    private executeUrlListJob;
    private enrichLeadWithContacts;
}
