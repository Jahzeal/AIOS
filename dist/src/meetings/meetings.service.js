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
var MeetingsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeetingsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let MeetingsService = MeetingsService_1 = class MeetingsService {
    prisma;
    logger = new common_1.Logger(MeetingsService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getLead(leadId) {
        return this.prisma.lead.findUnique({
            where: { id: leadId },
        });
    }
    async createMeeting(leadId, title, email, meetingLink, scheduledAt) {
        this.logger.log(`Booking meeting for Lead: ${leadId}, scheduled at: ${scheduledAt}`);
        const lead = await this.prisma.lead.findUnique({
            where: { id: leadId },
        });
        if (!lead) {
            throw new common_1.NotFoundException(`Lead with ID ${leadId} not found`);
        }
        const meeting = await this.prisma.upcomingMeeting.create({
            data: {
                leadId: lead.id,
                title: title || 'AIOS Automation Demo',
                email: email || lead.email || '',
                meetingLink: meetingLink || '',
                scheduledAt: new Date(scheduledAt),
            },
        });
        await this.prisma.lead.update({
            where: { id: leadId },
            data: {
                emailStatus: 'MEETING_BOOKED',
            },
        });
        return meeting;
    }
    async findAllMeetings() {
        return this.prisma.upcomingMeeting.findMany({
            include: {
                lead: true,
            },
            orderBy: {
                scheduledAt: 'asc',
            },
        });
    }
    async deleteMeeting(id) {
        this.logger.log(`Cancelling meeting: ${id}`);
        const meeting = await this.prisma.upcomingMeeting.findUnique({
            where: { id },
        });
        if (!meeting) {
            throw new common_1.NotFoundException(`Meeting with ID ${id} not found`);
        }
        await this.prisma.upcomingMeeting.delete({
            where: { id },
        });
        const otherMeetingsCount = await this.prisma.upcomingMeeting.count({
            where: { leadId: meeting.leadId },
        });
        if (otherMeetingsCount === 0) {
            await this.prisma.lead.update({
                where: { id: meeting.leadId },
                data: {
                    emailStatus: 'REPLIED',
                },
            });
        }
        return { success: true };
    }
};
exports.MeetingsService = MeetingsService;
exports.MeetingsService = MeetingsService = MeetingsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MeetingsService);
//# sourceMappingURL=meetings.service.js.map