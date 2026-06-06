import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPaymentWebhookEvents1775445600000 implements MigrationInterface {
  name = "AddPaymentWebhookEvents1775445600000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "payment_webhook_event" ("id" SERIAL NOT NULL, "provider" character varying(24) NOT NULL, "providerEventId" character varying(160) NOT NULL, "providerPaymentId" character varying(160), "orderId" integer, "eventType" character varying(48) NOT NULL, "status" character varying(24) NOT NULL, "payloadHash" character varying(64) NOT NULL, "payload" jsonb NOT NULL, "error" text, "processedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_payment_webhook_event" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_payment_webhook_provider_event" ON "payment_webhook_event" ("provider", "providerEventId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payment_webhook_order_created" ON "payment_webhook_event" ("orderId", "createdAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_payment_webhook_order_created"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_payment_webhook_provider_event"`,
    );
    await queryRunner.query(`DROP TABLE "payment_webhook_event"`);
  }
}
