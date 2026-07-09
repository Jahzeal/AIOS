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
const google_calendar_service_1 = require("./google-calendar.service");
const auth_guard_1 = require("../auth/auth.guard");
let MeetingsController = class MeetingsController {
    meetingsService;
    googleCalendarService;
    constructor(meetingsService, googleCalendarService) {
        this.meetingsService = meetingsService;
        this.googleCalendarService = googleCalendarService;
    }
    getGoogleAuthUrl() {
        const authUrl = this.googleCalendarService.getAuthUrl();
        return { authUrl };
    }
    async connectGoogleCalendar(req, body) {
        return this.googleCalendarService.connect(req.user.userId, body.code);
    }
    async getGoogleConnection(req) {
        return this.googleCalendarService.getConnection(req.user.userId);
    }
    async disconnectGoogleCalendar(req) {
        return this.googleCalendarService.disconnect(req.user.userId);
    }
    async getGoogleCalendars(req) {
        return this.googleCalendarService.getCalendars(req.user.userId);
    }
    async selectGoogleCalendar(req, body) {
        return this.googleCalendarService.selectCalendar(req.user.userId, body.calendarId);
    }
    async createMeeting(body) {
        return this.meetingsService.createMeeting(body.leadId, body.title, body.email, body.meetingLink, body.scheduledAt);
    }
    async handleCalendarWebhook(body) {
        return this.meetingsService.createMeetingByEmail(body.email, body.title || 'Google Calendar Booking', body.meetingLink || '', body.scheduledAt);
    }
    async findAllMeetings(req) {
        return this.meetingsService.findAllMeetings(req.user.userId);
    }
    async deleteMeeting(id) {
        return this.meetingsService.deleteMeeting(id);
    }
};
exports.MeetingsController = MeetingsController;
__decorate([
    (0, common_1.Get)('google/auth-url'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MeetingsController.prototype, "getGoogleAuthUrl", null);
__decorate([
    (0, common_1.Post)('google/connect'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MeetingsController.prototype, "connectGoogleCalendar", null);
__decorate([
    (0, common_1.Get)('google/connection'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MeetingsController.prototype, "getGoogleConnection", null);
__decorate([
    (0, common_1.Post)('google/disconnect'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MeetingsController.prototype, "disconnectGoogleCalendar", null);
__decorate([
    (0, common_1.Get)('google/calendars'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MeetingsController.prototype, "getGoogleCalendars", null);
__decorate([
    (0, common_1.Post)('google/select-calendar'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MeetingsController.prototype, "selectGoogleCalendar", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MeetingsController.prototype, "createMeeting", null);
__decorate([
    (0, common_1.Post)('webhook'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MeetingsController.prototype, "handleCalendarWebhook", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
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
    __metadata("design:paramtypes", [meetings_service_1.MeetingsService,
        google_calendar_service_1.GoogleCalendarService])
], MeetingsController);
//# sourceMappingURL=meetings.controller.js.map