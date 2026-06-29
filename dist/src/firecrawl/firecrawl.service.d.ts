import { ConfigService } from '@nestjs/config';
export interface ScrapeResult {
    companyName: string;
    website: string;
    email?: string;
    phone?: string;
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    twitter?: string;
    address?: string;
    description?: string;
}
export declare class FirecrawlService {
    private configService;
    private readonly logger;
    private readonly apiKey;
    private readonly isMockMode;
    constructor(configService: ConfigService);
    search(query: string, location: string): Promise<string[]>;
    scrape(url: string): Promise<ScrapeResult>;
    private filterAndNormalizeUrls;
    private extractRootDomain;
    private isDirectoryOrSocial;
    private getDomainName;
    private sleep;
    private sanitizeEmail;
    private sanitizePhone;
    private generateMockDomains;
    private generateMockScrapeResult;
    isRelevantToQuery(query: string, scrapedDescription: string, companyName: string): boolean;
}
