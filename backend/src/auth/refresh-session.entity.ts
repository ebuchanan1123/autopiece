import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity()
@Index(['userId', 'revokedAt'])
export class RefreshSession {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid', unique: true })
  tokenId: string;

  @Column()
  userId: number;

  @Column()
  secretHash: string;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  revokedAt: Date | null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  replacedByTokenId: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  userAgentHash: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ipHash: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt: Date | null;

  @UpdateDateColumn()
  updatedAt: Date;
}
