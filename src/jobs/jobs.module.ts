import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { FirecrawlModule } from '../firecrawl/firecrawl.module';
import { EmailModule } from '../email/email.module';
import { HunterModule } from '../hunter/hunter.module';
import { ApolloModule } from '../apollo/apollo.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [FirecrawlModule, EmailModule, HunterModule, ApolloModule, AuthModule],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
