import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface ApolloContact {
  name: string;
  role: string;
  email: string;
}

// Decision-maker titles to filter by (Apollo supports title-based search)
const DECISION_MAKER_TITLES = [
  'CEO', 'Chief Executive', 'Founder', 'Co-Founder', 'Owner',
  'President', 'Managing Director', 'Director', 'VP', 'Vice President',
  'Head of', 'Manager', 'Partner', 'Principal',
];

@Injectable()
export class ApolloService {
  private readonly logger = new Logger(ApolloService.name);
  private readonly apiKey: string;
  private readonly isMockMode: boolean;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('APOLLO_API_KEY') || '';
    this.isMockMode = !this.apiKey || this.apiKey.trim() === '' || this.apiKey.startsWith('YOUR_');
    if (this.isMockMode) {
      this.logger.warn('Apollo.io API key not set. Operating in Mock Mode.');
    } else {
      this.logger.log('Apollo.io API key detected. Operating in Live Mode.');
    }
  }

  /**
   * Search Apollo.io People Search API for decision-makers at a given domain
   */
  async findContacts(domain: string): Promise<ApolloContact[]> {
    const cleanDomain = this.extractDomain(domain);
    if (!cleanDomain) {
      this.logger.error(`Invalid domain format: ${domain}`);
      return [];
    }

    this.logger.log(`Searching Apollo.io for decision-makers at: ${cleanDomain}`);

    if (this.isMockMode) {
      await this.sleep(800);
      return []; // Apollo mock returns empty so Hunter mock contacts are used
    }

    try {
      const response = await axios.post(
        'https://api.apollo.io/v1/mixed_people/search',
        {
          api_key: this.apiKey,
          q_organization_domains: [cleanDomain],
          person_titles: DECISION_MAKER_TITLES,
          page: 1,
          per_page: 10,
        },
        { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' } },
      );

      const people = response.data?.people;
      if (!Array.isArray(people)) return [];

      const contacts: ApolloContact[] = people
        .filter((p: any) => p.email && p.first_name) // only people with emails and names
        .map((p: any) => ({
          name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
          role: p.title || 'Manager',
          email: p.email,
        }));

      this.logger.log(`Apollo.io found ${contacts.length} decision-maker contacts for ${cleanDomain}`);
      return contacts;
    } catch (error: any) {
      const apiError = error.response?.data || error.message;
      this.logger.error(`Apollo.io search failed for ${cleanDomain}: ${JSON.stringify(apiError)}`);
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
      return urlStr.replace(/https?:\/\//i, '').replace('www.', '').split('/')[0];
    }
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
