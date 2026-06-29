import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HunterService } from './hunter.service';

@Module({
  imports: [ConfigModule],
  providers: [HunterService],
  exports: [HunterService],
})
export class HunterModule {}
