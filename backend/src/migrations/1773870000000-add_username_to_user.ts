import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUsernameToUser1773870000000 implements MigrationInterface {
  name = "AddUsernameToUser1773870000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "username" character varying(40) NOT NULL DEFAULT ''`,
    );
    await queryRunner.query(
      `UPDATE "user" SET "username" = split_part("email", '@', 1) WHERE COALESCE("username", '') = ''`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN IF EXISTS "username"`,
    );
  }
}
