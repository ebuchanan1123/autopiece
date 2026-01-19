import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOrders1768319447222 implements MigrationInterface {
    name = 'AddOrders1768319447222'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_accbcd2a4efb9b9354fa0acdd4"`);
        await queryRunner.query(`ALTER TABLE "order_item" ADD "status" character varying(16) NOT NULL DEFAULT 'pending'`);
        await queryRunner.query(`ALTER TABLE "order_item" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`CREATE INDEX "IDX_f709e794395a2717136334d2d2" ON "order_item" ("sellerId", "createdAt") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_f709e794395a2717136334d2d2"`);
        await queryRunner.query(`ALTER TABLE "order_item" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "order_item" DROP COLUMN "status"`);
        await queryRunner.query(`CREATE INDEX "IDX_accbcd2a4efb9b9354fa0acdd4" ON "order_item" ("sellerId") `);
    }

}
