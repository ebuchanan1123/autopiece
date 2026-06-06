import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSellerProfileFields1773951000000 implements MigrationInterface {
  name = "AddSellerProfileFields1773951000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "seller_profile" ADD COLUMN IF NOT EXISTS "businessType" character varying(80)`,
    );
    await queryRunner.query(
      `ALTER TABLE "seller_profile" ADD COLUMN IF NOT EXISTS "placeId" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "seller_profile" ADD COLUMN IF NOT EXISTS "lat" double precision`,
    );
    await queryRunner.query(
      `ALTER TABLE "seller_profile" ADD COLUMN IF NOT EXISTS "lng" double precision`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "seller_profile" DROP COLUMN IF EXISTS "lng"`,
    );
    await queryRunner.query(
      `ALTER TABLE "seller_profile" DROP COLUMN IF EXISTS "lat"`,
    );
    await queryRunner.query(
      `ALTER TABLE "seller_profile" DROP COLUMN IF EXISTS "placeId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "seller_profile" DROP COLUMN IF EXISTS "businessType"`,
    );
  }
}
