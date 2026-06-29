import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface HunterContact {
  name: string;
  role: string;
  email: string;
}

// Seniority levels Hunter.io API supports as filter values
const HUNTER_SENIORITY_LEVELS = ['executive', 'director', 'manager', 'owner', 'partner'];

// Ordered from highest to lowest priority for ranking
const DECISION_MAKER_KEYWORDS = [
  'ceo', 'chief', 'owner', 'founder', 'president', 'director', 'vp', 'vice president',
  'head of', 'manager', 'partner', 'principal', 'managing',
];

@Injectable()
export class HunterService {
  private readonly logger = new Logger(HunterService.name);
  private readonly apiKey: string;
  private readonly isMockMode: boolean;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('HUNTER_API_KEY') || '';
    this.isMockMode = !this.apiKey || this.apiKey.trim() === '' || this.apiKey.startsWith('YOUR_');
    if (this.isMockMode) {
      this.logger.warn('Hunter.io API key not set or invalid. Operating in Sandbox/Mock Mode.');
    } else {
      this.logger.log('Hunter.io API key detected. Operating in Live Mode.');
    }
  }

  /**
   * Search Hunter.io Domain Search API — returns only managerial/decision-maker contacts,
   * ranked highest seniority first.
   */
  async findContacts(domain: string): Promise<HunterContact[]> {
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
      const response = await axios.get('https://api.hunter.io/v2/domain-search', {
        params: {
          domain: cleanDomain,
          api_key: this.apiKey,
          seniority: HUNTER_SENIORITY_LEVELS.join(','), // filter at API level
          limit: 10,
        },
      });

      if (response.data && response.data.data && Array.isArray(response.data.data.emails)) {
        const emails = response.data.data.emails;
        const contacts: HunterContact[] = emails
          .filter((e: any) => e.first_name || e.last_name) // only named contacts
          .map((e: any) => ({
            name: `${e.first_name || ''} ${e.last_name || ''}`.trim(),
            role: e.position || 'Manager',
            email: e.value,
          }));

        const ranked = this.rankByDecisionMakerScore(contacts);
        this.logger.log(`Hunter.io found ${ranked.length} decision-maker contacts for ${cleanDomain}`);
        return ranked;
      }

      return [];
    } catch (error: any) {
      const apiError = error.response?.data || error.message;
      this.logger.error(`Hunter.io Domain Search failed for ${cleanDomain}: ${JSON.stringify(apiError)}`);
      return [];
    }
  }

  /**
   * Sort contacts so highest-seniority decision makers come first
   */
  private rankByDecisionMakerScore(contacts: HunterContact[]): HunterContact[] {
    return [...contacts].sort((a, b) => this.decisionMakerScore(b.role) - this.decisionMakerScore(a.role));
  }

  private decisionMakerScore(role: string): number {
    if (!role) return 0;
    const r = role.toLowerCase();
    for (let i = 0; i < DECISION_MAKER_KEYWORDS.length; i++) {
      if (r.includes(DECISION_MAKER_KEYWORDS[i])) return DECISION_MAKER_KEYWORDS.length - i;
    }
    return 0;
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

  private generateMockContacts(domain: string): HunterContact[] {
    return [
      { name: 'Dr. James Smith',   role: 'Clinical Director & Chief Dentist', email: `jahzealibeh16@gmail.com` },
      { name: 'Dr. Sarah Jenkins', role: 'Practice Manager',                  email: `jahzealibeh16@gmail.com` },
    ];
  }
}
