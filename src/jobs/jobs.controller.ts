import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Delete,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JobsService } from './jobs.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('api')
@UseGuards(AuthGuard)
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post('jobs/search')
  async createSearchJob(
    @Req() req: any,
    @Body() body: { query: string; location: string; keywords?: string },
  ) {
    return this.jobsService.createSearchJob(
      req.user.userId,
      body.query,
      body.location,
      body.keywords,
    );
  }

  @Post('jobs/urls')
  async createUrlJob(@Req() req: any, @Body() body: { urls: string[] }) {
    return this.jobsService.createUrlJob(req.user.userId, body.urls);
  }

  @Get('jobs')
  async findAllJobs(@Req() req: any) {
    return this.jobsService.findAllJobs(req.user.userId);
  }

  @Get('jobs/:id')
  async findOneJob(@Req() req: any, @Param('id') id: string) {
    return this.jobsService.findOneJob(req.user.userId, id);
  }

  @Get('leads')
  async findAllLeads(@Req() req: any, @Query('search') search?: string) {
    return this.jobsService.findAllLeads(req.user.userId, search);
  }

  @Delete('jobs/:id')
  async deleteJob(@Req() req: any, @Param('id') id: string) {
    return this.jobsService.deleteJob(req.user.userId, id);
  }

  @Post('jobs/:id/stop')
  async stopJob(@Req() req: any, @Param('id') id: string) {
    return this.jobsService.stopJob(req.user.userId, id);
  }
}
