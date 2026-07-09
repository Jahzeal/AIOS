"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const config_1 = require("@nestjs/config");
const crypto = __importStar(require("crypto"));
const axios_1 = __importDefault(require("axios"));
let AuthService = AuthService_1 = class AuthService {
    prisma;
    configService;
    logger = new common_1.Logger(AuthService_1.name);
    tokens = new Map();
    otpStore = new Map();
    constructor(prisma, configService) {
        this.prisma = prisma;
        this.configService = configService;
    }
    async onModuleInit() {
        try {
            const userCount = await this.prisma.user.count();
            if (userCount === 0) {
                const hashedPassword = this.hashPassword('admin123');
                await this.prisma.user.create({
                    data: {
                        email: 'admin@aios.com',
                        password: hashedPassword,
                    },
                });
                this.logger.log('Default admin user seeded: admin@aios.com / admin123');
            }
        }
        catch (err) {
            this.logger.error(`Failed to check/seed default user: ${err.message}`);
        }
    }
    hashPassword(password) {
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto
            .pbkdf2Sync(password, salt, 1000, 64, 'sha512')
            .toString('hex');
        return `${salt}:${hash}`;
    }
    verifyPassword(password, stored) {
        try {
            const [salt, originalHash] = stored.split(':');
            if (!salt || !originalHash)
                return false;
            const hash = crypto
                .pbkdf2Sync(password, salt, 1000, 64, 'sha512')
                .toString('hex');
            return hash === originalHash;
        }
        catch {
            return false;
        }
    }
    createToken(userId, email) {
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
        this.tokens.set(token, { email, userId, expiresAt });
        return token;
    }
    validateToken(token) {
        const session = this.tokens.get(token);
        if (!session)
            return null;
        if (Date.now() > session.expiresAt) {
            this.tokens.delete(token);
            return null;
        }
        return { userId: session.userId, email: session.email };
    }
    generateOtp() {
        return String(Math.floor(100000 + Math.random() * 900000));
    }
    storeOtp(email, code) {
        this.otpStore.set(email.toLowerCase().trim(), {
            code,
            expiresAt: Date.now() + 10 * 60 * 1000,
        });
    }
    verifyOtp(email, code) {
        const entry = this.otpStore.get(email.toLowerCase().trim());
        if (!entry)
            return false;
        if (Date.now() > entry.expiresAt) {
            this.otpStore.delete(email.toLowerCase().trim());
            return false;
        }
        if (entry.code !== code.trim())
            return false;
        this.otpStore.delete(email.toLowerCase().trim());
        return true;
    }
    async sendOtpEmail(toEmail, code) {
        const resendApiKey = this.configService.get('RESEND_API_KEY') || '';
        const senderEmail = this.configService.get('SENDER_EMAIL') || 'onboarding@resend.dev';
        const isMock = !resendApiKey ||
            resendApiKey.startsWith('YOUR_') ||
            resendApiKey.trim() === '';
        const html = `
      <div style="font-family:'Segoe UI',system-ui,sans-serif;max-width:480px;margin:0 auto;background:#0d0f1f;border-radius:16px;overflow:hidden;border:1px solid rgba(99,102,241,0.3)">
        <div style="background:linear-gradient(135deg,#6366f1,#7c3aed);padding:2rem;text-align:center">
          <h1 style="margin:0;color:#fff;font-size:1.5rem;letter-spacing:-0.5px">🎯 LeadSphere AI</h1>
          <p style="margin:0.5rem 0 0;color:rgba(255,255,255,0.75);font-size:0.9rem">Email Verification</p>
        </div>
        <div style="padding:2rem;color:#f8fafc">
          <p style="margin:0 0 1rem;font-size:1rem;color:rgba(248,250,252,0.8)">
            Here is your one-time verification code. It expires in <strong>10 minutes</strong>.
          </p>
          <div style="background:rgba(99,102,241,0.1);border:2px solid rgba(99,102,241,0.4);border-radius:12px;padding:1.5rem;text-align:center;margin:1.5rem 0">
            <span style="font-size:2.5rem;font-weight:800;letter-spacing:0.5rem;color:#818cf8">${code}</span>
          </div>
          <p style="font-size:0.8rem;color:rgba(248,250,252,0.4);margin:0">
            If you didn't request this, you can safely ignore this email.
          </p>
        </div>
      </div>
    `;
        if (isMock) {
            this.logger.log(`[MOCK OTP EMAIL] To: ${toEmail} | Code: ${code}`);
            return;
        }
        await axios_1.default.post('https://api.resend.com/emails', {
            from: senderEmail,
            to: [toEmail],
            subject: `${code} is your LeadSphere AI verification code`,
            html,
        }, {
            headers: {
                Authorization: `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json',
            },
        });
    }
    getGoogleClientId() {
        return this.configService.get('GOOGLE_CLIENT_ID') || null;
    }
    async googleLogin(credential) {
        const clientId = this.getGoogleClientId();
        if (!clientId) {
            throw new common_1.BadRequestException('Google Client ID is not configured on the server');
        }
        let payload;
        try {
            const response = await axios_1.default.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
            payload = response.data;
        }
        catch (err) {
            throw new common_1.UnauthorizedException('Invalid Google token');
        }
        if (payload.aud !== clientId) {
            throw new common_1.UnauthorizedException('Token audience mismatch');
        }
        const email = payload.email?.toLowerCase().trim();
        if (!email) {
            throw new common_1.BadRequestException('Google token does not contain email');
        }
        let user = await this.prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            const username = payload.name || email.split('@')[0];
            const secureRandomPassword = crypto.randomBytes(32).toString('hex');
            const hashed = this.hashPassword(secureRandomPassword);
            user = await this.prisma.user.create({
                data: {
                    email,
                    username,
                    password: hashed,
                },
            });
        }
        const token = this.createToken(user.id, user.email);
        return { token, email: user.email };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map