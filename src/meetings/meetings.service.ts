import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MeetingsService {
  private readonly logger = new Logger(MeetingsService.name);

  constructor(private prisma: PrismaService) {}

  async getLead(leadId: string) {
    return this.prisma.lead.findUnique({
      where: { id: leadId },
    });
  }

  async createMeeting(
    leadId: string,
    title: string,
    email: string,
    meetingLink: string,
    scheduledAt: string,
  ) {
    this.logger.log(`Booking meeting for Lead: ${leadId}, scheduled at: ${scheduledAt}`);

    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${leadId} not found`);
    }

    // 1. Create meeting record
    const meeting = await this.prisma.upcomingMeeting.create({
      data: {
        leadId: lead.id,
        title: title || 'AIOS Automation Demo',
        email: email || lead.email || '',
        meetingLink: meetingLink || '',
        scheduledAt: new Date(scheduledAt),
      },
    });

    // 2. Update CRM (Lead) status
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

  async deleteMeeting(id: string) {
    this.logger.log(`Cancelling meeting: ${id}`);

    const meeting = await this.prisma.upcomingMeeting.findUnique({
      where: { id },
    });

    if (!meeting) {
      throw new NotFoundException(`Meeting with ID ${id} not found`);
    }

    // Delete meeting
    await this.prisma.upcomingMeeting.delete({
      where: { id },
    });

    // Check if there are other meetings for this lead. If not, reset lead status.
    const otherMeetingsCount = await this.prisma.upcomingMeeting.count({
      where: { leadId: meeting.leadId },
    });

    if (otherMeetingsCount === 0) {
      // Revert lead status to REPLIED since the meeting was cancelled
      await this.prisma.lead.update({
        where: { id: meeting.leadId },
        data: {
          emailStatus: 'REPLIED',
        },
      });
    }

    return { success: true };
  }
}
