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
var HunterService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HunterService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = __importDefault(require("axios"));
const HUNTER_SENIORITY_LEVELS = ['executive', 'director', 'manager', 'owner', 'partner'];
const DECISION_MAKER_KEYWORDS = [
    'ceo', 'chief', 'owner', 'founder', 'president', 'director', 'vp', 'vice president',
    'head of', 'manager', 'partner', 'principal', 'managing',
];
let HunterService = HunterService_1 = class HunterService {
    configService;
    logger = new common_1.Logger(HunterService_1.name);
    apiKey;
    isMockMode;
    constructor(configService) {
        this.configService = configService;
        this.apiKey = this.configService.get('HUNTER_API_KEY') || '';
        this.isMockMode = !this.apiKey || this.apiKey.trim() === '' || this.apiKey.startsWith('YOUR_');
        if (this.isMockMode) {
            this.logger.warn('Hunter.io API key not set or invalid. Operating in Sandbox/Mock Mode.');
        }
        else {
            this.logger.log('Hunter.io API key detected. Operating in Live Mode.');
        }
    }
    async findContacts(domain) {
        const cleanDomain = this.extractDomain(domain);
        if (!cleanDomain) {
            this.logger.error(`Invalid domain format: ${domain}`);
            return [];
        }
        this.logger.log(`Searching decision-maker contacts for domain: ${cleanDomain}`);
        if (this.isMockMode) {
            await this.sleep(1000);
            return this.generateMockContacts(cleanDomain);
        }
        try {
            const response = await axios_1.default.get('https://api.hunter.io/v2/domain-search', {
                params: {
                    domain: cleanDomain,
                    api_key: this.apiKey,
                    seniority: HUNTER_SENIORITY_LEVELS.join(','),
                    limit: 10,
                },
            });
            if (response.data && response.data.data && Array.isArray(response.data.data.emails)) {
                const emails = response.data.data.emails;
                const contacts = emails
                    .filter((e) => e.first_name || e.last_name)
                    .map((e) => ({
                    name: `${e.first_name || ''} ${e.last_name || ''}`.trim(),
                    role: e.position || 'Manager',
                    email: e.value,
                }));
                const ranked = this.rankByDecisionMakerScore(contacts);
                this.logger.log(`Hunter.io found ${ranked.length} decision-maker contacts for ${cleanDomain}`);
                return ranked;
            }
            return [];
        }
        catch (error) {
            const apiError = error.response?.data || error.message;
            this.logger.error(`Hunter.io Domain Search failed for ${cleanDomain}: ${JSON.stringify(apiError)}`);
            return [];
        }
    }
    rankByDecisionMakerScore(contacts) {
        return [...contacts].sort((a, b) => this.decisionMakerScore(b.role) - this.decisionMakerScore(a.role));
    }
    decisionMakerScore(role) {
        if (!role)
            return 0;
        const r = role.toLowerCase();
        for (let i = 0; i < DECISION_MAKER_KEYWORDS.length; i++) {
            if (r.includes(DECISION_MAKER_KEYWORDS[i]))
                return DECISION_MAKER_KEYWORDS.length - i;
        }
        return 0;
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
    generateMockContacts(domain) {
        return [
            { name: 'Dr. James Smith', role: 'Clinical Director & Chief Dentist', email: `jahzealibeh16@gmail.com` },
            { name: 'Dr. Sarah Jenkins', role: 'Practice Manager', email: `jahzealibeh16@gmail.com` },
        ];
    }
};
exports.HunterService = HunterService;
exports.HunterService = HunterService = HunterService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], HunterService);
//# sourceMappingURL=hunter.service.js.map