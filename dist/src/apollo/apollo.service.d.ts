import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
export interface ApolloContact {
    name: string;
    role: string;
    email: string;
}
export declare class ApolloService {
    private configService;
    private prisma;
    private readonly logger;
    private readonly apiKey;
    private readonly isMockMode;
    constructor(configService: ConfigService, prisma: PrismaService);
    findContacts(domain: string, userId?: string, customKeywords?: string): Promise<ApolloContact[]>;
    private extractDomain;
    private sleep;
}
