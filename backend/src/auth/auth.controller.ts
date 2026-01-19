import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response, Request } from 'express';

import { AuthService } from './auth.service';
import { RegisterClientDto } from './dto/register-client.dto';
import { RegisterSellerDto } from './dto/register-seller.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

type SameSite = 'lax' | 'strict' | 'none';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private parseTtlToMs(ttl: string, fallbackMs: number) {
    const m = ttl.match(/^(\d+)([smhd])$/);
    if (!m) return fallbackMs;

    const value = Number(m[1]);
    const unit = m[2];

    if (unit === 's') return value * 1000;
    if (unit === 'm') return value * 60_000;
    if (unit === 'h') return value * 60 * 60_000;
    if (unit === 'd') return value * 24 * 60 * 60_000;

    return fallbackMs;
  }

  private getCookieOptions() {
    const secure = (process.env.COOKIE_SECURE ?? 'false') === 'true';
    const domain = process.env.COOKIE_DOMAIN?.trim() || undefined;

    const sameSiteRaw = (process.env.COOKIE_SAMESITE ?? 'lax').toLowerCase();
    const sameSite: SameSite =
      sameSiteRaw === 'strict'
        ? 'strict'
        : sameSiteRaw === 'none'
          ? 'none'
          : 'lax';

    // SameSite=None requires Secure=true
    if (sameSite === 'none' && !secure) {
      return { secure, domain, sameSite: 'lax' as SameSite };
    }

    return { secure, domain, sameSite };
  }

  private getRefreshCookieMaxAgeMs(): number {
    const ttl = process.env.JWT_REFRESH_EXPIRES_IN ?? '30d';
    return this.parseTtlToMs(ttl, 30 * 24 * 60 * 60_000);
  }

  private setRefreshCookie(res: Response, refreshCookieValue: string) {
    const { secure, domain, sameSite } = this.getCookieOptions();

    res.cookie('refresh_token', refreshCookieValue, {
      httpOnly: true,
      secure,
      sameSite,
      path: '/auth',
      domain,
      maxAge: this.getRefreshCookieMaxAgeMs(),
    });
  }

  private clearRefreshCookie(res: Response) {
    const { domain } = this.getCookieOptions();
    res.clearCookie('refresh_token', { path: '/auth', domain });
  }

  private getRefreshCookie(req: Request): string | undefined {
    return (req as any).cookies?.refresh_token;
  }

  private getRequestMeta(req: Request): { ip?: string; userAgent?: string } {
    const userAgent = req.headers['user-agent'];
    const ua = Array.isArray(userAgent) ? userAgent.join(' ') : userAgent;

    const ipHeader = req.headers['x-forwarded-for'];
    const forwarded = Array.isArray(ipHeader) ? ipHeader[0] : ipHeader;

    // If you're behind a proxy, first IP in x-forwarded-for is the client.
    const ipFromForwarded = forwarded?.split(',')[0]?.trim();

    const ip = ipFromForwarded || req.ip;

    return {
      ip,
      userAgent: ua,
    };
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register-client')
  async registerClient(
    @Req() req: Request,
    @Body() dto: RegisterClientDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const meta = this.getRequestMeta(req);

    const { user, accessToken, refreshCookieValue } =
      await this.authService.registerClient(dto, meta);

    this.setRefreshCookie(res, refreshCookieValue);
    return { user, accessToken };
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register-seller')
  async registerSeller(
    @Req() req: Request,
    @Body() dto: RegisterSellerDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const meta = this.getRequestMeta(req);

    const { user, accessToken, refreshCookieValue } =
      await this.authService.registerSeller(dto, meta);

    this.setRefreshCookie(res, refreshCookieValue);
    return { user, accessToken };
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  async login(
    @Req() req: Request,
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const meta = this.getRequestMeta(req);

    const { user, accessToken, refreshCookieValue } =
      await this.authService.login(dto, meta);

    this.setRefreshCookie(res, refreshCookieValue);
    return { user, accessToken };
  }

  // Light throttle for refresh abuse
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookieValue = this.getRefreshCookie(req);
    if (!cookieValue) {
      throw new UnauthorizedException('Missing refresh token');
    }

    const meta = this.getRequestMeta(req);

    const { accessToken, refreshCookieValue } =
      await this.authService.rotateRefreshSession(cookieValue, meta);

    this.setRefreshCookie(res, refreshCookieValue);
    return { accessToken };
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const cookieValue = this.getRefreshCookie(req);

    this.clearRefreshCookie(res);

    if (cookieValue) {
      await this.authService.logout(cookieValue);
    }

    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  async logoutAll(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    await this.authService.logoutAll(req.user.sub);
    this.clearRefreshCookie(res);
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: any) {
    return { user: req.user };
  }
}
