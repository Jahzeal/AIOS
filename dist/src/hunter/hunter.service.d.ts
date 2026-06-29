import { ConfigService } from '@nestjs/config';
export interface HunterContact {
    name: string;
    role: string;
    email: string;
}
export declare class HunterService {
    private configService;
    private readonly logger;
    private readonly apiKey;
    private readonly isMockMode;
    constructor(configService: ConfigService);
    findContacts(domain: string): Promise<HunterContact[]>;
    private rankByDecisionMakerScore;
    private decisionMakerScore;
    private extractDomain;
    private sleep;
    private generateMockContacts;
}
