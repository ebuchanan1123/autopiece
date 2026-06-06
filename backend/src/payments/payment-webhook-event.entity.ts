import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import type { PaymentProvider } from "../orders/payment.entity";

export type PaymentWebhookEventStatus =
  | "received"
  | "processed"
  | "ignored"
  | "failed";

@Entity()
@Index(["provider", "providerEventId"], { unique: true })
@Index(["orderId", "createdAt"])
export class PaymentWebhookEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 24 })
  provider: PaymentProvider;

  @Column({ type: "varchar", length: 160 })
  providerEventId: string;

  @Column({ type: "varchar", length: 160, nullable: true })
  providerPaymentId: string | null;

  @Column({ type: "int", nullable: true })
  orderId: number | null;

  @Column({ type: "varchar", length: 48 })
  eventType: string;

  @Column({ type: "varchar", length: 24 })
  status: PaymentWebhookEventStatus;

  @Column({ type: "varchar", length: 64 })
  payloadHash: string;

  @Column({ type: "jsonb" })
  payload: Record<string, unknown>;

  @Column({ type: "text", nullable: true })
  error: string | null;

  @Column({ type: "timestamptz", nullable: true })
  processedAt: Date | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
