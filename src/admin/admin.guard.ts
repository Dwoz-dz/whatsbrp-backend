import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class AdminKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();

    // مهم: Express يحوّل headers إلى lower-case
    const received = (req.headers['x-admin-key'] as string | undefined) ?? '';

    const expected = process.env.ADMIN_KEY ?? '';

    if (!expected) {
      // إذا ماكانش ADMIN_KEY راه مشكله config
      throw new UnauthorizedException('ADMIN_KEY is missing in environment');
    }

    if (!received || received.trim() !== expected.trim()) {
      throw new UnauthorizedException('Invalid admin key');
    }

    return true;
  }
}
