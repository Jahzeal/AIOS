import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

export interface EmailStats {
  sentToday: number;
  dailyCap: number;
  remaining: number;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly openaiApiKey: string;
  private readonly anthropicApiKey: string;
  private readonly geminiApiKey: string;
  private readonly resendApiKey: string;
  private readonly senderEmail: string;
  private readonly meetingBookingLink: string;
  private readonly isMockOpenai: boolean;
  private readonly isMockAnthropic: boolean;
  private readonly useGemini: boolean;
  private readonly isMockResend: boolean;
  private readonly mockReplyBodies = new Map<string, string>();

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.openaiApiKey = this.configService.get<string>('OPENAI_API_KEY') || '';
    this.anthropicApiKey = this.configService.get<string>('ANTHROPIC_API_KEY') || '';
    this.geminiApiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
    this.resendApiKey = this.configService.get<string>('RESEND_API_KEY') || '';
    this.senderEmail = this.configService.get<string>('SENDER_EMAIL') || 'onboarding@resend.dev';
    this.meetingBookingLink = this.configService.get<string>('MEETING_BOOKING_LINK') || 'https://calendly.com/aios-sales';

    this.useGemini = this.geminiApiKey.trim() !== '' && !this.geminiApiKey.startsWith('YOUR_');
    this.isMockOpenai = !this.openaiApiKey || this.openaiApiKey.trim() === '' || this.openaiApiKey.startsWith('YOUR_');
    this.isMockAnthropic = !this.anthropicApiKey || this.anthropicApiKey.trim() === '' || this.anthropicApiKey.startsWith('YOUR_');
    this.isMockResend = !this.resendApiKey || this.resendApiKey.trim() === '' || this.resendApiKey.startsWith('YOUR_');

