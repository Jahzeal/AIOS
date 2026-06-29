import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { JobsModule } from './jobs/jobs.module';
import { EmailModule } from './email/email.module';
import { MeetingsModule } from './meetings/meetings.module';
import { HunterModule } from './hunter/hunter.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'frontend', 'dist'),
      exclude: ['/api/(.*)'],
    }),
    PrismaModule,
    JobsModule,
    EmailModule,
    MeetingsModule,
    HunterModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
