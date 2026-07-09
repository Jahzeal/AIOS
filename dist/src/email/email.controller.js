"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailController = void 0;
const common_1 = require("@nestjs/common");
const email_service_1 = require("./email.service");
const auth_guard_1 = require("../auth/auth.guard");
let EmailController = class EmailController {
    emailService;
    constructor(emailService) {
        this.emailService = emailService;
    }
    async getStatus(req) {
        return this.emailService.getDailyStats(req.user.userId);
    }
    async getConsentLedger() {
        return this.emailService.getConsentLedger();
    }
    async getSuppressions() {
        return this.emailService.getSuppressions();
    }
    async addSuppression(body) {
        return this.emailService.addSuppression(body.emailOrDomain, body.reason);
    }
    async removeSuppression(id) {
        return this.emailService.removeSuppression(id);
    }
    async triggerEmail(leadId) {
        await this.emailService.processEmailPipeline(leadId);
        return { success: true, message: 'Email outreach process triggered.' };
    }
    async unsubscribe(email) {
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
    async getReplies(req) {
        return this.emailService.getReceivedReplies(req.user.userId);
    }
    async sendReply(id) {
        return this.emailService.sendFollowUpReply(id);
    }
    async updateDraft(id, body) {
        return this.emailService.updateDraftReply(id, body.subject, body.body);
    }
    async handleWebhook(payload) {
        this.emailService.processInboundWebhook(payload).catch((err) => {
            console.error('Error processing inbound webhook:', err);
        });
        return { received: true };
    }
    async getSettings(req) {
        return this.emailService.getSettings(req.user.userId);
    }
    async updateSettings(req, body) {
        return this.emailService.updateSettings(req.user.userId, body);
    }
};
exports.EmailController = EmailController;
__decorate([
    (0, common_1.Get)('status'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EmailController.prototype, "getStatus", null);
__decorate([
    (0, common_1.Get)('consent-ledger'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], EmailController.prototype, "getConsentLedger", null);
__decorate([
    (0, common_1.Get)('suppressions'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], EmailController.prototype, "getSuppressions", null);
__decorate([
    (0, common_1.Post)('suppressions'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EmailController.prototype, "addSuppression", null);
__decorate([
    (0, common_1.Delete)('suppressions/:id'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EmailController.prototype, "removeSuppression", null);
__decorate([
    (0, common_1.Post)('send/:leadId'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('leadId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EmailController.prototype, "triggerEmail", null);
__decorate([
    (0, common_1.Get)('unsubscribe'),
    __param(0, (0, common_1.Query)('email')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EmailController.prototype, "unsubscribe", null);
__decorate([
    (0, common_1.Get)('replies'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EmailController.prototype, "getReplies", null);
__decorate([
    (0, common_1.Post)('replies/:id/send'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EmailController.prototype, "sendReply", null);
__decorate([
    (0, common_1.Put)('replies/:id/draft'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EmailController.prototype, "updateDraft", null);
__decorate([
    (0, common_1.Post)('webhook/received'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EmailController.prototype, "handleWebhook", null);
__decorate([
    (0, common_1.Get)('settings'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EmailController.prototype, "getSettings", null);
__decorate([
    (0, common_1.Post)('settings'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], EmailController.prototype, "updateSettings", null);
exports.EmailController = EmailController = __decorate([
    (0, common_1.Controller)('api/email'),
    __metadata("design:paramtypes", [email_service_1.EmailService])
], EmailController);
//# sourceMappingURL=email.controller.js.map