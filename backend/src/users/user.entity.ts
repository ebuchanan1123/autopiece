import {
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Listing } from '../listings/listing.entity';


export type UserRole = 'client' | 'seller' | 'admin';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column({ type: 'varchar', default: 'client' })
  role: UserRole;

  @Column({ nullable: true })
  phone?: string;

  // Brute-force protection
  @Column({ type: 'int', default: 0 })
  failedLoginCount: number;

  @Column({ type: 'timestamptz', nullable: true })
  lastFailedLoginAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  lockUntil: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => Listing, (listing) => listing.seller)
  listings: Listing[];
}
