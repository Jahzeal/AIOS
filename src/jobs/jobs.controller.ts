import { Controller, Get, Post, Body, Param, Query, Delete } from '@nestjs/common';
import { JobsService } from './jobs.service';

@Controller('api')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post('jobs/search')
  async createSearchJob(@Body() body: { query: string; location: string }) {
    return this.jobsService.createSearchJob(body.query, body.location);
  }

  @Post('jobs/urls')
  async createUrlJob(@Body() body: { urls: string[] }) {
    return this.jobsService.createUrlJob(body.urls);
  }

  @Get('jobs')
  async findAllJobs() {
    return this.jobsService.findAllJobs();
  }

  @Get('jobs/:id')
  async findOneJob(@Param('id') id: string) {
    return this.jobsService.findOneJob(id);
  }

  @Get('leads')
  async findAllLeads(@Query('search') search?: string) {
    return this.jobsService.findAllLeads(search);
  }

  @Delete('jobs/:id')
  async deleteJob(@Param('id') id: string) {
    return this.jobsService.deleteJob(id);
  }
}
