import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuditLog } from "./audit-log.entity";

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  record(params: {
    actorUserId?: number | null;
    action: string;
    entityType: string;
    entityId?: string | number | null;
    metadata?: Record<string, unknown> | null;
  }) {
    return this.auditRepo.save(
      this.auditRepo.create({
        actorUserId: params.actorUserId ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId:
          params.entityId === undefined || params.entityId === null
            ? null
            : String(params.entityId),
        metadata: params.metadata ?? null,
      }),
    );
  }

  recent(limit = 100) {
    return this.auditRepo.find({
      order: { createdAt: "DESC" },
      take: Math.min(Math.max(limit, 1), 250),
    });
  }
}
