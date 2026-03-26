import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "../users/user.entity";
import { Listing } from "../listings/listing.entity";

export type ReservationStatus = "pending" | "cancelled" | "picked_up";

@Entity()
@Index(["clientId", "createdAt"])
@Index(["listingId", "createdAt"])
@Index(["status", "createdAt"])
export class Reservation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "int" })
  clientId: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "clientId" })
  client: User;

  @Column({ type: "int" })
  listingId: number;

  @ManyToOne(() => Listing, { onDelete: "CASCADE" })
  @JoinColumn({ name: "listingId" })
  listing: Listing;

  // MVP: always 1
  @Column({ type: "int", default: 1 })
  quantity: number;

  @Column({ type: "varchar", length: 16, default: "pending" })
  status: ReservationStatus;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
