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
const DECISION_MAKER_TITLES = [
    'CEO', 'Chief Executive', 'Founder', 'Co-Founder', 'Owner',
    'President', 'Managing Director', 'Director', 'VP', 'Vice President',
    'Head of', 'Manager', 'Partner', 'Principal',
];
let ApolloService = ApolloService_1 = class ApolloService {
    configService;
    logger = new common_1.Logger(ApolloService_1.name);
    apiKey;
    isMockMode;
    constructor(configService) {
        this.configService = configService;
        this.apiKey = this.configService.get('APOLLO_API_KEY') || '';
        this.isMockMode = !this.apiKey || this.apiKey.trim() === '' || this.apiKey.startsWith('YOUR_');
        if (this.isMockMode) {
            this.logger.warn('Apollo.io API key not set. Operating in Mock Mode.');
        }
        else {
            this.logger.log('Apollo.io API key detected. Operating in Live Mode.');
        }
    }
    async findContacts(domain) {
        const cleanDomain = this.extractDomain(domain);
        if (!cleanDomain) {
            this.logger.error(`Invalid domain format: ${domain}`);
            return [];
        }
        this.logger.log(`Searching Apollo.io for decision-makers at: ${cleanDomain}`);
        if (this.isMockMode) {
            await this.sleep(800);
            return [];
        }
        try {
            const response = await axios_1.default.post('https://api.apollo.io/v1/mixed_people/search', {
                api_key: this.apiKey,
                q_organization_domains: [cleanDomain],
                person_titles: DECISION_MAKER_TITLES,
                page: 1,
                per_page: 10,
            }, { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' } });
            const people = response.data?.people;
            if (!Array.isArray(people))
                return [];
            const contacts = people
                .filter((p) => p.email && p.first_name)
                .map((p) => ({
                name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
                role: p.title || 'Manager',
                email: p.email,
            }));
            this.logger.log(`Apollo.io found ${contacts.length} decision-maker contacts for ${cleanDomain}`);
            return contacts;
        }
        catch (error) {
            const apiError = error.response?.data || error.message;
            this.logger.error(`Apollo.io search failed for ${cleanDomain}: ${JSON.stringify(apiError)}`);
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
    __metadata("design:paramtypes", [config_1.ConfigService])
], ApolloService);
//# sourceMappingURL=apollo.service.js.map