import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity()
export class SellerProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => User)
  @JoinColumn()
  user: User; 

  @Column()
  storeName: string;

  @Column()
  address: string;

  @Column()
  city: string;

  @Column()
  wilaya: string;

  @Column()
  phone: string;

  @Column({ default: false })
  isVerified: boolean;
}
