/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any */
import {
  Injectable,
  OnModuleInit,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import axios from 'axios';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  /** In-memory session store (token → session) */
  private tokens = new Map<
    string,
    { email: string; userId: string; expiresAt: number }
  >();

  /** In-memory OTP store (email → { code, expiresAt, purpose }) */
  private otpStore = new Map<string, { code: string; expiresAt: number }>();

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

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
    } catch (err: any) {
      this.logger.error(`Failed to check/seed default user: ${err.message}`);
    }
  }

  hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto
      .pbkdf2Sync(password, salt, 1000, 64, 'sha512')
      .toString('hex');
    return `${salt}:${hash}`;
  }

  verifyPassword(password: string, stored: string): boolean {
    try {
      const [salt, originalHash] = stored.split(':');
      if (!salt || !originalHash) return false;
      const hash = crypto
        .pbkdf2Sync(password, salt, 1000, 64, 'sha512')
        .toString('hex');
      return hash === originalHash;
    } catch {
      return false;
    }
  }

  createToken(userId: string, email: string): string {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    this.tokens.set(token, { email, userId, expiresAt });
    return token;
  }

  validateToken(token: string): { userId: string; email: string } | null {
    const session = this.tokens.get(token);
    if (!session) return null;
    if (Date.now() > session.expiresAt) {
      this.tokens.delete(token);
      return null;
    }
    return { userId: session.userId, email: session.email };
  }

  // ─── OTP helpers ───────────────────────────────────────────────

  generateOtp(): string {
    return String(Math.floor(100000 + Math.random() * 900000)); // 6-digit
  }

  storeOtp(email: string, code: string) {
    this.otpStore.set(email.toLowerCase().trim(), {
      code,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    });
  }

  verifyOtp(email: string, code: string): boolean {
    const entry = this.otpStore.get(email.toLowerCase().trim());
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.otpStore.delete(email.toLowerCase().trim());
      return false;
    }
    if (entry.code !== code.trim()) return false;
    this.otpStore.delete(email.toLowerCase().trim()); // one-time use
    return true;
  }

  // ─── Email delivery via Resend ─────────────────────────────────

  async sendOtpEmail(toEmail: string, code: string): Promise<void> {
    const resendApiKey = this.configService.get<string>('RESEND_API_KEY') || '';
    const senderEmail =
      this.configService.get<string>('SENDER_EMAIL') || 'onboarding@resend.dev';
    const isMock =
      !resendApiKey ||
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

    await axios.post(
      'https://api.resend.com/emails',
      {
        from: senderEmail,
        to: [toEmail],
        subject: `${code} is your LeadSphere AI verification code`,
        html,
      },
      {
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
      },
    );
  }

  getGoogleClientId(): string | null {
    return this.configService.get<string>('GOOGLE_CLIENT_ID') || null;
  }

  async googleLogin(credential: string) {
    const clientId = this.getGoogleClientId();
    if (!clientId) {
      throw new BadRequestException(
        'Google Client ID is not configured on the server',
      );
    }

    let payload: any;
    try {
      const response = await axios.get(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`,
      );
      payload = response.data;
    } catch (err: any) {
      throw new UnauthorizedException('Invalid Google token');
    }

    if (payload.aud !== clientId) {
      throw new UnauthorizedException('Token audience mismatch');
    }

    const email = payload.email?.toLowerCase().trim();
    if (!email) {
      throw new BadRequestException('Google token does not contain email');
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
}
