import { EmailService } from './email.service';
export declare class EmailController {
    private readonly emailService;
    constructor(emailService: EmailService);
    getStatus(req: any): Promise<import("./email.service").EmailStats>;
    getConsentLedger(): Promise<{
        id: string;
        leadId: string;
        businessName: string;
        email: string;
        relevanceReason: string;
        checkedAt: Date;
    }[]>;
    getSuppressions(): Promise<{
        id: string;
        emailOrDomain: string;
        reason: string | null;
        createdAt: Date;
    }[]>;
    addSuppression(body: {
        emailOrDomain: string;
        reason?: string;
    }): Promise<{
        id: string;
        emailOrDomain: string;
        reason: string | null;
        createdAt: Date;
    }>;
    removeSuppression(id: string): Promise<{
        id: string;
        emailOrDomain: string;
        reason: string | null;
        createdAt: Date;
    }>;
    triggerEmail(leadId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    unsubscribe(email: string): Promise<string>;
    getReplies(req: any): Promise<({
        lead: {
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
        };
    } & {
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
    })[]>;
    sendReply(id: string): Promise<{
        success: boolean;
    }>;
    updateDraft(id: string, body: {
        subject: string;
        body: string;
    }): Promise<{
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
    }>;
    handleWebhook(payload: any): Promise<{
        received: boolean;
    }>;
    getSettings(req: any): Promise<any>;
    updateSettings(req: any, body: any): Promise<{
        id: string;
        createdAt: Date;
        email: string;
        userId: string | null;
        corporateName: string;
        phoneNumber: string;
        emailTemplate: string;
        leadsPerDay: number;
        crawlLocation: string;
        crawlIndustry: string;
        crawlKeywords: string;
        autoRespond: boolean;
        bookingLink: string;
        updatedAt: Date;
    }>;
}
