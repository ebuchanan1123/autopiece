import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPaymentPendingStates1775442000000 implements MigrationInterface {
  name = "AddPaymentPendingStates1775442000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order" ALTER COLUMN "status" TYPE character varying(24)`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_item" ALTER COLUMN "status" TYPE character varying(24)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order_item" ALTER COLUMN "status" TYPE character varying(16)`,
    );
    await queryRunner.query(
      `ALTER TABLE "order" ALTER COLUMN "status" TYPE character varying(16)`,
    );
  }
}
