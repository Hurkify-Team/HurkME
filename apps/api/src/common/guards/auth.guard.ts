import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { verifyToken } from '@clerk/backend';
import { IS_PUBLIC_KEY } from '@/common/decorators/public.decorator';
import { UsersService } from '@/users/users.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const bypass = process.env.AUTH_BYPASS === 'true';

    let authProviderId: string | undefined;
    let email: string | undefined;
    let displayName: string | undefined;

    if (bypass) {
      authProviderId = request.headers['x-dev-auth-provider-id'] as string;
      email = request.headers['x-dev-email'] as string;
      displayName = request.headers['x-dev-display-name'] as string;

      if (!authProviderId) {
        authProviderId = 'demo_creator_1';
      }
      if (!email) {
        email = `${authProviderId}@demo.hurkme.local`;
      }
      if (!displayName) {
        displayName = authProviderId.replaceAll('_', ' ');
      }
    } else {
      const authHeader = request.headers.authorization as string | undefined;
      const token = authHeader?.startsWith('Bearer ')
        ? authHeader.slice(7)
        : undefined;

      if (!token || !process.env.CLERK_SECRET_KEY) {
        throw new UnauthorizedException('Missing session token');
      }

      try {
        const payload = (await verifyToken(token, {
          secretKey: process.env.CLERK_SECRET_KEY,
        })) as Record<string, unknown>;

        authProviderId =
          typeof payload.sub === 'string' && payload.sub.length ? payload.sub : undefined;
        const emailClaim =
          typeof payload.email === 'string'
            ? payload.email
            : typeof payload.email_address === 'string'
              ? payload.email_address
              : undefined;
        email = emailClaim;
        displayName =
          typeof payload.name === 'string'
            ? payload.name
            : typeof payload.username === 'string'
              ? payload.username
              : 'Creator';
      } catch {
        throw new UnauthorizedException('Invalid session token');
      }
    }

    if (!authProviderId || !email) {
      throw new UnauthorizedException('Unable to resolve authenticated user');
    }

    const user = await this.usersService.getOrCreateFromAuth({
      authProviderId,
      email,
      displayName: displayName ?? 'Creator',
    });

    request.user = {
      id: user.id,
      authProviderId: user.authProviderId,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    };

    return true;
  }
}
