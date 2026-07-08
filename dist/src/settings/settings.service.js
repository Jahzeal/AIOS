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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let SettingsService = class SettingsService {
    prisma;
    logger = new common_1.Logger('SettingsService');
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getSettings() {
        try {
            let settings = await this.prisma.settings.findFirst();
            if (!settings) {
                settings = await this.prisma.settings.create({ data: {} });
            }
            return settings;
        }
        catch (err) {
            this.logger.error(`Error fetching settings: ${err.message}`);
            throw err;
        }
    }
    async updateSettings(data) {
        try {
            const existing = await this.prisma.settings.findFirst();
            if (!existing) {
                return await this.prisma.settings.create({ data });
            }
            return await this.prisma.settings.update({
                where: { id: existing.id },
                data,
            });
        }
        catch (err) {
            this.logger.error(`Error updating settings: ${err.message}`);
            throw err;
        }
    }
};
exports.SettingsService = SettingsService;
exports.SettingsService = SettingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SettingsService);
//# sourceMappingURL=settings.service.js.map