import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
export declare class AuthController {
    private readonly authService;
    private readonly prisma;
    constructor(authService: AuthService, prisma: PrismaService);
    login(body: any): Promise<{
        token: string;
        email: string;
    }>;
    me(authHeader: string): Promise<{
        email: string;
        userId: string;
    }>;
    sendCode(body: any): Promise<{
        message: string;
    }>;
    register(body: any): Promise<{
        token: string;
        email: string;
    }>;
}
