import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity()
@Index(["listingId"])
@Index(["customerId"])
@Index(["orderItemId"], { unique: true })
export class OrderReview {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "int" })
  orderItemId: number;

  @Column({ type: "int" })
  orderId: number;

  @Column({ type: "int" })
  listingId: number;

  @Column({ type: "int" })
  customerId: number;

  @Column({ type: "int" })
  overallRating: number;

  @Column({ type: "int" })
  pickupRating: number;

  @Column({ type: "int" })
  qualityRating: number;

  @Column({ type: "int" })
  varietyRating: number;

  @Column({ type: "int" })
  quantityRating: number;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
