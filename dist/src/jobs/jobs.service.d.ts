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
        type: string;
        location: string | null;
        keywords: string | null;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
    }>;
    createUrlJob(userId: string, urls: string[]): Promise<{
        query: string | null;
        error: string | null;
        id: string;
        type: string;
        location: string | null;
        keywords: string | null;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
    }>;
    findAllJobs(userId: string): Promise<({
        _count: {
            leads: number;
        };
    } & {
        query: string | null;
        error: string | null;
        id: string;
        type: string;
        location: string | null;
        keywords: string | null;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
    })[]>;
    findOneJob(userId: string, id: string): Promise<({
        leads: ({
            contacts: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string | null;
                email: string | null;
                phone: string | null;
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
            jobId: string;
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
        })[];
    } & {
        query: string | null;
        error: string | null;
        id: string;
        type: string;
        location: string | null;
        keywords: string | null;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
    }) | null>;
    findAllLeads(userId: string, search?: string): Promise<({
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
            phone: string | null;
            linkedin: string | null;
            emailStatus: string | null;
            sentAt: Date | null;
            leadId: string;
            role: string | null;
        }[];
        receivedEmails: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            leadId: string;
            from: string;
            subject: string;
            bodyText: string | null;
            bodyHtml: string | null;
            receivedAt: Date;
            draftedReplySubject: string | null;
            draftedReplyBody: string | null;
            draftedReplyStatus: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyName: string | null;
        jobId: string;
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
    })[]>;
    deleteJob(userId: string, id: string): Promise<{
        query: string | null;
        error: string | null;
        id: string;
        type: string;
        location: string | null;
        keywords: string | null;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
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
