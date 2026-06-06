import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { User, UserRole } from "./user.entity";
import { UpdateMeDto } from "./dto/update-me.dto";
import { UserPushToken, type PushPlatform } from "./user-push-token.entity";
import { UpdatePushTokenDto } from "./dto/update-push-token.dto";

@Injectable()
export class UsersService {
  // Security policy (tweak later if you want)
  private readonly MAX_FAILED_LOGINS = 5;
  private readonly LOCK_MINUTES = 10;
  private readonly DEFAULT_NOTIFICATION_SETTINGS = {
    calendarReminders: false,
    emailUpdates: false,
    pushNotifications: true,
    importantUpdates: true,
    announcements: true,
    surpriseBagAlerts: true,
  };

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(UserPushToken)
    private readonly pushTokenRepository: Repository<UserPushToken>,
  ) {}

  findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  private normalizeOptional(value?: string | null, max = 255) {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed ? trimmed.slice(0, max) : null;
  }

  private normalizeBirthday(value?: string | null) {
    if (!value) return null;
    const trimmed = value.trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
  }

  private normalizePickupTimes(values?: string[] | null) {
    if (!Array.isArray(values)) return [];
    return values
      .map((value) => this.normalizeOptional(value, 40))
      .filter((value): value is string => Boolean(value))
      .slice(0, 8);
  }

  private normalizeNotifications(
    value?: Partial<User["notificationSettings"]> | null,
  ) {
    return {
      ...this.DEFAULT_NOTIFICATION_SETTINGS,
      ...(value ?? {}),
    };
  }

  toSafeUser(user: User) {
    const {
      passwordHash,
      failedLoginCount,
      lastFailedLoginAt,
      lockUntil,
      ...safe
    } = user as any;

    return {
      ...safe,
      country: this.normalizeOptional(user.country, 80),
      gender: this.normalizeOptional(user.gender, 40),
      dietaryPreferences: this.normalizeOptional(user.dietaryPreferences, 120),
      birthday: user.birthday ?? null,
      preferredPickupTimes: this.normalizePickupTimes(
        user.preferredPickupTimes,
      ),
      notificationSettings: this.normalizeNotifications(
        user.notificationSettings,
      ),
    };
  }

  async createUser(params: {
    username: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    phone?: string;
  }): Promise<User> {
    const user = this.usersRepository.create({
      ...params,
      failedLoginCount: 0,
      lastFailedLoginAt: null,
      lockUntil: null,
    });
    return this.usersRepository.save(user);
  }

  isLocked(user: User): boolean {
    return !!user.lockUntil && user.lockUntil.getTime() > Date.now();
  }

  async resetLoginFailures(userId: number): Promise<void> {
    await this.usersRepository.update(
      { id: userId },
      {
        failedLoginCount: 0,
        lastFailedLoginAt: null,
        lockUntil: null,
      },
    );
  }

  /**
   * Atomically increments failed count and sets lockUntil when threshold is reached.
   * Important: this avoids race conditions if multiple attempts hit at once.
   */
  async recordFailedLogin(userId: number): Promise<void> {
    // Step 1: increment counter + timestamp
    await this.usersRepository
      .createQueryBuilder()
      .update(User)
      .set({
        failedLoginCount: () => `"failedLoginCount" + 1`,
        lastFailedLoginAt: () => "NOW()",
      })
      .where("id = :id", { id: userId })
      .execute();

    // Step 2: lock if threshold reached
    await this.usersRepository
      .createQueryBuilder()
      .update(User)
      .set({
        lockUntil: () => `NOW() + INTERVAL '${this.LOCK_MINUTES} minutes'`,
      })
      .where("id = :id", { id: userId })
      .andWhere(`"failedLoginCount" >= :max`, { max: this.MAX_FAILED_LOGINS })
      .execute();
  }

  /**
   * Used by auth flow to upgrade hashes (bcrypt -> argon2) or
   * rehash when you tighten argon2 parameters later.
   */
  async updatePasswordHash(
    userId: number,
    passwordHash: string,
  ): Promise<void> {
    await this.usersRepository.update({ id: userId }, { passwordHash });
  }

  /**
   * Optional: safer update to avoid overwriting if user changed password in between.
   * Only updates if the stored hash still matches "oldHash".
   * Returns true if updated, false if not.
   */
  async setPasswordHashIfMatches(
    userId: number,
    oldHash: string,
    newHash: string,
  ): Promise<boolean> {
    const result = await this.usersRepository.update(
      { id: userId, passwordHash: oldHash },
      { passwordHash: newHash },
    );
    return (result.affected ?? 0) > 0;
  }

  async updateMe(userId: number, dto: UpdateMeDto) {
    const user = await this.findById(userId);
    if (!user) return null;

    if (dto.email !== undefined) {
      user.email = dto.email.trim().toLowerCase();
    }

    if (dto.phone !== undefined) {
      user.phone = this.normalizeOptional(dto.phone, 40) ?? undefined;
    }

    if (dto.country !== undefined) {
      user.country = this.normalizeOptional(dto.country, 80);
    }

    if (dto.gender !== undefined) {
      user.gender = this.normalizeOptional(dto.gender, 40);
    }

    if (dto.dietaryPreferences !== undefined) {
      user.dietaryPreferences = this.normalizeOptional(
        dto.dietaryPreferences,
        120,
      );
    }

    if (dto.birthday !== undefined) {
      user.birthday = this.normalizeBirthday(dto.birthday);
    }

    if (dto.preferredPickupTimes !== undefined) {
      user.preferredPickupTimes = this.normalizePickupTimes(
        dto.preferredPickupTimes,
      );
    }

    if (dto.notificationSettings !== undefined) {
      user.notificationSettings = this.normalizeNotifications(
        dto.notificationSettings,
      );
    }

    return this.usersRepository.save(user);
  }

  async registerPushToken(userId: number, dto: UpdatePushTokenDto) {
    const token = dto.token.trim();
    if (!token) return;

    const existing = await this.pushTokenRepository.findOne({
      where: { token },
    });

    if (existing) {
      existing.userId = userId;
      existing.platform = (dto.platform ??
        existing.platform ??
        "unknown") as PushPlatform;
      existing.disabledAt = null;
      existing.updatedAt = new Date();
      await this.pushTokenRepository.save(existing);
      return existing;
    }

    const next = this.pushTokenRepository.create({
      userId,
      token,
      platform: (dto.platform ?? "unknown") as PushPlatform,
      disabledAt: null,
      lastDeliveredAt: null,
    });

    return this.pushTokenRepository.save(next);
  }

  async unregisterPushToken(userId: number, token: string) {
    const trimmed = token.trim();
    if (!trimmed) return;

    const existing = await this.pushTokenRepository.findOne({
      where: { userId, token: trimmed },
    });
    if (!existing) return;

    existing.disabledAt = new Date();
    await this.pushTokenRepository.save(existing);
  }

  async sendPushToUsers(
    userIds: number[],
    message: {
      title: string;
      body: string;
      data?: Record<string, unknown>;
    },
  ) {
    const uniqueUserIds = Array.from(
      new Set(userIds.filter((id) => Number.isFinite(id))),
    );
    if (!uniqueUserIds.length) return;

    const recipients = await this.usersRepository.find({
      where: uniqueUserIds.map((id) => ({ id })),
    });
    const allowedUsers = new Set(
      recipients
        .filter(
          (user) =>
            this.normalizeNotifications(user.notificationSettings)
              .pushNotifications,
        )
        .map((user) => Number(user.id)),
    );
    if (!allowedUsers.size) return;

    const tokens = await this.pushTokenRepository.find({
      where: uniqueUserIds.map((userId) => ({
        userId,
        disabledAt: IsNull(),
      })),
    });

    const messages = tokens
      .filter((token) => allowedUsers.has(Number(token.userId)))
      .map((token) => ({
        to: token.token,
        sound: "default",
        title: message.title,
        body: message.body,
        data: message.data ?? {},
      }));

    if (!messages.length) return;

    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    }).catch(() => null);

    if (!res?.ok) return;

    const deliveredTokens = messages.map((entry) => entry.to);
    await this.pushTokenRepository
      .createQueryBuilder()
      .update(UserPushToken)
      .set({ lastDeliveredAt: new Date() })
      .where("token IN (:...tokens)", { tokens: deliveredTokens })
      .execute()
      .catch(() => {});
  }
}
