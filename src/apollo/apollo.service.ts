import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';

export interface ApolloContact {
  name: string;
  role: string;
  email: string;
  phone?: string;
}

// Decision-maker titles to filter by (Apollo supports title-based search)
const DECISION_MAKER_TITLES = [
  'CTO',
  'Chief Technology Officer',
  'VP of Engineering',
  'VP Engineering',
  'Director of Engineering',
  'Head of Engineering',
  'Tech Lead',
  'Technical Lead',
  'Chief Architect',
  'VP of Technology',
  'Head of Technology',
  'VP of IT',
  'Head of IT',
  'IT Manager',
  'Engineering Manager',
];

@Injectable()
export class ApolloService {
  private readonly logger = new Logger(ApolloService.name);
  private readonly apiKey: string;
  private readonly isMockMode: boolean;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.apiKey = this.configService.get<string>('APOLLO_API_KEY') || '';
    this.isMockMode =
      !this.apiKey ||
      this.apiKey.trim() === '' ||
      this.apiKey.startsWith('YOUR_');
    if (this.isMockMode) {
      this.logger.warn('Apollo.io API key not set. Operating in Mock Mode.');
    } else {
      this.logger.log('Apollo.io API key detected. Operating in Live Mode.');
    }
  }

  /**
   * Search Apollo.io People Search API for decision-makers at a given domain
   */
  async findContacts(
    domain: string,
    userId?: string,
    customKeywords?: string,
  ): Promise<ApolloContact[]> {
    const cleanDomain = this.extractDomain(domain);
    if (!cleanDomain) {
      this.logger.error(`Invalid domain format: ${domain}`);
      return [];
    }

    // Load custom titles/keywords from manual job override or settings
    let targetTitles = DECISION_MAKER_TITLES;

    if (customKeywords && customKeywords.trim()) {
      const parsedTitles = customKeywords
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      if (parsedTitles.length > 0) {
        targetTitles = parsedTitles;
        this.logger.log(
          `Using manual job target titles override: ${JSON.stringify(targetTitles)}`,
        );
      }
    } else {
      try {
        const settings = userId
          ? await this.prisma.settings.findFirst({ where: { userId } })
          : await this.prisma.settings.findFirst();

        if (settings && settings.crawlKeywords) {
          const parsedTitles = settings.crawlKeywords
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean);
          if (parsedTitles.length > 0) {
            targetTitles = parsedTitles;
            this.logger.log(
              `Using custom target titles from user settings crawlKeywords: ${JSON.stringify(targetTitles)}`,
            );
          }
        }
      } catch (e: any) {
        this.logger.error(
          `Failed to read search keywords from settings: ${e.message}`,
        );
      }
    }

    this.logger.log(
      `Searching Apollo.io for decision-makers at: ${cleanDomain} targeting titles: ${JSON.stringify(targetTitles)}`,
    );

    if (this.isMockMode) {
      await this.sleep(800);
      return []; // Apollo mock returns empty so Hunter mock contacts are used
    }

    try {
      const response = await axios.post(
        'https://api.apollo.io/v1/mixed_people/search',
        {
          q_organization_domains: [cleanDomain],
          person_titles: targetTitles,
          page: 1,
          per_page: 10,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'X-Api-Key': this.apiKey,
          },
        },
      );

      const people = response.data?.people;
      if (!Array.isArray(people)) return [];

      const contacts: ApolloContact[] = people
        .filter((p: any) => p.email && p.first_name) // only people with emails and names
        .map((p: any) => ({
          name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
          role: p.title || 'Manager',
          email: p.email,
          phone: p.phone_numbers?.[0]?.raw_number || undefined,
        }));

      this.logger.log(
        `Apollo.io found ${contacts.length} decision-maker contacts for ${cleanDomain}`,
      );
      return contacts;
    } catch (error: any) {
      const apiError = error.response?.data || error.message;
      const errorStr = JSON.stringify(apiError);
      if (
        errorStr.includes('API_INACCESSIBLE') ||
        errorStr.includes('free plan')
      ) {
        this.logger.warn(
          `Apollo.io search is disabled: Your Apollo API key is on the Free Plan and does not support People Search API requests. Please upgrade your plan at https://app.apollo.io/ to enable this enrichment.`,
        );
      } else {
        this.logger.error(
          `Apollo.io search failed for ${cleanDomain}: ${errorStr}`,
        );
      }
      return [];
    }
  }

  private extractDomain(urlStr: string): string | null {
    try {
      let tempUrl = urlStr.trim();
      if (!/^https?:\/\//i.test(tempUrl)) tempUrl = 'https://' + tempUrl;
      const parsed = new URL(tempUrl);
      return parsed.hostname.replace('www.', '');
    } catch (e) {
      return urlStr
        .replace(/https?:\/\//i, '')
        .replace('www.', '')
        .split('/')[0];
    }
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
