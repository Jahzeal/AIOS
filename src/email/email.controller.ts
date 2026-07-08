import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus, Req, UseGuards } from '@nestjs/common';
import { EmailService } from './email.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('api/email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Get('status')
  @UseGuards(AuthGuard)
  async getStatus(@Req() req: any) {
    return this.emailService.getDailyStats(req.user.userId);
  }

  @Get('consent-ledger')
  @UseGuards(AuthGuard)
  async getConsentLedger() {
    return this.emailService.getConsentLedger();
  }

  @Get('suppressions')
  @UseGuards(AuthGuard)
  async getSuppressions() {
    return this.emailService.getSuppressions();
  }

  @Post('suppressions')
  @UseGuards(AuthGuard)
  async addSuppression(@Body() body: { emailOrDomain: string; reason?: string }) {
    return this.emailService.addSuppression(body.emailOrDomain, body.reason);
  }

  @Delete('suppressions/:id')
  @UseGuards(AuthGuard)
  async removeSuppression(@Param('id') id: string) {
    return this.emailService.removeSuppression(id);
  }

  @Post('send/:leadId')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async triggerEmail(@Param('leadId') leadId: string) {
    await this.emailService.processEmailPipeline(leadId);
    return { success: true, message: 'Email outreach process triggered.' };
  }

  // Public — no auth needed (user clicks link in email)
  @Get('unsubscribe')
  async unsubscribe(@Query('email') email: string) {
    if (email && email.trim() !== '') {
      await this.emailService.addSuppression(email, 'User clicked unsubscribe link');
    }
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Unsubscribed Successfully</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #090a0f;
            color: #f8fafc;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
            box-sizing: border-box;
          }
          .card {
            background-color: rgba(17, 18, 25, 0.85);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 16px;
            padding: 40px;
            text-align: center;
            max-width: 450px;
            width: 100%;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          }
          h1 { color: #6366f1; margin-bottom: 16px; font-size: 24px; }
          p { color: #94a3b8; line-height: 1.6; margin-bottom: 24px; }
          .email { font-weight: bold; color: #f8fafc; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Unsubscribed</h1>
          <p>The email address <span class="email">${email || 'your address'}</span> has been successfully unsubscribed from our lists. You will not receive any further communications from us.</p>
        </div>
      </body>
      </html>
    `;
  }

  @Get('replies')
  @UseGuards(AuthGuard)
  async getReplies(@Req() req: any) {
    return this.emailService.getReceivedReplies(req.user.userId);
  }

  @Post('replies/:id/send')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async sendReply(@Param('id') id: string) {
    return this.emailService.sendFollowUpReply(id);
  }

  @Put('replies/:id/draft')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateDraft(
    @Param('id') id: string,
    @Body() body: { subject: string; body: string },
  ) {
    return this.emailService.updateDraftReply(id, body.subject, body.body);
  }

  // Public — webhook from Resend
  @Post('webhook/received')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() payload: any) {
    this.emailService.processInboundWebhook(payload).catch(err => {
      console.error('Error processing inbound webhook:', err);
    });
    return { received: true };
  }

  @Get('settings')
  @UseGuards(AuthGuard)
  async getSettings(@Req() req: any) {
    return this.emailService.getSettings(req.user.userId);
  }

  @Post('settings')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateSettings(@Req() req: any, @Body() body: any) {
    return this.emailService.updateSettings(req.user.userId, body);
  }
}
