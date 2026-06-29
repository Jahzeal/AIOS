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
var FirecrawlService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirecrawlService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = __importDefault(require("axios"));
let FirecrawlService = FirecrawlService_1 = class FirecrawlService {
    configService;
    logger = new common_1.Logger(FirecrawlService_1.name);
    apiKey;
    isMockMode;
    constructor(configService) {
        this.configService = configService;
        this.apiKey = this.configService.get('FIRECRAWL_API_KEY') || '';
        this.isMockMode = !this.apiKey || this.apiKey.trim() === '' || this.apiKey.startsWith('YOUR_');
        if (this.isMockMode) {
            this.logger.warn('Firecrawl API key not set. Operating in Sandbox/Mock Mode.');
        }
        else {
            this.logger.log('Firecrawl API key detected. Operating in Live Mode.');
        }
    }
    async search(query, location) {
        const fullQuery = `"${query}" "${location}" contact email -site:yelp.com -site:yell.com -site:checkatrade.com -site:mybuilder.com -site:trustatrader.com`;
        this.logger.log(`Searching for: "${fullQuery}"`);
        if (this.isMockMode) {
            await this.sleep(1500);
            return this.generateMockDomains(query, location);
        }
        try {
            const response = await axios_1.default.post('https://api.firecrawl.dev/v1/search', { query: fullQuery, limit: 20 }, {
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
            });
            if (response.data && response.data.success && Array.isArray(response.data.data)) {
                const items = response.data.data;
                const urls = this.filterAndNormalizeUrls(items, query, location);
                this.logger.log(`Search returned ${items.length} raw results, filtered to ${urls.length} viable targets.`);
                return urls;
            }
            this.logger.error('Invalid search response from Firecrawl:', response.data);
            return [];
        }
        catch (error) {
            this.logger.error(`Firecrawl search failed: ${error.message}`, error.stack);
            throw new Error(`Failed to search via Firecrawl: ${error.message}`);
        }
    }
    async scrape(url) {
        this.logger.log(`Scraping URL: ${url}`);
        if (this.isMockMode) {
            await this.sleep(2000);
            return this.generateMockScrapeResult(url);
        }
        try {
            const response = await axios_1.default.post('https://api.firecrawl.dev/v1/scrape', {
                url: url,
                formats: ['json'],
                jsonOptions: {
                    schema: {
                        type: 'object',
                        properties: {
                            company_name: { type: 'string', description: 'Name of the business' },
                            email: { type: 'string', description: 'Contact email address' },
                            phone: { type: 'string', description: 'Contact phone number' },
                            facebook: { type: 'string', description: 'Facebook page URL' },
                            instagram: { type: 'string', description: 'Instagram page URL' },
                            linkedin: { type: 'string', description: 'LinkedIn company or personal page URL' },
                            twitter: { type: 'string', description: 'Twitter/X profile URL' },
                            address: { type: 'string', description: 'Physical address of the business' },
                            description: { type: 'string', description: 'Brief description of the company and what they do' }
                        },
                        required: ['company_name']
                    }
                }
            }, {
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
            });
            if (response.data && response.data.success && response.data.data?.json) {
                const info = response.data.data.json;
                return {
                    companyName: info.company_name || this.getDomainName(url),
                    website: url,
                    email: this.sanitizeEmail(info.email),
                    phone: this.sanitizePhone(info.phone),
                    facebook: info.facebook || null,
                    instagram: info.instagram || null,
                    linkedin: info.linkedin || null,
                    twitter: info.twitter || null,
                    address: info.address || null,
                    description: info.description || null
                };
            }
            return {
                companyName: this.getDomainName(url),
                website: url,
                description: 'Scraped successfully, but no structured data returned.'
            };
        }
        catch (error) {
            this.logger.error(`Firecrawl scraping failed for ${url}: ${error.message}`);
            throw new Error(`Failed to scrape URL ${url}: ${error.message}`);
        }
    }
    filterAndNormalizeUrls(items, query, location) {
        const domains = new Set();
        const queryWords = query.toLowerCase().split(/\s+/);
        const locationWords = location.toLowerCase().split(/[,\s]+/);
        for (const item of items) {
            const url = item.url || '';
            const title = (item.title || '').toLowerCase();
            const description = (item.description || '').toLowerCase();
            const snippet = `${title} ${description}`;
            const root = this.extractRootDomain(url);
            if (!root || this.isDirectoryOrSocial(root))
                continue;
            const hasQueryMatch = queryWords.some(w => w.length > 3 && snippet.includes(w));
            const hasLocationMatch = locationWords.some(w => w.length > 2 && snippet.includes(w));
            if (!hasQueryMatch && !hasLocationMatch) {
                this.logger.warn(`Skipping irrelevant result: ${root} (no keyword match in title/description)`);
                continue;
            }
            domains.add(root);
        }
        return Array.from(domains);
    }
    extractRootDomain(urlStr) {
        try {
            const url = new URL(urlStr);
            return `${url.protocol}//${url.hostname}`;
        }
        catch (e) {
            return null;
        }
    }
    isDirectoryOrSocial(domain) {
        const blacklist = [
            'facebook.com', 'instagram.com', 'linkedin.com', 'twitter.com', 'x.com',
            'youtube.com', 'pinterest.com', 'tiktok.com', 'snapchat.com',
            'yelp.', 'tripadvisor.', 'yellowpages.', 'foursquare.', 'mapquest.',
            'yell.com', 'thomsonlocal.', 'scoot.co.uk', 'freeindex.co.uk',
            'bark.com', 'rated-people.com', 'checkatrade.com', 'mybuilder.com',
            'trustatrader.com', 'tradesman.net', 'habitissimo.',
            'booking.', 'expedia.', 'airbnb.', 'hotels.com', 'kayak.',
            'groupon.', 'wowcher.',
            'google.com', 'bing.com', 'yahoo.com', 'reddit.com',
            'wikipedia.org', 'wikimedia.',
            'indeed.com', 'glassdoor.', 'reed.co.uk', 'totaljobs.', 'cv-library.',
            'scrap.io', 'apollo.io', 'hunter.io', 'zoominfo.', 'clearbit.',
            'lusha.', 'seamless.ai', 'snov.io', 'leadfeeder.',
            'crunchbase.com', 'dnb.com', 'companieshouse.gov.uk',
            'bloomberg.com', 'pitchbook.', 'owler.',
            'bbc.co.uk', 'theguardian.', 'dailymail.', 'mirror.co.uk',
            'amazon.', 'ebay.', 'etsy.', 'shopify.',
        ];
        const lowercase = domain.toLowerCase();
        return blacklist.some(term => lowercase.includes(term));
    }
    getDomainName(urlStr) {
        try {
            const url = new URL(urlStr);
            const host = url.hostname.replace('www.', '');
            const parts = host.split('.');
            if (parts.length > 0) {
                return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
            }
            return urlStr;
        }
        catch (e) {
            return urlStr;
        }
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    sanitizeEmail(raw) {
        if (!raw)
            return undefined;
        const trimmed = raw.trim();
        const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(trimmed)) {
            this.logger.warn(`Discarding invalid scraped email value: "${trimmed}"`);
            return undefined;
        }
        return trimmed.toLowerCase();
    }
    sanitizePhone(raw) {
        if (!raw)
            return undefined;
        const trimmed = raw.trim();
        if (trimmed.startsWith('/') || trimmed.startsWith('#') || trimmed.startsWith('http'))
            return undefined;
        const digitCount = (trimmed.match(/\d/g) || []).length;
        if (digitCount < 7)
            return undefined;
        return trimmed;
    }
    generateMockDomains(query, location) {
        const cleanQuery = query.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanLoc = location.toLowerCase().replace(/[^a-z0-9]/g, '');
        return [
            `https://www.theartisanal${cleanQuery}-${cleanLoc}.co.uk`,
            `https://www.golden${cleanQuery}hub.com`,
            `https://www.family${cleanQuery}andco.net`,
            `https://www.urban${cleanQuery}.org`,
            `https://www.craft${cleanQuery}masters.com`
        ];
    }
    generateMockScrapeResult(url) {
        const domainName = this.getDomainName(url);
        const domainHost = new URL(url).hostname.replace('www.', '');
        return {
            companyName: `${domainName} Co.`,
            website: url,
            email: `info@${domainHost}`,
            phone: `+44 20 7946 ${Math.floor(1000 + Math.random() * 9000)}`,
            facebook: `https://facebook.com/${domainName.toLowerCase()}`,
            instagram: `https://instagram.com/${domainName.toLowerCase()}`,
            linkedin: `https://linkedin.com/company/${domainName.toLowerCase()}`,
            twitter: `https://x.com/${domainName.toLowerCase()}`,
            address: `${Math.floor(10 + Math.random() * 200)} High Street, London, W1D 4ST, UK`,
            description: `A premium, boutique business offering specialized services. We are dedicated to quality, customer satisfaction, and authentic products crafted locally.`
        };
    }
    isRelevantToQuery(query, scrapedDescription, companyName) {
        if (!scrapedDescription && !companyName)
            return true;
        const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const text = `${companyName} ${scrapedDescription}`.toLowerCase();
        return queryWords.length === 0 || queryWords.some(w => text.includes(w));
    }
};
exports.FirecrawlService = FirecrawlService;
exports.FirecrawlService = FirecrawlService = FirecrawlService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], FirecrawlService);
//# sourceMappingURL=firecrawl.service.js.map