import { ConfigService } from '@nestjs/config';
export interface ApolloContact {
    name: string;
    role: string;
    email: string;
}
export declare class ApolloService {
    private configService;
    private readonly logger;
    private readonly apiKey;
    private readonly isMockMode;
    constructor(configService: ConfigService);
    findContacts(domain: string): Promise<ApolloContact[]>;
    private extractDomain;
    private sleep;
}
