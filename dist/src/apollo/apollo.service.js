"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var ApolloService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApolloService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = __importDefault(require("axios"));
const prisma_service_1 = require("../prisma/prisma.service");
const DECISION_MAKER_TITLES = [
    'CTO', 'Chief Technology Officer', 'VP of Engineering', 'VP Engineering',
    'Director of Engineering', 'Head of Engineering', 'Tech Lead', 'Technical Lead',
    'Chief Architect', 'VP of Technology', 'Head of Technology',
    'VP of IT', 'Head of IT', 'IT Manager', 'Engineering Manager'
];
let ApolloService = ApolloService_1 = class ApolloService {
    configService;
    prisma;
    logger = new common_1.Logger(ApolloService_1.name);
    apiKey;
    isMockMode;
    constructor(configService, prisma) {
        this.configService = configService;
        this.prisma = prisma;
        this.apiKey = this.configService.get('APOLLO_API_KEY') || '';
        this.isMockMode = !this.apiKey || this.apiKey.trim() === '' || this.apiKey.startsWith('YOUR_');
        if (this.isMockMode) {
            this.logger.warn('Apollo.io API key not set. Operating in Mock Mode.');
        }
        else {
            this.logger.log('Apollo.io API key detected. Operating in Live Mode.');
        }
    }
    async findContacts(domain, userId, customKeywords) {
        const cleanDomain = this.extractDomain(domain);
        if (!cleanDomain) {
            this.logger.error(`Invalid domain format: ${domain}`);
            return [];
        }
        let targetTitles = DECISION_MAKER_TITLES;
        if (customKeywords && customKeywords.trim()) {
            const parsedTitles = customKeywords
                .split(',')
                .map(t => t.trim())
                .filter(Boolean);
            if (parsedTitles.length > 0) {
                targetTitles = parsedTitles;
                this.logger.log(`Using manual job target titles override: ${JSON.stringify(targetTitles)}`);
            }
        }
        else {
            try {
                const settings = userId
                    ? await this.prisma.settings.findFirst({ where: { userId } })
                    : await this.prisma.settings.findFirst();
                if (settings && settings.crawlKeywords) {
                    const parsedTitles = settings.crawlKeywords
                        .split(',')
                        .map(t => t.trim())
                        .filter(Boolean);
                    if (parsedTitles.length > 0) {
                        targetTitles = parsedTitles;
                        this.logger.log(`Using custom target titles from user settings crawlKeywords: ${JSON.stringify(targetTitles)}`);
                    }
                }
            }
            catch (e) {
                this.logger.error(`Failed to read search keywords from settings: ${e.message}`);
            }
        }
        this.logger.log(`Searching Apollo.io for decision-makers at: ${cleanDomain} targeting titles: ${JSON.stringify(targetTitles)}`);
        if (this.isMockMode) {
            await this.sleep(800);
            return [];
        }
        try {
            const response = await axios_1.default.post('https://api.apollo.io/v1/mixed_people/search', {
                q_organization_domains: [cleanDomain],
                person_titles: targetTitles,
                page: 1,
                per_page: 10,
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache',
                    'X-Api-Key': this.apiKey,
                },
            });
            const people = response.data?.people;
            if (!Array.isArray(people))
                return [];
            const contacts = people
                .filter((p) => p.email && p.first_name)
                .map((p) => ({
                name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
                role: p.title || 'Manager',
                email: p.email,
                phone: p.phone_numbers?.[0]?.raw_number || undefined,
            }));
            this.logger.log(`Apollo.io found ${contacts.length} decision-maker contacts for ${cleanDomain}`);
            return contacts;
        }
        catch (error) {
            const apiError = error.response?.data || error.message;
            const errorStr = JSON.stringify(apiError);
            if (errorStr.includes('API_INACCESSIBLE') || errorStr.includes('free plan')) {
                this.logger.warn(`Apollo.io search is disabled: Your Apollo API key is on the Free Plan and does not support People Search API requests. Please upgrade your plan at https://app.apollo.io/ to enable this enrichment.`);
            }
            else {
                this.logger.error(`Apollo.io search failed for ${cleanDomain}: ${errorStr}`);
            }
            return [];
        }
    }
    extractDomain(urlStr) {
        try {
            let tempUrl = urlStr.trim();
            if (!/^https?:\/\//i.test(tempUrl))
                tempUrl = 'https://' + tempUrl;
            const parsed = new URL(tempUrl);
            return parsed.hostname.replace('www.', '');
        }
        catch (e) {
            return urlStr.replace(/https?:\/\//i, '').replace('www.', '').split('/')[0];
        }
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
};
exports.ApolloService = ApolloService;
exports.ApolloService = ApolloService = ApolloService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService])
], ApolloService);
//# sourceMappingURL=apollo.service.js.map