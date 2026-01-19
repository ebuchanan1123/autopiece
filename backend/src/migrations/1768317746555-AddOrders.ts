import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOrders1768317746555 implements MigrationInterface {
    name = 'AddOrders1768317746555'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "payment" ("id" SERIAL NOT NULL, "orderId" integer NOT NULL, "provider" character varying(24) NOT NULL, "status" character varying(16) NOT NULL, "amountDzd" integer NOT NULL, "providerPaymentId" character varying(120), "rawPayload" jsonb, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_fcaec7df5adf9cac408c686b2ab" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_d09d285fe1645cd2f0db811e29" ON "payment" ("orderId") `);
        await queryRunner.query(`CREATE TABLE "order_item" ("id" SERIAL NOT NULL, "orderId" integer NOT NULL, "listingId" integer NOT NULL, "sellerId" integer NOT NULL, "quantity" integer NOT NULL DEFAULT '1', "unitPriceDzd" integer NOT NULL, "titleSnapshot" character varying(140) NOT NULL, CONSTRAINT "PK_d01158fe15b1ead5c26fd7f4e90" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_646bf9ece6f45dbe41c203e06e" ON "order_item" ("orderId") `);
        await queryRunner.query(`CREATE INDEX "IDX_accbcd2a4efb9b9354fa0acdd4" ON "order_item" ("sellerId") `);
        await queryRunner.query(`CREATE TABLE "order" ("id" SERIAL NOT NULL, "buyerId" integer NOT NULL, "paymentMethod" character varying(10) NOT NULL, "status" character varying(32) NOT NULL, "totalDzd" integer NOT NULL, "deliveryFeeDzd" integer NOT NULL DEFAULT '0', "shippingName" character varying(120) NOT NULL, "shippingPhone" character varying(40) NOT NULL, "shippingAddress" character varying(200) NOT NULL, "wilaya" character varying(80) NOT NULL, "city" character varying(80) NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_1031171c13130102495201e3e20" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_98bd0b7b96fce8bd914f9ad271" ON "order" ("buyerId", "createdAt") `);
        await queryRunner.query(`ALTER TABLE "listing" DROP COLUMN "priceCents"`);
        await queryRunner.query(`ALTER TABLE "listing" DROP COLUMN "currency"`);
        await queryRunner.query(`ALTER TABLE "listing" ADD "priceDzd" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "listing" ADD "category" character varying(80) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "listing" ADD "make" character varying(80) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "listing" ADD "model" character varying(80) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "listing" ADD "year" integer`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3ed25aab37a6f85165654530c3"`);
        await queryRunner.query(`ALTER TABLE "listing" DROP COLUMN "title"`);
        await queryRunner.query(`ALTER TABLE "listing" ADD "title" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "listing" ALTER COLUMN "description" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "listing" DROP COLUMN "status"`);
        await queryRunner.query(`ALTER TABLE "listing" ADD "status" character varying NOT NULL DEFAULT 'active'`);
        await queryRunner.query(`ALTER TABLE "listing" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "listing" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "listing" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "listing" ADD "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`CREATE INDEX "IDX_e4094512a37eb4e7f0b7ca1761" ON "listing" ("sellerId", "status") `);
        await queryRunner.query(`CREATE INDEX "IDX_3ed25aab37a6f85165654530c3" ON "listing" ("status", "createdAt") `);
        await queryRunner.query(`ALTER TABLE "order_item" ADD CONSTRAINT "FK_646bf9ece6f45dbe41c203e06e0" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "order_item" DROP CONSTRAINT "FK_646bf9ece6f45dbe41c203e06e0"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3ed25aab37a6f85165654530c3"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e4094512a37eb4e7f0b7ca1761"`);
        await queryRunner.query(`ALTER TABLE "listing" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "listing" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "listing" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "listing" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "listing" DROP COLUMN "status"`);
        await queryRunner.query(`ALTER TABLE "listing" ADD "status" character varying(10) NOT NULL DEFAULT 'active'`);
        await queryRunner.query(`ALTER TABLE "listing" ALTER COLUMN "description" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "listing" DROP COLUMN "title"`);
        await queryRunner.query(`ALTER TABLE "listing" ADD "title" character varying(120) NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_3ed25aab37a6f85165654530c3" ON "listing" ("status", "createdAt") `);
        await queryRunner.query(`ALTER TABLE "listing" DROP COLUMN "year"`);
        await queryRunner.query(`ALTER TABLE "listing" DROP COLUMN "model"`);
        await queryRunner.query(`ALTER TABLE "listing" DROP COLUMN "make"`);
        await queryRunner.query(`ALTER TABLE "listing" DROP COLUMN "category"`);
        await queryRunner.query(`ALTER TABLE "listing" DROP COLUMN "priceDzd"`);
        await queryRunner.query(`ALTER TABLE "listing" ADD "currency" character varying(3) NOT NULL DEFAULT 'DZD'`);
        await queryRunner.query(`ALTER TABLE "listing" ADD "priceCents" integer NOT NULL`);
        await queryRunner.query(`DROP INDEX "public"."IDX_98bd0b7b96fce8bd914f9ad271"`);
        await queryRunner.query(`DROP TABLE "order"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_accbcd2a4efb9b9354fa0acdd4"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_646bf9ece6f45dbe41c203e06e"`);
        await queryRunner.query(`DROP TABLE "order_item"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d09d285fe1645cd2f0db811e29"`);
        await queryRunner.query(`DROP TABLE "payment"`);
    }

}
