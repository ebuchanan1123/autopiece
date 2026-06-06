import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOrderPickupPin1775352000000 implements MigrationInterface {
  name = "AddOrderPickupPin1775352000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order" ADD COLUMN "pickupPin" character varying(8)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "pickupPin"`);
  }
}
