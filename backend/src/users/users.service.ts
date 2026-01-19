import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './user.entity';

@Injectable()
export class UsersService {
  // Security policy (tweak later if you want)
  private readonly MAX_FAILED_LOGINS = 5;
  private readonly LOCK_MINUTES = 10;

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
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

  async createUser(params: {
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
        lastFailedLoginAt: () => 'NOW()',
      })
      .where('id = :id', { id: userId })
      .execute();

    // Step 2: lock if threshold reached
    await this.usersRepository
      .createQueryBuilder()
      .update(User)
      .set({
        lockUntil: () => `NOW() + INTERVAL '${this.LOCK_MINUTES} minutes'`,
      })
      .where('id = :id', { id: userId })
      .andWhere(`"failedLoginCount" >= :max`, { max: this.MAX_FAILED_LOGINS })
      .execute();
  }

  /**
   * Used by auth flow to upgrade hashes (bcrypt -> argon2) or
   * rehash when you tighten argon2 parameters later.
   */
  async updatePasswordHash(userId: number, passwordHash: string): Promise<void> {
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
}
