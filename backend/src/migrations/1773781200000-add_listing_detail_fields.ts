import { MigrationInterface, QueryRunner } from "typeorm";

export class AddListingDetailFields1773781200000 implements MigrationInterface {
  name = "AddListingDetailFields1773781200000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "listing" ADD COLUMN IF NOT EXISTS "imageUrl" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "listing" ADD COLUMN IF NOT EXISTS "address" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "listing" ADD COLUMN IF NOT EXISTS "pickupInstructions" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "listing" ADD COLUMN IF NOT EXISTS "packaging" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "listing" ADD COLUMN IF NOT EXISTS "packagingNote" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "listing" ADD COLUMN IF NOT EXISTS "ingredientsAndAllergens" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "listing" DROP COLUMN IF EXISTS "ingredientsAndAllergens"`,
    );
    await queryRunner.query(
      `ALTER TABLE "listing" DROP COLUMN IF EXISTS "packagingNote"`,
    );
    await queryRunner.query(
      `ALTER TABLE "listing" DROP COLUMN IF EXISTS "packaging"`,
    );
    await queryRunner.query(
      `ALTER TABLE "listing" DROP COLUMN IF EXISTS "pickupInstructions"`,
    );
    await queryRunner.query(
      `ALTER TABLE "listing" DROP COLUMN IF EXISTS "address"`,
    );
    await queryRunner.query(
      `ALTER TABLE "listing" DROP COLUMN IF EXISTS "imageUrl"`,
    );
  }
}
