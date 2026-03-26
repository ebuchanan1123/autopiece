import {
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Listing } from "../listings/listing.entity";

export type UserRole = "client" | "seller" | "admin";

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column({ type: "varchar", length: 40, default: "" })
  username: string;

  @Column()
  passwordHash: string;

  @Column({ type: "varchar", default: "client" })
  role: UserRole;

  @Column({ nullable: true })
  phone?: string;

  @Column({ type: "varchar", length: 80, nullable: true })
  country?: string | null;

  @Column({ type: "varchar", length: 40, nullable: true })
  gender?: string | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  dietaryPreferences?: string | null;

  @Column({ type: "date", nullable: true })
  birthday?: string | null;

  @Column({ type: "jsonb", nullable: true })
  preferredPickupTimes?: string[] | null;

  @Column({ type: "jsonb", nullable: true })
  notificationSettings?: {
    calendarReminders: boolean;
    emailUpdates: boolean;
    pushNotifications: boolean;
    importantUpdates: boolean;
    announcements: boolean;
    surpriseBagAlerts: boolean;
  } | null;

  // Brute-force protection
  @Column({ type: "int", default: 0 })
  failedLoginCount: number;

  @Column({ type: "timestamptz", nullable: true })
  lastFailedLoginAt: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  lockUntil: Date | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;

  @OneToMany(() => Listing, (listing) => listing.seller)
  listings: Listing[];
}
