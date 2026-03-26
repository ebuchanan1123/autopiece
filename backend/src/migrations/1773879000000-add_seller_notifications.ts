import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSellerNotifications1773879000000 implements MigrationInterface {
  name = "AddSellerNotifications1773879000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "seller_notification" (
        "id" SERIAL NOT NULL,
        "sellerId" integer NOT NULL,
        "orderId" integer NOT NULL,
        "type" character varying(24) NOT NULL,
        "title" character varying(160) NOT NULL,
        "body" text NOT NULL,
        "metadata" jsonb,
        "readAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_seller_notification_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_seller_notification_seller_created"
      ON "seller_notification" ("sellerId", "createdAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_seller_notification_seller_created"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "seller_notification"`);
  }
}
