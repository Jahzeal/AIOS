import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
export interface EmailStats {
    sentToday: number;
    dailyCap: number;
    remaining: number;
}
export declare class EmailService {
    private prisma;
    private configService;
    private readonly logger;
    private readonly openaiApiKey;
    private readonly anthropicApiKey;
    private readonly geminiApiKey;
    private readonly resendApiKey;
    private readonly senderEmail;
    private readonly meetingBookingLink;
    private readonly isMockOpenai;
    private readonly isMockAnthropic;
    private readonly useGemini;
    private readonly isMockResend;
    private readonly mockReplyBodies;
    constructor(prisma: PrismaService, configService: ConfigService);
    processEmailPipeline(leadId: string): Promise<void>;
    checkSuppression(email: string): Promise<boolean>;
    getSuppressions(): Promise<{
        id: string;
        createdAt: Date;
        emailOrDomain: string;
        reason: string | null;
    }[]>;
    addSuppression(emailOrDomain: string, reason?: string): Promise<{
        id: string;
        createdAt: Date;
        emailOrDomain: string;
        reason: string | null;
    }>;
    removeSuppression(id: string): Promise<{
        id: string;
        createdAt: Date;
        emailOrDomain: string;
        reason: string | null;
    }>;
    getConsentLedger(): Promise<{
        email: string;
        id: string;
        leadId: string;
        businessName: string;
        relevanceReason: string;
        checkedAt: Date;
    }[]>;
    getDailyStats(): Promise<EmailStats>;
    private generatePersonalizedPitch;
    private verifyCompliance;
    private callGemini;
    private sendEmail;
    private sleep;
    private getSettingsPath;
    getSettings(): Promise<{
        autoRespond: any;
        bookingLink: any;
    }>;
    updateSettings(autoRespond: boolean, bookingLink?: string): Promise<{
        autoRespond: any;
        bookingLink: any;
    }>;
    getReceivedReplies(): Promise<({
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
    })[]>;
    updateDraftReply(receivedEmailId: string, subject: string, body: string): Promise<{
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
    }>;
    sendFollowUpReply(receivedEmailId: string): Promise<{
        success: boolean;
    }>;
    processInboundWebhook(payload: any): Promise<void>;
    generateFollowUpDraft(lead: any, receivedEmail: any): Promise<{
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
    }>;
    private extractEmail;
}
