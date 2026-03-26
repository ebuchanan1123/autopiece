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

export type ListingStatus =
  | "active"
  | "sold_out"
  | "hidden"
  | "draft"
  | "removed";

type PackagingItem = {
  label: string; // e.g. "Container"
  status: string; // e.g. "Provided"
};

@Entity()
@Index(["status", "createdAt"])
@Index(["wilaya", "city"])
@Index(["sellerId", "status"])
@Index(["lat", "lng"])
export class Listing {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "int" })
  sellerId: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "sellerId" })
  seller: User;

  @Column()
  title: string;

  @Column({ type: "text" })
  description: string;

  // what customer pays
  @Column({ type: "int" })
  priceDzd: number;

  // used for “best value”
  @Column({ type: "int", default: 0 })
  originalValueDzd: number;

  @Column({ type: "int", default: 1 })
  quantityAvailable: number;

  // pickup window
  @Column({ type: "timestamptz", nullable: true })
  pickupStartAt: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  pickupEndAt: Date | null;

  // map pins
  @Column({ type: "double precision", nullable: true })
  lat: number | null;

  @Column({ type: "double precision", nullable: true })
  lng: number | null;

  // ratings (can be 0 until you implement reviews)
  @Column({ type: "float", default: 0 })
  ratingAvg: number;

  @Column({ type: "int", default: 0 })
  ratingCount: number;

  @Column({ type: "float", default: 0 })
  pickupRatingAvg: number;

  @Column({ type: "float", default: 0 })
  qualityRatingAvg: number;

  @Column({ type: "float", default: 0 })
  varietyRatingAvg: number;

  @Column({ type: "float", default: 0 })
  quantityRatingAvg: number;

  @Column({ type: "varchar", length: 80 })
  category: string;

  @Column({ type: "varchar", length: 80 })
  wilaya: string;

  @Column({ type: "varchar", length: 80 })
  city: string;

  @Column({ type: "varchar", length: 16, default: "active" })
  status: ListingStatus;

  /**
   * NEW FIELDS (for richer listing details UI)
   */

  // Hero image/banner
  @Column({ type: "text", nullable: true })
  imageUrl: string | null;

  // Full address text (shown in Directions section)
  @Column({ type: "text", nullable: true })
  address: string | null;

  // Pickup instructions shown on listing page
  @Column({ type: "text", nullable: true })
  pickupInstructions: string | null;

  // Packaging cards (JSON array). Keep nullable to avoid migration headaches.
  @Column({ type: "jsonb", nullable: true })
  packaging: PackagingItem[] | null;

  // Small note under packaging section
  @Column({ type: "text", nullable: true })
  packagingNote: string | null;

  // Accordion content
  @Column({ type: "text", nullable: true })
  ingredientsAndAllergens: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
