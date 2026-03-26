import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSellerLogoUrl1773954000000 implements MigrationInterface {
  name = "AddSellerLogoUrl1773954000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "seller_profile"
      ADD COLUMN IF NOT EXISTS "logoUrl" text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "seller_profile"
      DROP COLUMN IF EXISTS "logoUrl"
    `);
  }
}
