import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FirecrawlService } from './firecrawl.service';

@Module({
  imports: [ConfigModule],
  providers: [FirecrawlService],
  exports: [FirecrawlService],
})
export class FirecrawlModule {}
