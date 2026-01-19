import { MigrationInterface, QueryRunner } from "typeorm";

export class AddListings1768014022511 implements MigrationInterface {
    name = 'AddListings1768014022511'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "listing" ("id" SERIAL NOT NULL, "sellerId" integer NOT NULL, "title" character varying(120) NOT NULL, "description" text, "priceCents" integer NOT NULL, "currency" character varying(3) NOT NULL DEFAULT 'DZD', "condition" character varying(10) NOT NULL DEFAULT 'used', "city" character varying(80) NOT NULL, "wilaya" character varying(80) NOT NULL, "status" character varying(10) NOT NULL DEFAULT 'active', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_381d45ebb8692362c156d6b87d7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_3c8f08be8d02877e3b72dc20e5" ON "listing" ("wilaya", "city") `);
        await queryRunner.query(`CREATE INDEX "IDX_3ed25aab37a6f85165654530c3" ON "listing" ("status", "createdAt") `);
        await queryRunner.query(`ALTER TABLE "listing" ADD CONSTRAINT "FK_c4307d9d9d24454eb434e66b16e" FOREIGN KEY ("sellerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "listing" DROP CONSTRAINT "FK_c4307d9d9d24454eb434e66b16e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3ed25aab37a6f85165654530c3"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3c8f08be8d02877e3b72dc20e5"`);
        await queryRunner.query(`DROP TABLE "listing"`);
    }

}
