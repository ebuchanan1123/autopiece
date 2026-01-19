import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type PaymentProvider = 'satim';
export type PaymentStatus = 'initiated' | 'success' | 'failed';

@Entity()
@Index(['orderId'])
export class Payment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  orderId: number;

  @Column({ type: 'varchar', length: 24 })
  provider: PaymentProvider;

  @Column({ type: 'varchar', length: 16 })
  status: PaymentStatus;

  @Column({ type: 'int' })
  amountDzd: number;

  @Column({ type: 'varchar', length: 120, nullable: true })
  providerPaymentId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  rawPayload: any | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
