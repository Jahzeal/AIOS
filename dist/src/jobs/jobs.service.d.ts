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
    createSearchJob(userId: string, query: string, location: string, keywords?: string): Promise<{
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
    createUrlJob(userId: string, urls: string[]): Promise<{
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
    findAllJobs(userId: string): Promise<({
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
    findOneJob(userId: string, id: string): Promise<({
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
    findAllLeads(userId: string, search?: string): Promise<({
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
    deleteJob(userId: string, id: string): Promise<{
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
    stopJob(userId: string, id: string): Promise<{
        error: string;
        success?: undefined;
    } | {
        success: boolean;
        error?: undefined;
    }>;
    private processQueue;
    private executeSearchJob;
    private executeUrlListJob;
    private getDomainName;
    private enrichLeadWithContacts;
}