    if (this.useGemini) {
      this.logger.log('Gemini API key provided. Using Gemini for copywriting and compliance checks (Free Tier).');
    } else {
      if (this.isMockOpenai) this.logger.warn('OpenAI API key missing/mock. Using Sales Lead AI Mock Mode.');
      if (this.isMockAnthropic) this.logger.warn('Anthropic API key missing/mock. Using Compliance Check Mock Mode.');
    }
    if (this.isMockResend) this.logger.warn('Resend API key missing/mock. Using Email Delivery Sandbox/Mock Mode.');
  }

  /**
   * Main email process pipeline execution for a single lead
   */
  async processEmailPipeline(leadId: string): Promise<void> {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: { job: true, contacts: true },
    });

    if (!lead) {
      this.logger.error(`Lead with ID ${leadId} not found.`);
      return;
    }

    // 1. Check daily cap up front
    const stats = await this.getDailyStats();
    if (stats.sentToday >= stats.dailyCap) {
      this.logger.warn(`Daily email cap of ${stats.dailyCap} reached. Skipping lead: ${lead.companyName}`);
      await this.prisma.lead.update({
        where: { id: leadId },
        data: { emailStatus: 'SKIPPED_CAP', complianceReason: `Mailing Cap Breached (Limit: ${stats.dailyCap}).` },
      });
      return;
    }

    // 2. Decide recipients — contacts first, fall back to company email
    const contactsWithEmail = (lead.contacts || []).filter((c) => c.email && c.email.trim() !== '');
    const hasContacts = contactsWithEmail.length > 0;
    const hasCompanyEmail = lead.email && lead.email.trim() !== '';

    if (!hasContacts && !hasCompanyEmail) {
      this.logger.log(`Lead ${lead.companyName} has no email address or contacts. Skipping.`);
      return;
    }

    // 3. Mark as GENERATING
    await this.prisma.lead.update({ where: { id: leadId }, data: { emailStatus: 'GENERATING' } });

    let atLeastOneSent = false;
    let lastSubject = '';
    let lastBody = '';

    try {
      if (hasContacts) {
        // ── CONTACT-FIRST PATH ──
        this.logger.log(`Lead ${lead.companyName}: sending to ${contactsWithEmail.length} targeted contact(s).`);

        for (const contact of contactsWithEmail) {
          const currentStats = await this.getDailyStats();
          if (currentStats.sentToday >= currentStats.dailyCap) {
            this.logger.warn(`Daily cap hit mid-loop. Stopping further sends for ${lead.companyName}.`);
            break;
          }

          // Check suppression per contact
          const suppressed = await this.checkSuppression(contact.email!);
          if (suppressed) {
            this.logger.warn(`Contact ${contact.email} is suppressed. Skipping.`);
            await this.prisma.contact.update({
              where: { id: contact.id },
              data: { emailStatus: 'SKIPPED_SUPPRESSED' },
            });
            continue;
          }

          // Generate personalized pitch addressed to this individual
          const draft = await this.generatePersonalizedPitch(lead, contact);
          lastSubject = draft.subject;
          lastBody = draft.body;

          // Compliance check
          const compliance = await this.verifyCompliance(lead, draft.subject, draft.body);
          if (!compliance.isCompliant) {
            this.logger.error(`Compliance REJECTED for contact ${contact.email}: ${compliance.failureReason}`);
            await this.prisma.contact.update({
              where: { id: contact.id },
              data: { emailStatus: 'FAILED' },
            });
            continue;
          }

          // Log consent per contact
          await this.prisma.consentLedger.create({
            data: {
              leadId: lead.id,
              businessName: `${contact.name || 'Contact'} @ ${lead.companyName || 'Unknown'}`,
              email: contact.email!,
              relevanceReason: compliance.relevanceReason,
            },
          });

          // Send
          this.logger.log(`Sending to decision-maker ${contact.name} <${contact.email}> (${contact.role})...`);
          await this.sendEmail(contact.email!, draft.subject, draft.body);

          // Update contact record
          await this.prisma.contact.update({
            where: { id: contact.id },
            data: { emailStatus: 'SENT', sentAt: new Date() },
          });

          atLeastOneSent = true;
          this.logger.log(`✓ Email sent to ${contact.name} at ${lead.companyName}`);
        }
      } else {
        // ── FALLBACK: company email ──
        this.logger.log(`Lead ${lead.companyName}: no contacts found, falling back to company email ${lead.email}.`);

        const suppressed = await this.checkSuppression(lead.email!);
        if (suppressed) {
          await this.prisma.lead.update({
            where: { id: leadId },
            data: { emailStatus: 'SKIPPED_SUPPRESSED', complianceReason: 'Email or Domain is in Suppression List.' },
          });
          return;
        }

        const draft = await this.generatePersonalizedPitch(lead, null);
        lastSubject = draft.subject;
        lastBody = draft.body;

        const compliance = await this.verifyCompliance(lead, draft.subject, draft.body);
        if (!compliance.isCompliant) {
          await this.prisma.lead.update({
            where: { id: leadId },
            data: {
              emailStatus: 'COMPLIANCE_REJECTED',
              emailSubject: draft.subject,
              emailBody: draft.body,
              complianceReason: compliance.failureReason,
            },
          });
          return;
        }

        await this.prisma.consentLedger.create({
          data: {
            leadId: lead.id,
            businessName: lead.companyName || 'Unknown Company',
            email: lead.email!,
            relevanceReason: compliance.relevanceReason,
          },
        });

        await this.sendEmail(lead.email!, draft.subject, draft.body);
        atLeastOneSent = true;
      }

      // Final lead status update
      await this.prisma.lead.update({
        where: { id: leadId },
        data: {
          emailStatus: atLeastOneSent ? 'SENT' : 'FAILED',
          emailSubject: lastSubject,
          emailBody: lastBody,
          complianceReason: atLeastOneSent ? 'Outreach delivered to decision-maker(s).' : 'All contacts failed compliance or suppression checks.',
          sentAt: atLeastOneSent ? new Date() : undefined,
        },
      });

      this.logger.log(`Pipeline complete for ${lead.companyName}. Sent: ${atLeastOneSent}`);

    } catch (err: any) {
      this.logger.error(`Pipeline failed for lead ${lead.id}: ${err.message}`, err.stack);
      await this.prisma.lead.update({
        where: { id: leadId },
        data: { emailStatus: 'FAILED', complianceReason: `Error: ${err.message}` },
      });
    }
  }

  /**
   * Check suppression list for email or root domain
   */
  async checkSuppression(email: string): Promise<boolean> {
    const cleanEmail = email.trim().toLowerCase();
    const parts = cleanEmail.split('@');
    const domain = parts.length > 1 ? parts[1] : null;

    const match = await this.prisma.suppressionList.findFirst({
      where: {
        OR: [
          { emailOrDomain: cleanEmail },
          ...(domain ? [{ emailOrDomain: domain }] : []),
        ],
      },
    });

    return !!match;
  }

  /**
   * Get suppression list entries
   */
  async getSuppressions() {
    return this.prisma.suppressionList.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Add to suppression list
   */
  async addSuppression(emailOrDomain: string, reason?: string) {
    const normalized = emailOrDomain.trim().toLowerCase();
    return this.prisma.suppressionList.upsert({
      where: { emailOrDomain: normalized },
      update: { reason },
      create: { emailOrDomain: normalized, reason },
    });
  }

  /**
   * Remove from suppression list
   */
  async removeSuppression(id: string) {
    return this.prisma.suppressionList.delete({
      where: { id },
    });
  }

  /**
   * Get consent ledger logs
   */
  async getConsentLedger() {
    return this.prisma.consentLedger.findMany({
      orderBy: { checkedAt: 'desc' },
    });
  }

  /**
   * Calculate daily sending limits
   */
  async getDailyStats(): Promise<EmailStats> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const sentCount = await this.prisma.lead.count({
      where: {
        emailStatus: 'SENT',
        sentAt: {
          gte: startOfToday,
        },
      },
    });

    const dailyCap = 15;
    return {
      sentToday: sentCount,
      dailyCap,
      remaining: Math.max(0, dailyCap - sentCount),
    };
  }

  /**
   * GPT-4o copywriting executor
   */
  private async generatePersonalizedPitch(
    lead: any,
    contact: { name?: string | null; role?: string | null } | null = null,
  ): Promise<{ subject: string; body: string }> {
    const firstName = contact?.name?.split(' ')[0] || null;
    const greeting = firstName ? `Hi ${firstName},` : `Hello ${lead.companyName || 'Team'},`;
    const roleContext = contact?.role ? `, as ${contact.role} at ${lead.companyName || 'your company'},` : '';

    if (this.useGemini) {
      try {
        const prompt = `You are a professional B2B Copywriter & Sales Lead Agent. Write a highly personalized cold email pitch offering free automation services.
Lead Details:
- Company Name: ${lead.companyName || 'Unknown'}
- Website URL: ${lead.website}
- Industry/Query: ${lead.job?.query || 'business'}
- Location: ${lead.job?.location || 'local area'}
- Description: ${lead.description || 'A boutique company'}
${contact ? `- Recipient Name: ${contact.name || 'Unknown'}
- Recipient Role: ${contact.role || 'Manager'}` : ''}

Instructions:
1. Start the email with exactly this greeting: "${greeting}"
2. Reference the recipient's role ("${contact?.role || 'your leadership role'}") naturally in the first sentence.
3. Write a natural, highly persuasive offer. Focus on solving booking, operational, or marketing gaps.
4. The email must contain a valid physical address at the bottom: "AIOS Inc., 123 Tech Lane, London, UK"
5. The email must contain the exact placeholder template: "{{unsubscribe_link}}" in the footer.
6. Output your response as a valid JSON object. Do not include markdown code block formats in your raw string.
JSON Format:
{
  "subject": "Email Subject Line",
  "body": "HTML formatted email body including <p>, <strong>, and <br/> tags"
}`;

        const resText = await this.callGemini(prompt, true);
        const parsed = JSON.parse(resText.trim());
        if (!parsed.subject || !parsed.body) throw new Error('Gemini output is missing subject or body keys.');
        return { subject: parsed.subject, body: parsed.body };
      } catch (err: any) {
        this.logger.error(`Gemini copywriting API failed: ${err.message}`);
        throw new Error(`Gemini copywriting failed: ${err.message}`);
      }
    }

    if (this.isMockOpenai) {
      await this.sleep(1500);
      const company = lead.companyName || 'your business';
      const industry = lead.job?.query || 'services';
      const loc = lead.job?.location || 'your local area';
      const subject = `Exclusive Offer: Free Automation Services for ${company}`;
      const body = `<p>${greeting}</p>
<p>I noticed${roleContext} that ${company} offers <strong>${industry}</strong> in the <strong>${loc}</strong> area. Your website looks outstanding, but we spotted key opportunities to streamline customer inquiries and lead captures using automation tools.</p>
<p>As part of our local launch, the AIOS team would like to offer you 100% free automation setups — no setup fees, no subscription for the first month. We build custom lead responders and automated booking tools to capture traffic while you sleep.</p>
<p>Would you be open to a brief 10-minute demo this week?</p>
<br/>
<p>Best regards,</p>
<p><strong>AI Sales Lead</strong><br/>AIOS Inc., 123 Tech Lane, London, UK</p>
<br/>
<p style="font-size: 0.8rem; color: #64748b;">If you wish to opt-out of future updates, unsubscribe here: {{unsubscribe_link}}</p>`;
      return { subject, body };
    }

    try {
      const prompt = `You are a professional B2B Copywriter & Sales Lead Agent. Write a highly personalized cold email pitch offering free automation services.
Lead Details:
- Company Name: ${lead.companyName || 'Unknown'}
- Website URL: ${lead.website}
- Industry/Query: ${lead.job?.query || 'business'}
- Location: ${lead.job?.location || 'local area'}
- Description: ${lead.description || 'A boutique company'}
${contact ? `- Recipient Name: ${contact.name || 'Unknown'}
- Recipient Role: ${contact.role || 'Manager'}` : ''}

Instructions:
1. Start the email with exactly this greeting: "${greeting}"
2. Reference the recipient's role ("${contact?.role || 'your leadership role'}") naturally in the opening.
3. Write a natural, highly persuasive offer. Focus on solving booking, operational, or marketing gaps.
4. The email must contain a valid physical address at the bottom: "AIOS Inc., 123 Tech Lane, London, UK"
5. The email must contain the exact placeholder template: "{{unsubscribe_link}}" in the footer.
6. Output your response as a valid JSON object. Do not include markdown code block formats in your raw string.
JSON Format:
{
  "subject": "Email Subject Line",
  "body": "HTML formatted email body including <p>, <strong>, and <br/> tags"
}`;

      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: 'You output only valid JSON response.' },
            { role: 'user', content: prompt },
          ],
        },
        { headers: { Authorization: `Bearer ${this.openaiApiKey}`, 'Content-Type': 'application/json' } },
      );

      const resText = response.data.choices[0].message.content;
      const parsed = JSON.parse(resText);
      if (!parsed.subject || !parsed.body) throw new Error('GPT-4o output is missing subject or body keys.');
      return { subject: parsed.subject, body: parsed.body };
    } catch (err: any) {
      this.logger.error(`GPT-4o copywriting API failed: ${err.message}`);
      throw new Error(`GPT-4o copywriting failed: ${err.message}`);
    }
  }

  /**
   * Claude 3.5 Sonnet compliance reviewer executor
   */
  private async verifyCompliance(
    lead: any,
    subject: string,
    body: string,
  ): Promise<{ isCompliant: boolean; relevanceReason: string; failureReason: string | null }> {
    if (this.useGemini) {
      try {
        const prompt = `You are a compliance officer running legal audit checks for CAN-SPAM regulations.
Analyze the email content below:
Subject: "${subject}"
Body: "${body}"

Checklist rules:
1. Email body MUST contain a valid street address (e.g. "AIOS Inc., 123 Tech Lane, London, UK" or similar).
2. Email body MUST contain the exact placeholder tag: "{{unsubscribe_link}}".
3. Evaluate the business relevance: based on the lead's business description ("${lead.description || ''}"), explain why our outreach is relevant to their business.

Output your audit report as a raw JSON string. Do not include markdown code block formats in your response.
JSON Format:
{
  "isCompliant": true or false,
  "relevanceReason": "Business relevance explanation (required if compliant)",
  "failureReason": "Explanation of rules failed (null if compliant)"
}`;

        const resText = await this.callGemini(prompt, true);
        const parsed = JSON.parse(resText.trim());
        return {
          isCompliant: !!parsed.isCompliant,
          relevanceReason: parsed.relevanceReason || '',
          failureReason: parsed.failureReason || null,
        };
      } catch (err: any) {
        this.logger.error(`Gemini compliance API failed: ${err.message}`);
        throw new Error(`Gemini compliance check failed: ${err.message}`);
      }
    }

    if (this.isMockAnthropic) {
      await this.sleep(1200);
      const containsAddress = body.includes('123 Tech Lane') || body.includes('London, UK');
      const containsUnsubscribe = body.includes('{{unsubscribe_link}}');

      if (!containsAddress) {
        return {
          isCompliant: false,
          relevanceReason: '',
          failureReason: 'Compliance Rejected: Missing valid company physical address.',
        };
      }
      if (!containsUnsubscribe) {
        return {
          isCompliant: false,
          relevanceReason: '',
          failureReason: 'Compliance Rejected: Missing {{unsubscribe_link}} unsubscribe placeholder.',
        };
      }

      const relevanceReason = `Targeted ${lead.companyName || 'this lead'} because they offer ${lead.job?.query || 'services'} in ${lead.job?.location || 'their local area'} and their site description details digital customer acquisition channels.`;
      return { isCompliant: true, relevanceReason, failureReason: null };
    }

    try {
      const prompt = `You are a compliance officer running legal audit checks for CAN-SPAM regulations.
Analyze the email content below:
Subject: "${subject}"
Body: "${body}"

Checklist rules:
1. Email body MUST contain a valid street address (e.g. "AIOS Inc., 123 Tech Lane, London, UK" or similar).
2. Email body MUST contain the exact placeholder tag: "{{unsubscribe_link}}".
3. Evaluate the business relevance: based on the lead's business description ("${lead.description || ''}"), explain why our outreach is relevant to their business.

Output your audit report as a raw JSON string. Do not include markdown code block formats in your response.
JSON Format:
{
  "isCompliant": true or false,
  "relevanceReason": "Business relevance explanation (required if compliant)",
  "failureReason": "Explanation of rules failed (null if compliant)"
}`;

      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
        },
        {
          headers: {
            'x-api-key': this.anthropicApiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
        },
      );

      const resText = response.data.content[0].text;
      const parsed = JSON.parse(resText.trim());
      return {
        isCompliant: !!parsed.isCompliant,
        relevanceReason: parsed.relevanceReason || '',
        failureReason: parsed.failureReason || null,
      };
    } catch (err: any) {
      this.logger.error(`Claude 3.5 Sonnet compliance API failed: ${err.message}`);
      throw new Error(`Claude compliance check failed: ${err.message}`);
    }
  }

  /**
   * Gemini API client helper
   */
  private async callGemini(prompt: string, jsonMode = false): Promise<string> {
    await this.sleep(3000); // 3-second delay to protect free tier rate limits (15 RPM)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.geminiApiKey}`;
    const response = await axios.post(
      url,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: jsonMode ? { responseMimeType: 'application/json' } : undefined,
      },
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('Empty response returned from Gemini API.');
    }
    return text;
  }

  /**
   * Resend API email sender
   */
  private async sendEmail(to: string, subject: string, html: string): Promise<void> {
    const appUrl = this.configService.get<string>('APP_URL') || 'https://aios-kkkl.onrender.com';
    const unsubscribeUrl = `${appUrl}/api/email/unsubscribe?email=${encodeURIComponent(to)}`;
    const compiledHtml = html.replace(/\{\{unsubscribe_link\}\}/g, unsubscribeUrl);

    if (this.isMockResend) {
      await this.sleep(1000);
      this.logger.log(`[MOCK EMAIL SENT]
  To: ${to}
  From: ${this.senderEmail}
  Subject: ${subject}
  Body Preview: ${compiledHtml.substring(0, 150)}...`);
      return;
    }

    try {
      await axios.post(
        'https://api.resend.com/emails',
        {
          from: this.senderEmail,
          to: [to],
          subject: subject,
          html: compiledHtml,
        },
        {
          headers: {
            Authorization: `Bearer ${this.resendApiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );
    } catch (error: any) {
      const apiError = error.response?.data || error.message;
      this.logger.error('Resend delivery API failed:', apiError);
      throw new Error(`Resend delivery failed: ${JSON.stringify(apiError)}`);
    }
  }

  private sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // --- NEW WORKFLOW METHODS FOR INBOUND EMAIL HANDLING & MEETINGS ---

  private getSettingsPath(): string {
    return path.join(process.cwd(), 'settings.json');
  }

  async getSettings() {
    const settingsPath = this.getSettingsPath();
    const defaultSettings = {
      autoRespond: this.configService.get<string>('AUTO_RESPOND') !== 'false',
      bookingLink: this.configService.get<string>('MEETING_BOOKING_LINK') || 'https://calendly.com/aios-sales',
    };

    try {
      if (!fs.existsSync(settingsPath)) {
        fs.writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2));
        return defaultSettings;
      }
      const data = fs.readFileSync(settingsPath, 'utf8');
      const parsed = JSON.parse(data);
      return {
        autoRespond: parsed.autoRespond !== undefined ? parsed.autoRespond : defaultSettings.autoRespond,
        bookingLink: parsed.bookingLink || defaultSettings.bookingLink,
      };
    } catch (err: any) {
      this.logger.error(`Error reading settings file: ${err.message}`);
      return defaultSettings;
    }
  }

  async updateSettings(autoRespond: boolean, bookingLink?: string) {
    const settingsPath = this.getSettingsPath();
    const current = await this.getSettings();
    const updated = {
      autoRespond: autoRespond !== undefined ? autoRespond : current.autoRespond,
      bookingLink: bookingLink || current.bookingLink,
    };

    try {
      fs.writeFileSync(settingsPath, JSON.stringify(updated, null, 2));
      return updated;
    } catch (err: any) {
      this.logger.error(`Error writing settings file: ${err.message}`);
      throw new Error(`Failed to save settings: ${err.message}`);
    }
  }

  async getReceivedReplies() {
    return this.prisma.receivedEmail.findMany({
      include: {
        lead: true,
      },
      orderBy: {
        receivedAt: 'desc',
      },
    });
  }

  async updateDraftReply(receivedEmailId: string, subject: string, body: string) {
    return this.prisma.receivedEmail.update({
      where: { id: receivedEmailId },
      data: {
        draftedReplySubject: subject,
        draftedReplyBody: body,
      },
    });
  }

  async sendFollowUpReply(receivedEmailId: string) {
    const reply = await this.prisma.receivedEmail.findUnique({
      where: { id: receivedEmailId },
      include: { lead: true },
    });

    if (!reply) {
      throw new Error(`Reply with ID ${receivedEmailId} not found.`);
    }

    if (!reply.draftedReplySubject || !reply.draftedReplyBody) {
      throw new Error(`Draft is not completed yet for reply ${receivedEmailId}.`);
    }

    const recipientEmail = this.extractEmail(reply.from) || reply.lead.email;
    if (!recipientEmail) {
      throw new Error(`No valid recipient email address available for reply ${receivedEmailId}.`);
    }

    this.logger.log(`Sending follow-up reply to ${recipientEmail} via Resend...`);

    // Send the email using existing helper
    await this.sendEmail(recipientEmail, reply.draftedReplySubject, reply.draftedReplyBody);

    // Update reply status in database
    await this.prisma.receivedEmail.update({
      where: { id: receivedEmailId },
      data: {
        draftedReplyStatus: 'SENT',
      },
    });

    return { success: true };
  }

  async processInboundWebhook(payload: any) {
    this.logger.log(`Processing inbound webhook event: ${payload.type}`);
    if (payload.type !== 'email.received') {
      this.logger.warn(`Unknown Resend webhook event type: ${payload.type}`);
      return;
    }

    const id = payload.data.id || payload.data.email_id || `email-${Date.now()}`;
    const { from, subject, created_at, text, html } = payload.data;
    this.logger.log(`Received email metadata: ID=${id}, From=${from}, Subject=${subject}`);

    const cleanEmail = this.extractEmail(from);
    if (!cleanEmail) {
      this.logger.error(`Could not extract clean email address from sender: ${from}`);
      return;
    }

    let lead = await this.prisma.lead.findFirst({
      where: {
        email: {
          equals: cleanEmail,
          mode: 'insensitive',
        },
      },
    });

    if (!lead) {
      const contact = await this.prisma.contact.findFirst({
        where: {
          email: {
            equals: cleanEmail,
            mode: 'insensitive',
          },
        },
        include: {
          lead: true,
        },
      });
      if (contact) {
        lead = contact.lead;
      }
    }

    if (!lead) {
      this.logger.warn(`No lead matches the incoming sender email: ${cleanEmail}. Skipping received email record.`);
      return;
    }

    // Update Lead status to REPLIED
    await this.prisma.lead.update({
      where: { id: lead.id },
      data: {
        emailStatus: 'REPLIED',
      },
    });

    let bodyText = text || '';
    let bodyHtml = html || '';

    if (!bodyText && !bodyHtml) {
      if (id.startsWith('mock-email-')) {
        bodyText = this.mockReplyBodies.get(id) || 'Hey! That sounds cool. Let\'s chat.';
        bodyHtml = `<p>${bodyText}</p>`;
        this.mockReplyBodies.delete(id); // clean up from memory cache
      } else if (this.isMockResend) {
        this.logger.log(`Running in Resend mock mode. Simulating reply body fetching...`);
        bodyText = `Hi, thank you for the outreach. Your automation service sounds interesting! Can we schedule a quick call to discuss how it works? Let know if this Thursday works for you. Best, ${lead.companyName || 'Manager'}`;
        bodyHtml = `<p>Hi, thank you for the outreach.</p><p>Your automation service sounds interesting! Can we schedule a quick call to discuss how it works? Let know if this Thursday works for you.</p><p>Best,<br/>${lead.companyName || 'Manager'}</p>`;
      } else {
        try {
          const response = await axios.get(`https://api.resend.com/emails/${id}`, {
            headers: {
              Authorization: `Bearer ${this.resendApiKey}`,
            },
          });
          bodyText = response.data.text || '';
          bodyHtml = response.data.html || '';
        } catch (err: any) {
          this.logger.error(`Failed to fetch email details from Resend API for ID ${id}: ${err.message}`);
          bodyText = `Reply received regarding: ${subject}`;
          bodyHtml = `<p>${bodyText}</p>`;
        }
      }
    }

    // Store in received email database table
    const receivedEmail = await this.prisma.receivedEmail.create({
      data: {
        id: id,
        leadId: lead.id,
        from: from,
        subject: subject || 'No Subject',
        bodyText: bodyText,
        bodyHtml: bodyHtml,
        receivedAt: new Date(created_at || new Date()),
      },
    });

    this.logger.log(`Inbound email reply recorded in database for Lead: ${lead.companyName}`);

    // Trigger AI follow-up draft generation
    try {
      await this.generateFollowUpDraft(lead, receivedEmail);
      
      const settings = await this.getSettings();
      if (settings.autoRespond) {
        this.logger.log(`Auto-respond is ENABLED. Automatically sending AI follow-up reply...`);
        await this.sendFollowUpReply(receivedEmail.id);
      } else {
        this.logger.log(`Auto-respond is DISABLED. Draft saved for manual review.`);
      }
    } catch (draftErr: any) {
      this.logger.error(`Failed to automatically generate or send follow-up draft: ${draftErr.message}`);
    }
  }

  async generateFollowUpDraft(lead: any, receivedEmail: any) {
    this.logger.log(`Generating AI follow-up draft for ReceivedEmail: ${receivedEmail.id}`);

    const settings = await this.getSettings();
    const bookingLink = settings.bookingLink;
    const originalSubject = lead.emailSubject || 'Our previous outreach';
    const originalBody = lead.emailBody || '';
    const receivedSubject = receivedEmail.subject;
    const receivedBody = receivedEmail.bodyText || receivedEmail.bodyHtml || '';

    const prompt = `You are a professional B2B Sales Agent. We previously sent an outreach email to the company, and they replied to us.
Your job is to read their reply and draft a personalized, warm, and highly persuasive follow-up email response.
Our Goal: Get them to book a quick 10-15 minute demo meeting with us.
Here is the meeting booking link they can use: ${bookingLink}

Our Original Outreach Email Sent to Them:
Subject: "${originalSubject}"
Body: "${originalBody}"

Their Inbound Reply:
Subject: "${receivedSubject}"
Body: "${receivedBody}"

Instructions:
1. Keep the draft extremely professional, warm, concise, and response-driven.
2. Acknowledge what they wrote in their reply.
3. Suggest scheduling a call and include the meeting booking link: ${bookingLink}.
4. Output your response as a valid JSON object. Do not include markdown formatting in the raw JSON response.
JSON Format:
{
  "subject": "Follow-up email subject",
  "body": "HTML formatted email body including <p>, <strong>, and <br/> tags"
}
`;

    let subject = '';
    let body = '';

    if (this.useGemini) {
      try {
        const resText = await this.callGemini(prompt, true);
        const parsed = JSON.parse(resText.trim());
        subject = parsed.subject || `Re: ${receivedSubject}`;
        body = parsed.body || '';
      } catch (err: any) {
        this.logger.error(`Gemini copywriter failed for follow-up: ${err.message}`);
      }
    }

    if (!subject && !body) {
      if (this.isMockOpenai) {
        await this.sleep(1000);
        subject = `Re: ${receivedSubject}`;
        body = `<p>Hi there,</p>
<p>Thanks for getting back to us! We'd love to show you how our lead responders and booking automations can help streamline operations for <strong>${lead.companyName || 'your business'}</strong>.</p>
<p>Could we schedule a brief 10-15 minute call to chat? You can pick a convenient time directly on our calendar here: <a href="${bookingLink}" style="color: #6366f1; text-decoration: underline;">Book Demo Call</a>.</p>
<p>Let me know if that works for you, or if there's a different time that is better.</p>
<p>Best regards,<br/><strong>AI Sales Agent</strong><br/>AIOS Inc.</p>`;
      } else {
        try {
          const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
              model: 'gpt-4o',
              response_format: { type: 'json_object' },
              messages: [
                { role: 'system', content: 'You output only valid JSON response.' },
                { role: 'user', content: prompt },
              ],
            },
            {
              headers: {
                Authorization: `Bearer ${this.openaiApiKey}`,
                'Content-Type': 'application/json',
              },
            },
          );

          const resText = response.data.choices[0].message.content;
          const parsed = JSON.parse(resText);
          subject = parsed.subject || `Re: ${receivedSubject}`;
          body = parsed.body || '';
        } catch (err: any) {
          this.logger.error(`GPT-4o copywriter failed for follow-up: ${err.message}`);
          throw err;
        }
      }
    }

    return this.prisma.receivedEmail.update({
      where: { id: receivedEmail.id },
      data: {
        draftedReplySubject: subject,
        draftedReplyBody: body,
        draftedReplyStatus: 'DRAFTED',
      },
    });
  }


  private extractEmail(fromStr: string): string | null {
    if (!fromStr) return null;
    const match = fromStr.match(/<([^>]+)>/);
    if (match && match[1]) {
      return match[1].trim().toLowerCase();
    }
    return fromStr.trim().toLowerCase();
  }
}
