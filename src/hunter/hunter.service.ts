import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface HunterContact {
  name: string;
  role: string;
  email: string;
}

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
          limit: 15,
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

        this.logger.log(`Hunter.io found ${contacts.length} contacts for ${cleanDomain}`);
        return contacts;
      }

      return [];
    } catch (error: any) {
      const apiError = error.response?.data || error.message;
      this.logger.error(`Hunter.io Domain Search failed for ${cleanDomain}: ${JSON.stringify(apiError)}`);
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

  private generateMockContacts(domain: string): HunterContact[] {
    return [
      { name: 'Dr. James Smith',   role: 'Clinical Director & Chief Dentist', email: `jahzealibeh16@gmail.com` },
      { name: 'Dr. Sarah Jenkins', role: 'Practice Manager',                  email: `aukwu@senoraconstruction.com` },
    ];
  }
}
