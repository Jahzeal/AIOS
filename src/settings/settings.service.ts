import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Settings } from '@prisma/client';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger('SettingsService');

  constructor(private readonly prisma: PrismaService) {}

  async getSettings(): Promise<Settings> {
    try {
      let settings = await this.prisma.settings.findFirst();
      if (!settings) {
        // create default settings if none exist
        settings = await this.prisma.settings.create({ data: {} });
      }
      return settings;
    } catch (err) {
      this.logger.error(`Error fetching settings: ${err.message}`);
      throw err;
    }
  }

  async updateSettings(data: Partial<Settings>): Promise<Settings> {
    try {
      const existing = await this.prisma.settings.findFirst();
      if (!existing) {
        // No settings yet, create with provided data
        return await this.prisma.settings.create({ data });
      }
      return await this.prisma.settings.update({
        where: { id: existing.id },
        data,
      });
    } catch (err) {
      this.logger.error(`Error updating settings: ${err.message}`);
      throw err;
    }
  }
}
