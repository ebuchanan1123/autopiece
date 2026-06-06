import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export type PushPlatform = "ios" | "android" | "web" | "unknown";

@Entity()
@Index(["userId", "updatedAt"])
@Index(["token"], { unique: true })
export class UserPushToken {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "int" })
  userId: number;

  @Column({ type: "varchar", length: 255 })
  token: string;

  @Column({ type: "varchar", length: 24, default: "unknown" })
  platform: PushPlatform;

  @Column({ type: "timestamptz", nullable: true })
  disabledAt: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  lastDeliveredAt: Date | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
