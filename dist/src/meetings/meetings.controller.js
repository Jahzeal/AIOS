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
exports.MeetingsController = void 0;
const common_1 = require("@nestjs/common");
const meetings_service_1 = require("./meetings.service");
let MeetingsController = class MeetingsController {
    meetingsService;
    constructor(meetingsService) {
        this.meetingsService = meetingsService;
    }
    async renderBookingPage(leadId) {
        const lead = await this.meetingsService.getLead(leadId);
        if (!lead) {
            return `
        <!DOCTYPE html>
        <html>
        <head><title>Error</title></head>
        <body style="background:#090a0f; color:#ef4444; font-family:sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh;">
          <h3>Lead not found. Cannot schedule meeting.</h3>
        </body>
        </html>
      `;
        }
        return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Schedule Demo Meeting</title>
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
            max-width: 480px;
            width: 100%;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          }
          h1 {
            color: #a855f7;
            margin-bottom: 8px;
            font-size: 24px;
            text-align: center;
          }
          p.company {
            color: #94a3b8;
            font-size: 15px;
            margin-bottom: 24px;
            text-align: center;
          }
          .form-group {
            margin-bottom: 20px;
            text-align: left;
          }
          label {
            display: block;
            font-size: 13px;
            font-weight: 500;
            color: #94a3b8;
            margin-bottom: 6px;
          }
          input {
            width: 100%;
            padding: 10px 12px;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            color: #f8fafc;
            box-sizing: border-box;
            font-size: 14px;
          }
          input:focus {
            outline: none;
            border-color: #a855f7;
          }
          .btn {
            background: linear-gradient(135deg, #a855f7 0%, #d946ef 100%);
            color: white;
            border: none;
            padding: 12px;
            border-radius: 8px;
            font-weight: 600;
            width: 100%;
            cursor: pointer;
            font-size: 15px;
            transition: opacity 0.2s;
          }
          .btn:hover {
            opacity: 0.9;
          }
          .success-container {
            display: none;
            text-align: center;
          }
          .success-icon {
            font-size: 48px;
            color: #10b981;
            margin-bottom: 16px;
          }
        </style>
      </head>
      <body>
        <div class="card" id="booking-card">
          <h1>Schedule Demo Meeting</h1>
          <p class="company">Booking with <strong>${lead.companyName || 'AIOS Sales Team'}</strong></p>
          
          <form id="booking-form">
            <div class="form-group">
              <label>Meeting Title</label>
              <input type="text" id="title" value="AIOS Automation Demo" required />
            </div>
            <div class="form-group">
              <label>Your Email Address</label>
              <input type="email" id="email" value="${lead.email || ''}" required />
            </div>
            <div class="form-group">
              <label>Choose Date & Time</label>
              <input type="datetime-local" id="datetime" required />
            </div>
            <button type="submit" class="btn" id="submit-btn">Confirm Booking</button>
          </form>
        </div>

        <div class="card success-container" id="success-card">
          <div class="success-icon">✓</div>
          <h1>Demo Scheduled!</h1>
          <p>Your meeting has been successfully booked with our sales team.</p>
          <p style="color: #94a3b8; font-size: 14px;">You can close this window now and return to the dashboard.</p>
        </div>

        <script>
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(10, 0, 0, 0);
          const tzoffset = tomorrow.getTimezoneOffset() * 60000;
          const localISOTime = (new Date(tomorrow.getTime() - tzoffset)).toISOString().slice(0, 16);
          document.getElementById('datetime').value = localISOTime;

          document.getElementById('booking-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = document.getElementById('submit-btn');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Booking...';

            const title = document.getElementById('title').value;
            const email = document.getElementById('email').value;
            const datetime = document.getElementById('datetime').value;

            try {
              const res = await fetch('/api/meetings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  leadId: '${lead.id}',
                  title: title,
                  email: email,
                  meetingLink: window.location.href,
                  scheduledAt: datetime
                })
              });

              if (res.ok) {
                document.getElementById('booking-card').style.display = 'none';
                document.getElementById('success-card').style.display = 'block';
              } else {
                alert('Failed to book meeting. Please try again.');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Confirm Booking';
              }
            } catch (err) {
              alert('Error booking meeting: ' + err.message);
              submitBtn.disabled = false;
              submitBtn.textContent = 'Confirm Booking';
            }
          });
        </script>
      </body>
      </html>
    `;
    }
    async createMeeting(body) {
        return this.meetingsService.createMeeting(body.leadId, body.title, body.email, body.meetingLink, body.scheduledAt);
    }
    async findAllMeetings() {
        return this.meetingsService.findAllMeetings();
    }
    async deleteMeeting(id) {
        return this.meetingsService.deleteMeeting(id);
    }
};
exports.MeetingsController = MeetingsController;
__decorate([
    (0, common_1.Get)('simulate-booking'),
    __param(0, (0, common_1.Query)('leadId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MeetingsController.prototype, "renderBookingPage", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MeetingsController.prototype, "createMeeting", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MeetingsController.prototype, "findAllMeetings", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MeetingsController.prototype, "deleteMeeting", null);
exports.MeetingsController = MeetingsController = __decorate([
    (0, common_1.Controller)('api/meetings'),
    __metadata("design:paramtypes", [meetings_service_1.MeetingsService])
], MeetingsController);
//# sourceMappingURL=meetings.controller.js.map