import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { Listing } from '../listings/listing.entity';

export type OrderItemStatus =
  | 'reserved'
  | 'paid'
  | 'picked_up'
  | 'cancelled'
  | 'expired';

@Entity()
@Index(['orderId'])
@Index(['listingId'])
@Index(['sellerId', 'createdAt'])
@Index(['saleNumber'], { unique: true })
export class OrderItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  orderId: number;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column({ type: 'int' })
  listingId: number;

  @ManyToOne(() => Listing, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'listingId' })
  listing: Listing;

  @Column({ type: 'int' })
  sellerId: number;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'int' })
  unitPriceDzd: number;

  @Column({ type: 'varchar', length: 32 })
  saleNumber: string;

  @Column({ type: 'varchar', length: 16, default: 'reserved' })
  status: OrderItemStatus;

  @Column({ type: 'timestamptz', nullable: true })
  reservedUntil: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
