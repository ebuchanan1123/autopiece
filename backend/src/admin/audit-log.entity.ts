import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity()
@Index(["actorUserId", "createdAt"])
@Index(["entityType", "entityId", "createdAt"])
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "int", nullable: true })
  actorUserId: number | null;

  @Column({ type: "varchar", length: 80 })
  action: string;

  @Column({ type: "varchar", length: 80 })
  entityType: string;

  @Column({ type: "varchar", length: 80, nullable: true })
  entityId: string | null;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;
}
