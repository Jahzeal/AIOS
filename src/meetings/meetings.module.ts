import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MeetingsController } from './meetings.controller';
import { MeetingsService } from './meetings.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [MeetingsController],
  providers: [MeetingsService],
  exports: [MeetingsService],
})
export class MeetingsModule {}
