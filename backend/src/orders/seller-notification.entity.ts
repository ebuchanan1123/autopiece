import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export type SellerNotificationType = "bag_reserved" | "bag_paid";

@Entity()
@Index(["sellerId", "createdAt"])
export class SellerNotification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "int" })
  sellerId: number;

  @Column({ type: "int" })
  orderId: number;

  @Column({ type: "varchar", length: 24 })
  type: SellerNotificationType;

  @Column({ type: "varchar", length: 160 })
  title: string;

  @Column({ type: "text" })
  body: string;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ type: "timestamptz", nullable: true })
  readAt: Date | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
