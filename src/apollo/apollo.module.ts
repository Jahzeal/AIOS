import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApolloService } from './apollo.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [ApolloService],
  exports: [ApolloService],
})
export class ApolloModule {}
