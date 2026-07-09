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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./auth.service");
const prisma_service_1 = require("../prisma/prisma.service");
let AuthController = class AuthController {
    authService;
    prisma;
    constructor(authService, prisma) {
        this.authService = authService;
        this.prisma = prisma;
    }
    async login(body) {
        const { email, password } = body;
        if (!email || !password)
            throw new common_1.UnauthorizedException('Email and password required');
        const user = await this.prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() },
        });
        if (!user || !this.authService.verifyPassword(password, user.password)) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const token = this.authService.createToken(user.id, user.email);
        return { token, email: user.email };
    }
    async me(authHeader) {
        if (!authHeader?.startsWith('Bearer '))
            throw new common_1.UnauthorizedException('Missing token');
        const token = authHeader.substring(7);
        const session = this.authService.validateToken(token);
        if (!session)
            throw new common_1.UnauthorizedException('Invalid or expired token');
        return { email: session.email, userId: session.userId };
    }
    async sendCode(body) {
        const { email } = body;
        if (!email)
            throw new common_1.BadRequestException('Email is required');
        const existing = await this.prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() },
        });
        if (existing)
            throw new common_1.BadRequestException('Email is already registered');
        const code = this.authService.generateOtp();
        this.authService.storeOtp(email, code);
        await this.authService.sendOtpEmail(email, code);
        return { message: 'Verification code sent' };
    }
    async register(body) {
        const { username, email, password, code } = body;
        if (!username || !email || !password || !code) {
            throw new common_1.BadRequestException('All fields including the verification code are required');
        }
        const valid = this.authService.verifyOtp(email, code);
        if (!valid) {
            throw new common_1.UnauthorizedException('Invalid or expired verification code');
        }
        const existing = await this.prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() },
        });
        if (existing)
            throw new common_1.BadRequestException('Email is already registered');
        const hashed = this.authService.hashPassword(password);
        const user = await this.prisma.user.create({
            data: {
                username,
                email: email.toLowerCase().trim(),
                password: hashed,
            },
        });
        const token = this.authService.createToken(user.id, user.email);
        return { token, email: user.email };
    }
    async getGoogleClientId() {
        const clientId = this.authService.getGoogleClientId();
        return { clientId };
    }
    async googleLogin(body) {
        const { credential } = body;
        if (!credential)
            throw new common_1.BadRequestException('Credential token required');
        return this.authService.googleLogin(credential);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('login'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Get)('me'),
    __param(0, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "me", null);
__decorate([
    (0, common_1.Post)('send-code'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "sendCode", null);
__decorate([
    (0, common_1.Post)('register'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    (0, common_1.Get)('google/client-id'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getGoogleClientId", null);
__decorate([
    (0, common_1.Post)('google'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "googleLogin", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('api/auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        prisma_service_1.PrismaService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map