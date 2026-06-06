import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from "typeorm";
import { User } from "../users/user.entity";

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

  @Column({ type: "varchar", length: 80, nullable: true })
  businessType: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  placeId: string | null;

  @Column({ type: "double precision", nullable: true })
  lat: number | null;

  @Column({ type: "double precision", nullable: true })
  lng: number | null;

  @Column({ type: "text", nullable: true })
  logoUrl: string | null;

  @Column({ default: false })
  isVerified: boolean;
}
