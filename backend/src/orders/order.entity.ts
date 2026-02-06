import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type PaymentMethod = 'online' | 'in_store';
export type OrderStatus = 'reserved' | 'paid' | 'cancelled';

@Entity()
@Index(['customerId', 'createdAt'])
@Index(['orderNumber'], { unique: true })
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  customerId: number;

  // human-friendly order number
  @Column({ type: 'varchar', length: 32 })
  orderNumber: string;

  @Column({ type: 'varchar', length: 10, default: 'in_store' })
  paymentMethod: PaymentMethod;

  @Column({ type: 'varchar', length: 16, default: 'reserved' })
  status: OrderStatus;

  @Column({ type: 'int', default: 0 })
  totalDzd: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
