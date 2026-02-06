import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { randomBytes, randomUUID, createHmac } from 'crypto';
import * as argon2 from 'argon2';
import { JwtSignOptions } from '@nestjs/jwt';


import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';
import { RegisterClientDto } from './dto/register-client.dto';
import { RegisterSellerDto } from './dto/register-seller.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshSession } from './refresh-session.entity';

type SessionMeta = {
  ip?: string;
  userAgent?: string;
};

@Injectable()
export class AuthService {
  // Only used for refresh-session secret hashing (NOT user passwords)
  private readonly REFRESH_SECRET_HASH_ROUNDS = 10;

  // Argon2id policy for user passwords (tweak later if needed)
  private readonly ARGON2_OPTIONS: argon2.Options = {
    type: argon2.argon2id,
    timeCost: 3,
    memoryCost: 64 * 1024, // 64 MB
    parallelism: 1,
  };

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @InjectRepository(RefreshSession)
    private readonly refreshRepo: Repository<RefreshSession>,
  ) {}

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  /**
   * What this does:
   *  - Removes secrets + internal security state from API responses.
   * Why it matters:
   *  - Prevents leaking brute-force/lockout state and password hash.
   */
  private toSafeUser(user: User) {
    const {
      passwordHash,
      failedLoginCount,
      lastFailedLoginAt,
      lockUntil,
      ...safe
    } = user as any;

    return safe;
  }

    private signAccessToken(user: User) {
    const expiresIn =
      (this.config.get<string>('JWT_EXPIRES_IN') as JwtSignOptions['expiresIn']) ??
      '15m';

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      jti: randomUUID(),
    };

    return this.jwtService.sign(payload, { expiresIn });
  }


  private fingerprintHash(value: string): string {
    const secret = this.config.get<string>('SESSION_FINGERPRINT_SECRET');
    if (!secret || secret.length < 32) {
      throw new Error('SESSION_FINGERPRINT_SECRET must be at least 32 characters');
    }
    return createHmac('sha256', secret).update(value).digest('hex');
  }

  private normalizeUserAgent(ua: string | undefined): string {
    return (ua ?? '').trim().slice(0, 512);
  }

  private normalizeIp(ip: string | undefined): string {
    return (ip ?? '').trim();
  }

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

  private buildRefreshCookieValue(tokenId: string, secret: string) {
    // cookie format: rt_<tokenId>.<secret>
    return `rt_${tokenId}.${secret}`;
  }

  private parseRefreshCookieValue(value: string) {
    if (!value || !value.startsWith('rt_')) return null;
    const rest = value.slice(3);
    const dot = rest.indexOf('.');
    if (dot <= 0) return null;

    const tokenId = rest.slice(0, dot);
    const secret = rest.slice(dot + 1);

    if (!tokenId || !secret) return null;
    return { tokenId, secret };
  }

  private async createRefreshSession(user: User, meta?: SessionMeta) {
    const tokenId = randomUUID();
    const secret = randomBytes(32).toString('base64url');

    // Refresh-session secret hashing (bcrypt is fine here)
    const secretHash = await bcrypt.hash(secret, this.REFRESH_SECRET_HASH_ROUNDS);

    const ttl = this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '30d';
    const ms = this.parseTtlToMs(ttl, 30 * 24 * 60 * 60_000);
    const expiresAt = new Date(Date.now() + ms);

    const ip = this.normalizeIp(meta?.ip);
    const ua = this.normalizeUserAgent(meta?.userAgent);

    const session = this.refreshRepo.create({
      tokenId,
      userId: user.id,
      secretHash,
      expiresAt,
      revokedAt: null,
      replacedByTokenId: null,
      ipHash: ip ? this.fingerprintHash(ip) : null,
      userAgentHash: ua ? this.fingerprintHash(ua) : null,
      lastUsedAt: new Date(),
    });

    await this.refreshRepo.save(session);

    return {
      refreshCookieValue: this.buildRefreshCookieValue(tokenId, secret),
    };
  }

  // --- Password hash helpers (bcrypt compat + argon2 upgrade) ---

  private isBcryptHash(hash: string): boolean {
    // bcrypt hashes typically start with $2a$, $2b$, or $2y$
    return typeof hash === 'string' && /^\$2[aby]\$/.test(hash);
  }

  private isArgon2Hash(hash: string): boolean {
    // argon2 hashes start with $argon2id$ / $argon2i$ / $argon2d$
    return typeof hash === 'string' && /^\$argon2(id|i|d)\$/.test(hash);
  }

  private async hashPasswordArgon2(password: string): Promise<string> {
    return argon2.hash(password, this.ARGON2_OPTIONS);
  }

  private async verifyAndMaybeUpgradePassword(
    user: User,
    plainPassword: string,
  ): Promise<boolean> {
    const stored = user.passwordHash;

    // 1) bcrypt legacy
    if (this.isBcryptHash(stored)) {
      const ok = await bcrypt.compare(plainPassword, stored);
      if (!ok) return false;

      // Upgrade bcrypt -> argon2id immediately after success
      const upgraded = await this.hashPasswordArgon2(plainPassword);
      await this.usersService.updatePasswordHash(user.id, upgraded);
      user.passwordHash = upgraded;
      return true;
    }

    // 2) argon2 current
    if (this.isArgon2Hash(stored)) {
      const ok = await argon2.verify(stored, plainPassword);
      if (!ok) return false;

      const needsRehash = argon2.needsRehash(stored, this.ARGON2_OPTIONS);
      if (needsRehash) {
        const upgraded = await this.hashPasswordArgon2(plainPassword);
        await this.usersService.updatePasswordHash(user.id, upgraded);
        user.passwordHash = upgraded;
      }
      return true;
    }

    // Unknown format -> treat as invalid (safer)
    return false;
  }

  // --- Public endpoints ---

  async registerClient(dto: RegisterClientDto, meta?: SessionMeta) {
    const email = this.normalizeEmail(dto.email);

    const existing = await this.usersService.findByEmail(email);
    if (existing) throw new BadRequestException('Email is already in use');

    const passwordHash = await this.hashPasswordArgon2(dto.password);

    const user = await this.usersService.createUser({
      email,
      passwordHash,
      role: 'client',
      phone: dto.phone,
    });

    const accessToken = this.signAccessToken(user);
    const { refreshCookieValue } = await this.createRefreshSession(user, meta);

    return { user: this.toSafeUser(user), accessToken, refreshCookieValue };
  }

  async registerSeller(dto: RegisterSellerDto, meta?: SessionMeta) {
    const email = this.normalizeEmail(dto.email);

    const existing = await this.usersService.findByEmail(email);
    if (existing) throw new BadRequestException('Email is already in use');

    const passwordHash = await this.hashPasswordArgon2(dto.password);

    const user = await this.usersService.createUser({
      email,
      passwordHash,
      role: 'seller',
      phone: dto.phone,
    });

    const accessToken = this.signAccessToken(user);
    const { refreshCookieValue } = await this.createRefreshSession(user, meta);

    return { user: this.toSafeUser(user), accessToken, refreshCookieValue };
  }

  async login(dto: LoginDto, meta?: SessionMeta) {
    const email = this.normalizeEmail(dto.email);

    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid email or password');

    if (this.usersService.isLocked(user)) {
      throw new UnauthorizedException('Too many attempts. Try again later.');
    }

    const ok = await this.verifyAndMaybeUpgradePassword(user, dto.password);
    if (!ok) {
      await this.usersService.recordFailedLogin(user.id);
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.usersService.resetLoginFailures(user.id);

    const accessToken = this.signAccessToken(user);
    const { refreshCookieValue } = await this.createRefreshSession(user, meta);

    return { user: this.toSafeUser(user), accessToken, refreshCookieValue };
  }

  async rotateRefreshSession(refreshCookieValue: string, meta?: SessionMeta) {
    const parsed = this.parseRefreshCookieValue(refreshCookieValue);
    if (!parsed) throw new UnauthorizedException('Invalid refresh token');

    const { tokenId, secret } = parsed;

    const session = await this.refreshRepo.findOne({ where: { tokenId } });
    if (!session) throw new UnauthorizedException('Invalid refresh token');

    if (session.revokedAt) {
      if (session.replacedByTokenId) {
        await this.refreshRepo.update(
          { userId: session.userId, revokedAt: IsNull() },
          { revokedAt: new Date() },
        );
        throw new UnauthorizedException('Refresh token reuse detected');
      }
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (session.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const ok = await bcrypt.compare(secret, session.secretHash);
    if (!ok) throw new UnauthorizedException('Invalid refresh token');

    // Optional strict fingerprint enforcement
    const strict =
      (this.config.get<string>('SESSION_FINGERPRINT_STRICT') ?? 'false') === 'true';

    if (strict) {
      const ip = this.normalizeIp(meta?.ip);
      const ua = this.normalizeUserAgent(meta?.userAgent);

      const ipHash = ip ? this.fingerprintHash(ip) : null;
      const uaHash = ua ? this.fingerprintHash(ua) : null;

      const ipMismatch =
        session.ipHash && ipHash && session.ipHash !== ipHash;
      const uaMismatch =
        session.userAgentHash && uaHash && session.userAgentHash !== uaHash;

      if (ipMismatch || uaMismatch) {
        await this.refreshRepo.update(
          { userId: session.userId, revokedAt: IsNull() },
          { revokedAt: new Date() },
        );
        throw new UnauthorizedException('Refresh token reuse detected');
      }
    }

    const user = await this.usersService.findById(session.userId);
    if (!user) throw new UnauthorizedException('User not found');

    // Create new session (rotation)
    const { refreshCookieValue: newRefreshCookieValue } =
      await this.createRefreshSession(user, meta);
    const newParsed = this.parseRefreshCookieValue(newRefreshCookieValue)!;

    // Revoke old session and link to the new one
    session.revokedAt = new Date();
    session.replacedByTokenId = newParsed.tokenId;
    session.lastUsedAt = new Date();
    await this.refreshRepo.save(session);

    const accessToken = this.signAccessToken(user);
    return { accessToken, refreshCookieValue: newRefreshCookieValue };
  }

  async logout(refreshCookieValue: string) {
    const parsed = this.parseRefreshCookieValue(refreshCookieValue);
    if (!parsed) return { ok: true };

    const session = await this.refreshRepo.findOne({
      where: { tokenId: parsed.tokenId },
    });

    if (session && !session.revokedAt) {
      session.revokedAt = new Date();
      session.lastUsedAt = new Date();
      await this.refreshRepo.save(session);
    }

    return { ok: true };
  }

  async logoutAll(userId: number) {
    await this.refreshRepo.update(
      { userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
    return { ok: true };
  }

  // Optional: session management endpoints (useful for production)
  async listSessions(userId: number) {
    const sessions = await this.refreshRepo.find({
      where: { userId, revokedAt: IsNull() },
      order: { lastUsedAt: 'DESC' as any, createdAt: 'DESC' as any },
    });

    return sessions.map((s) => ({
      tokenId: s.tokenId,
      createdAt: s.createdAt,
      lastUsedAt: s.lastUsedAt,
      expiresAt: s.expiresAt,
    }));
  }

  async revokeSession(userId: number, tokenId: string) {
    const session = await this.refreshRepo.findOne({ where: { userId, tokenId } });
    if (!session || session.revokedAt) return { ok: true };

    session.revokedAt = new Date();
    session.lastUsedAt = new Date();
    await this.refreshRepo.save(session);

    return { ok: true };
  }
}
