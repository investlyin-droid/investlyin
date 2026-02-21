import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Restricts admin panel access to specific email(s) when ADMIN_ALLOWED_EMAILS
 * (or ADMIN_EMAIL) is set. Only those users can call admin routes.
 * If neither is set, any user with admin role can access (current behavior).
 */
@Injectable()
export class AdminAllowlistGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user || !user.email) return false;

    const allowed =
      this.configService.get<string>('ADMIN_ALLOWED_EMAILS')?.trim() ||
      this.configService.get<string>('ADMIN_EMAIL')?.trim();
    if (!allowed) return true; // no allowlist = any admin role can access

    const allowedList = allowed.split(',').map((e) => e.trim().toLowerCase());
    const emailLower = (user.email as string).toLowerCase();
    if (allowedList.includes(emailLower)) return true;

    throw new ForbiddenException(
      'Admin access is restricted to authorized email(s) only.',
    );
  }
}
