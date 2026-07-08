import { OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
export declare class AuthService implements OnModuleInit {
    private prisma;
    private configService;
    private readonly logger;
    private tokens;
    private otpStore;
    constructor(prisma: PrismaService, configService: ConfigService);
    onModuleInit(): Promise<void>;
    hashPassword(password: string): string;
    verifyPassword(password: string, stored: string): boolean;
    createToken(userId: string, email: string): string;
    validateToken(token: string): {
        userId: string;
        email: string;
    } | null;
    generateOtp(): string;
    storeOtp(email: string, code: string): void;
    verifyOtp(email: string, code: string): boolean;
    sendOtpEmail(toEmail: string, code: string): Promise<void>;
}
