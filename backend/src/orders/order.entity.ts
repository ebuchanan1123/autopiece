import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type PaymentMethod = 'online';
export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'in_progress'
  | 'delivered'
  | 'revision_requested'
  | 'completed'
  | 'cancelled'
  | 'refunded';

@Entity()
@Index(['buyerId', 'createdAt'])
@Index(['freelancerId', 'createdAt'])
@Index(['serviceId'])
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  buyerId: number;

  // Single-service order fields
  @Column({ type: 'int' })
  serviceId: number;

  @Column({ type: 'int' })
  freelancerId: number;

  @Column({ type: 'int' })
  unitPriceDzd: number;

  @Column({ type: 'varchar', length: 140 })
  titleSnapshot: string;

  @Column({ type: 'varchar', length: 10, default: 'online' })
  paymentMethod: PaymentMethod;

  @Column({ type: 'varchar', length: 32, default: 'pending_payment' })
  status: OrderStatus;

  @Column({ type: 'int' })
  totalDzd: number;

  // Buyer brief / requirements
  @Column({ type: 'jsonb', nullable: true })
  requirements: any | null;

  @Column({ type: 'timestamptz', nullable: true })
  requirementsSubmittedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  dueAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
