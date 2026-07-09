import { Controller, Get, Post, Delete, Param, Body, Query, HttpCode, HttpStatus, Req, UseGuards } from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('api/meetings')
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}



  @Post()
  async createMeeting(
    @Body()
    body: {
      leadId: string;
      title: string;
      email: string;
      meetingLink: string;
      scheduledAt: string;
    },
  ) {
    return this.meetingsService.createMeeting(
      body.leadId,
      body.title,
      body.email,
      body.meetingLink,
      body.scheduledAt,
    );
  }

  @Post('webhook')
  async handleCalendarWebhook(
    @Body()
    body: {
      email: string;
      title?: string;
      meetingLink?: string;
      scheduledAt: string;
    },
  ) {
    return this.meetingsService.createMeetingByEmail(
      body.email,
      body.title || 'Google Calendar Booking',
      body.meetingLink || '',
      body.scheduledAt,
    );
  }

  @Get()
  @UseGuards(AuthGuard)
  async findAllMeetings(@Req() req: any) {
    return this.meetingsService.findAllMeetings(req.user.userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteMeeting(@Param('id') id: string) {
    return this.meetingsService.deleteMeeting(id);
  }
}
