/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any */
import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
} from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { GoogleCalendarService } from './google-calendar.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('api/meetings')
export class MeetingsController {
  constructor(
    private readonly meetingsService: MeetingsService,
    private readonly googleCalendarService: GoogleCalendarService,
  ) {}

  // ─── Google Calendar OAuth & Connection ───────────────────────────
  @Get('google/auth-url')
  @UseGuards(AuthGuard)
  getGoogleAuthUrl() {
    const authUrl = this.googleCalendarService.getAuthUrl();
    return { authUrl };
  }

  @Post('google/connect')
  @UseGuards(AuthGuard)
  async connectGoogleCalendar(@Req() req: any, @Body() body: { code: string }) {
    return this.googleCalendarService.connect(req.user.userId, body.code);
  }

  @Get('google/connection')
  @UseGuards(AuthGuard)
  async getGoogleConnection(@Req() req: any) {
    return this.googleCalendarService.getConnection(req.user.userId);
  }

  @Post('google/disconnect')
  @UseGuards(AuthGuard)
  async disconnectGoogleCalendar(@Req() req: any) {
    return this.googleCalendarService.disconnect(req.user.userId);
  }

  @Get('google/calendars')
  @UseGuards(AuthGuard)
  async getGoogleCalendars(@Req() req: any) {
    return this.googleCalendarService.getCalendars(req.user.userId);
  }

  @Post('google/select-calendar')
  @UseGuards(AuthGuard)
  async selectGoogleCalendar(
    @Req() req: any,
    @Body() body: { calendarId: string },
  ) {
    return this.googleCalendarService.selectCalendar(
      req.user.userId,
      body.calendarId,
    );
  }

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
