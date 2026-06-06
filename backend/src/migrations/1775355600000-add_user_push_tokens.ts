import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserPushTokens1775355600000 implements MigrationInterface {
  name = "AddUserPushTokens1775355600000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user_push_token" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "token" character varying(255) NOT NULL, "platform" character varying(24) NOT NULL DEFAULT 'unknown', "disabledAt" TIMESTAMP WITH TIME ZONE, "lastDeliveredAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_3c0a22a93e6d8f870f97b5b4d4f" UNIQUE ("token"), CONSTRAINT "PK_57bc90d4fd3d733db04ccd29b7b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5a6c4c29fc9bfbcf5c8c1395e8" ON "user_push_token" ("userId", "updatedAt") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5a6c4c29fc9bfbcf5c8c1395e8"`,
    );
    await queryRunner.query(`DROP TABLE "user_push_token"`);
  }
}
