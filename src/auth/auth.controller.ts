/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any */
import {
  Controller,
  Post,
  Get,
  Body,
  UnauthorizedException,
  BadRequestException,
  Headers,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  // ─── Login ───────────────────────────────────────────────────────
  @Post('login')
  async login(@Body() body: any) {
    const { email, password } = body;
    if (!email || !password)
      throw new UnauthorizedException('Email and password required');

    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user || !this.authService.verifyPassword(password, user.password)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.authService.createToken(user.id, user.email);
    return { token, email: user.email };
  }

  // ─── Me ──────────────────────────────────────────────────────────
  @Get('me')
  async me(@Headers('authorization') authHeader: string) {
    if (!authHeader?.startsWith('Bearer '))
      throw new UnauthorizedException('Missing token');
    const token = authHeader.substring(7);
    const session = this.authService.validateToken(token);
    if (!session) throw new UnauthorizedException('Invalid or expired token');
    return { email: session.email, userId: session.userId };
  }

  // ─── Step 1: Send verification OTP ───────────────────────────────
  @Post('send-code')
  async sendCode(@Body() body: any) {
    const { email } = body;
    if (!email) throw new BadRequestException('Email is required');

    // Check if email already registered
    const existing = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (existing) throw new BadRequestException('Email is already registered');

    const code = this.authService.generateOtp();
    this.authService.storeOtp(email, code);
    await this.authService.sendOtpEmail(email, code);

    return { message: 'Verification code sent' };
  }

  // ─── Step 2: Verify OTP + complete registration ───────────────────
  @Post('register')
  async register(@Body() body: any) {
    const { username, email, password, code } = body;

    if (!username || !email || !password || !code) {
      throw new BadRequestException(
        'All fields including the verification code are required',
      );
    }

    const valid = this.authService.verifyOtp(email, code);
    if (!valid) {
      throw new UnauthorizedException('Invalid or expired verification code');
    }

    // Check duplicate (race condition guard)
    const existing = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (existing) throw new BadRequestException('Email is already registered');

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

  // ─── Google Sign-In ────────────────────────────────────────────────
  @Get('google/client-id')
  async getGoogleClientId() {
    const clientId = this.authService.getGoogleClientId();
    return { clientId };
  }

  @Post('google')
  async googleLogin(@Body() body: any) {
    const { credential } = body;
    if (!credential) throw new BadRequestException('Credential token required');
    return this.authService.googleLogin(credential);
  }
}
