import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAuditLogs1775449200000 implements MigrationInterface {
  name = "AddAuditLogs1775449200000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "audit_log" ("id" SERIAL NOT NULL, "actorUserId" integer, "action" character varying(80) NOT NULL, "entityType" character varying(80) NOT NULL, "entityId" character varying(80), "metadata" jsonb, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_audit_log" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_actor_created" ON "audit_log" ("actorUserId", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_entity_created" ON "audit_log" ("entityType", "entityId", "createdAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_audit_entity_created"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_audit_actor_created"`);
    await queryRunner.query(`DROP TABLE "audit_log"`);
  }
}
