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

// add types near the top
export type ListingStatus = 'active' | 'sold_out' | 'hidden' | 'draft' | 'removed';

@Entity()
@Index(['status', 'createdAt'])
@Index(['wilaya', 'city'])
@Index(['sellerId', 'status'])
@Index(['lat', 'lng'])
export class Listing {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  sellerId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sellerId' })
  seller: User;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  // what customer pays
  @Column({ type: 'int' })
  priceDzd: number;

  // used for “best value”
  @Column({ type: 'int', default: 0 })
  originalValueDzd: number;

  @Column({ type: 'int', default: 1 })
  quantityAvailable: number;

  // pickup window
  @Column({ type: 'timestamptz', nullable: true })
  pickupStartAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  pickupEndAt: Date | null;

  // map pins
  @Column({ type: 'double precision', nullable: true })
  lat: number | null;

  @Column({ type: 'double precision', nullable: true })
  lng: number | null;

  // ratings (can be 0 until you implement reviews)
  @Column({ type: 'float', default: 0 })
  ratingAvg: number;

  @Column({ type: 'int', default: 0 })
  ratingCount: number;

  @Column({ type: 'varchar', length: 80 })
  category: string;

  @Column({ type: 'varchar', length: 80 })
  wilaya: string;

  @Column({ type: 'varchar', length: 80 })
  city: string;

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status: ListingStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
