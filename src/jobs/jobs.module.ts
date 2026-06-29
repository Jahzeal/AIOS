import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { FirecrawlModule } from '../firecrawl/firecrawl.module';
import { EmailModule } from '../email/email.module';
import { HunterModule } from '../hunter/hunter.module';
import { ApolloModule } from '../apollo/apollo.module';

@Module({
  imports: [FirecrawlModule, EmailModule, HunterModule, ApolloModule],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
