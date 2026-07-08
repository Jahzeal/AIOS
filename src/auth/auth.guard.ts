import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const url = request.url;

    // Public endpoints: auth login, registration, unsubscribe page, and the email webhook handler
    if (
      url.includes('/api/auth/login') ||
      url.includes('/api/auth/register') ||
      url.includes('/api/auth/send-code') ||
      url.includes('/api/email/unsubscribe') ||
      url.includes('/api/email/webhook')
    ) {
      return true;
    }

    const authHeader = request.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token');
    }

    const token = authHeader.substring(7);
    const session = this.authService.validateToken(token);
    if (!session) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    request.user = session;
    return true;
  }
}
