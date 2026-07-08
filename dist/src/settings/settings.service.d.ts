import { PrismaService } from '../prisma/prisma.service';
import { Settings } from '@prisma/client';
export declare class SettingsService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    getSettings(): Promise<Settings>;
    updateSettings(data: Partial<Settings>): Promise<Settings>;
}
