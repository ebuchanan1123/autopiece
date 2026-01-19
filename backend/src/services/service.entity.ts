import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

export type ServiceCondition = 'new' | 'used';
export type ServiceStatus = 'active' | 'sold' | 'hidden' | 'draft' | 'removed';

@Entity()
@Index(['status', 'createdAt'])
@Index(['wilaya', 'city'])
@Index(['freelancerId', 'status'])
export class Service {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  freelancerId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'freelancerId' })
  freelancer: User;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'int' })
  priceDzd: number;

  @Column({ type: 'varchar', length: 80 })
  category: string;

  @Column({ type: 'varchar', length: 80 })
  make: string;

  @Column({ type: 'varchar', length: 80 })
  model: string;

  @Column({ type: 'int', nullable: true })
  year: number | null;

  @Column({ type: 'varchar', length: 80 })
  wilaya: string;

  @Column({ type: 'varchar', length: 80 })
  city: string;

  @Column({ type: 'varchar', length: 10, default: 'used' })
  condition: ServiceCondition;

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status: ServiceStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
