import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

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

@Injectable()
export class FirecrawlService {
  private readonly logger = new Logger(FirecrawlService.name);
  private readonly apiKey: string;
  private readonly isMockMode: boolean;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('FIRECRAWL_API_KEY') || '';
    this.isMockMode = !this.apiKey || this.apiKey.trim() === '' || this.apiKey.startsWith('YOUR_');
    if (this.isMockMode) {
      this.logger.warn('Firecrawl API key not set. Operating in Sandbox/Mock Mode.');
    } else {
      this.logger.log('Firecrawl API key detected. Operating in Live Mode.');
    }
  }

  /**
   * Search for businesses using search query and location
   */
  async search(query: string, location: string): Promise<string[]> {
    // Build a targeted query that finds actual local business contact pages
    const fullQuery = `"${query}" "${location}" contact email -site:yelp.com -site:yell.com -site:checkatrade.com -site:mybuilder.com -site:trustatrader.com`;
    this.logger.log(`Searching for: "${fullQuery}"`);

    if (this.isMockMode) {
      await this.sleep(1500); // Simulate API latency
      return this.generateMockDomains(query, location);
    }

    try {
      const response = await axios.post(
        'https://api.firecrawl.dev/v1/search',
        { query: fullQuery, limit: 20 }, // fetch more, we'll filter down
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        const items: any[] = response.data.data;
        // Pass both URL and page title/description for smarter filtering
        const urls = this.filterAndNormalizeUrls(items, query, location);
        this.logger.log(`Search returned ${items.length} raw results, filtered to ${urls.length} viable targets.`);
        return urls;
      }

      this.logger.error('Invalid search response from Firecrawl:', response.data);
      return [];
    } catch (error: any) {
      this.logger.error(`Firecrawl search failed: ${error.message}`, error.stack);
      throw new Error(`Failed to search via Firecrawl: ${error.message}`);
    }
  }

  /**
   * Scrape a target business URL and extract contact details using JSON schema
   */
  async scrape(url: string): Promise<ScrapeResult> {
    this.logger.log(`Scraping URL: ${url}`);

    if (this.isMockMode) {
      await this.sleep(2000); // Simulate scraping latency
      return this.generateMockScrapeResult(url);
    }

    try {
      const response = await axios.post(
        'https://api.firecrawl.dev/v1/scrape',
        {
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
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

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

      // Fallback in case of parsing issue but successful scrape
      return {
        companyName: this.getDomainName(url),
        website: url,
        description: 'Scraped successfully, but no structured data returned.'
      };
    } catch (error: any) {
      this.logger.error(`Firecrawl scraping failed for ${url}: ${error.message}`);
      throw new Error(`Failed to scrape URL ${url}: ${error.message}`);
    }
  }

  // --- Helper Methods ---

  private filterAndNormalizeUrls(items: any[], query: string, location: string): string[] {
    const domains = new Set<string>();
    const queryWords = query.toLowerCase().split(/\s+/);
    const locationWords = location.toLowerCase().split(/[,\s]+/);

    for (const item of items) {
      const url: string = item.url || '';
      const title: string = (item.title || '').toLowerCase();
      const description: string = (item.description || '').toLowerCase();
      const snippet = `${title} ${description}`;

      const root = this.extractRootDomain(url);
      if (!root || this.isDirectoryOrSocial(root)) continue;

      // Require at least one query keyword OR location word to appear in the page title/description
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

  private extractRootDomain(urlStr: string): string | null {
    try {
      const url = new URL(urlStr);
      return `${url.protocol}//${url.hostname}`;
    } catch (e) {
      return null;
    }
  }

  private isDirectoryOrSocial(domain: string): boolean {
    const blacklist = [
      // Social media
      'facebook.com', 'instagram.com', 'linkedin.com', 'twitter.com', 'x.com',
      'youtube.com', 'pinterest.com', 'tiktok.com', 'snapchat.com',
      // Review / directory sites
      'yelp.', 'tripadvisor.', 'yellowpages.', 'foursquare.', 'mapquest.',
      'yell.com', 'thomsonlocal.', 'scoot.co.uk', 'freeindex.co.uk',
      'bark.com', 'rated-people.com', 'checkatrade.com', 'mybuilder.com',
      'trustatrader.com', 'tradesman.net', 'habitissimo.',
      // Travel / booking
      'booking.', 'expedia.', 'airbnb.', 'hotels.com', 'kayak.',
      // Deal sites
      'groupon.', 'wowcher.',
      // Search engines & major platforms
      'google.com', 'bing.com', 'yahoo.com', 'reddit.com',
      'wikipedia.org', 'wikimedia.',
      // Job boards
      'indeed.com', 'glassdoor.', 'reed.co.uk', 'totaljobs.', 'cv-library.',
      // Data / B2B intelligence & scraping platforms
      'scrap.io', 'apollo.io', 'hunter.io', 'zoominfo.', 'clearbit.',
      'lusha.', 'seamless.ai', 'snov.io', 'leadfeeder.',
      'crunchbase.com', 'dnb.com', 'companieshouse.gov.uk',
      'bloomberg.com', 'pitchbook.', 'owler.',
      // News / media
      'bbc.co.uk', 'theguardian.', 'dailymail.', 'mirror.co.uk',
      // E-commerce giants
      'amazon.', 'ebay.', 'etsy.', 'shopify.',
    ];
    const lowercase = domain.toLowerCase();
    return blacklist.some(term => lowercase.includes(term));
  }

  private getDomainName(urlStr: string): string {
    try {
      const url = new URL(urlStr);
      const host = url.hostname.replace('www.', '');
      const parts = host.split('.');
      if (parts.length > 0) {
        return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
      }
      return urlStr;
    } catch (e) {
      return urlStr;
    }
  }

  private sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validates and cleans a scraped email string.
   * Returns undefined for junk values like /#, #contact, /page, image filenames, etc.
   */
  private sanitizeEmail(raw: string | undefined | null): string | undefined {
    if (!raw) return undefined;
    const trimmed = raw.trim();
    // Must contain @ and match a basic email pattern
    const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(trimmed)) {
      this.logger.warn(`Discarding invalid scraped email value: "${trimmed}"`);
      return undefined;
    }
    return trimmed.toLowerCase();
  }

  /**
   * Cleans a scraped phone string.
   * Returns undefined for values that look like URLs, anchors, or are too short.
   */
  private sanitizePhone(raw: string | undefined | null): string | undefined {
    if (!raw) return undefined;
    const trimmed = raw.trim();
    // Reject obvious non-phone values
    if (trimmed.startsWith('/') || trimmed.startsWith('#') || trimmed.startsWith('http')) return undefined;
    // Must have at least 7 digits
    const digitCount = (trimmed.match(/\d/g) || []).length;
    if (digitCount < 7) return undefined;
    return trimmed;
  }

  // --- Mock Generators ---

  private generateMockDomains(query: string, location: string): string[] {
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

  private generateMockScrapeResult(url: string): ScrapeResult {
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
  /**
   * Post-scrape relevance check — returns true if the scraped result is relevant to the original query
   */
  isRelevantToQuery(query: string, scrapedDescription: string, companyName: string): boolean {
    if (!scrapedDescription && !companyName) return true; // can't judge, keep it
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const text = `${companyName} ${scrapedDescription}`.toLowerCase();
    // At least one query keyword must appear somewhere in the scraped content
    return queryWords.length === 0 || queryWords.some(w => text.includes(w));
  }
}
