import { OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
export declare class GoogleCalendarService implements OnModuleInit {
    private readonly prisma;
    private readonly configService;
    private readonly logger;
    constructor(prisma: PrismaService, configService: ConfigService);
    onModuleInit(): void;
    getAuthUrl(): string;
    connect(userId: string, code: string): Promise<{
        success: boolean;
    }>;
    getConnection(userId: string): Promise<{
        connected: boolean;
    } | {
        email: string;
        calendarId: string;
        connectedAt: Date;
        connected: boolean;
    }>;
    disconnect(userId: string): Promise<{
        success: boolean;
    }>;
    getValidAccessToken(userId: string): Promise<string>;
    private refreshTokens;
    getCalendars(userId: string): Promise<any>;
    selectCalendar(userId: string, calendarId: string): Promise<{
        success: boolean;
    }>;
    syncUserCalendarByUserId(userId: string): Promise<void>;
    syncAll(): Promise<void>;
    syncUserCalendar(conn: any): Promise<void>;
    private revertLeadStatusIfNoMeetings;
}
