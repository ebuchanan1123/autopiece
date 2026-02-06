import { MigrationInterface, QueryRunner } from "typeorm";

export class InitTgtg1770233498379 implements MigrationInterface {
    name = 'InitTgtg1770233498379'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "listing" ("id" SERIAL NOT NULL, "sellerId" integer NOT NULL, "title" character varying NOT NULL, "description" text NOT NULL, "priceDzd" integer NOT NULL, "originalValueDzd" integer NOT NULL DEFAULT '0', "quantityAvailable" integer NOT NULL DEFAULT '1', "pickupStartAt" TIMESTAMP WITH TIME ZONE, "pickupEndAt" TIMESTAMP WITH TIME ZONE, "lat" double precision, "lng" double precision, "ratingAvg" double precision NOT NULL DEFAULT '0', "ratingCount" integer NOT NULL DEFAULT '0', "category" character varying(80) NOT NULL, "wilaya" character varying(80) NOT NULL, "city" character varying(80) NOT NULL, "status" character varying(16) NOT NULL DEFAULT 'active', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_381d45ebb8692362c156d6b87d7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_5790e969dbfb5ea2298459cdc3" ON "listing" ("lat", "lng") `);
        await queryRunner.query(`CREATE INDEX "IDX_e4094512a37eb4e7f0b7ca1761" ON "listing" ("sellerId", "status") `);
        await queryRunner.query(`CREATE INDEX "IDX_3c8f08be8d02877e3b72dc20e5" ON "listing" ("wilaya", "city") `);
        await queryRunner.query(`CREATE INDEX "IDX_3ed25aab37a6f85165654530c3" ON "listing" ("status", "createdAt") `);
        await queryRunner.query(`CREATE TABLE "user" ("id" SERIAL NOT NULL, "email" character varying NOT NULL, "passwordHash" character varying NOT NULL, "role" character varying NOT NULL DEFAULT 'client', "phone" character varying, "failedLoginCount" integer NOT NULL DEFAULT '0', "lastFailedLoginAt" TIMESTAMP WITH TIME ZONE, "lockUntil" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "seller_profile" ("id" SERIAL NOT NULL, "storeName" character varying NOT NULL, "address" character varying NOT NULL, "city" character varying NOT NULL, "wilaya" character varying NOT NULL, "phone" character varying NOT NULL, "isVerified" boolean NOT NULL DEFAULT false, "userId" integer, CONSTRAINT "REL_c2b29aefac4072d2503cab6c0c" UNIQUE ("userId"), CONSTRAINT "PK_1455fd9c9540da78423b04567a1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "payment" ("id" SERIAL NOT NULL, "orderId" integer NOT NULL, "provider" character varying(24) NOT NULL, "status" character varying(16) NOT NULL, "amountDzd" integer NOT NULL, "providerPaymentId" character varying(120), "rawPayload" jsonb, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_fcaec7df5adf9cac408c686b2ab" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_d09d285fe1645cd2f0db811e29" ON "payment" ("orderId") `);
        await queryRunner.query(`CREATE TABLE "order" ("id" SERIAL NOT NULL, "customerId" integer NOT NULL, "orderNumber" character varying(32) NOT NULL, "paymentMethod" character varying(10) NOT NULL DEFAULT 'in_store', "status" character varying(16) NOT NULL DEFAULT 'reserved', "totalDzd" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_1031171c13130102495201e3e20" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_4e9f8dd16ec084bca97b3262ed" ON "order" ("orderNumber") `);
        await queryRunner.query(`CREATE INDEX "IDX_823a52ece9a868f29c968bdbe4" ON "order" ("customerId", "createdAt") `);
        await queryRunner.query(`CREATE TABLE "order_item" ("id" SERIAL NOT NULL, "orderId" integer NOT NULL, "listingId" integer NOT NULL, "sellerId" integer NOT NULL, "quantity" integer NOT NULL DEFAULT '1', "unitPriceDzd" integer NOT NULL, "saleNumber" character varying(32) NOT NULL, "status" character varying(16) NOT NULL DEFAULT 'reserved', "reservedUntil" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_d01158fe15b1ead5c26fd7f4e90" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_4ce012acf8e17487759fe6bc8b" ON "order_item" ("saleNumber") `);
        await queryRunner.query(`CREATE INDEX "IDX_f709e794395a2717136334d2d2" ON "order_item" ("sellerId", "createdAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_98485f02e15103e64a2fb7663c" ON "order_item" ("listingId") `);
        await queryRunner.query(`CREATE INDEX "IDX_646bf9ece6f45dbe41c203e06e" ON "order_item" ("orderId") `);
        await queryRunner.query(`CREATE TABLE "order_delivery" ("id" SERIAL NOT NULL, "orderItemId" integer NOT NULL, "message" text NOT NULL, "attachments" jsonb, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_962eec87d3d029c51525f259fba" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_3985a594ad9e9968305116a23d" ON "order_delivery" ("orderItemId", "createdAt") `);
        await queryRunner.query(`CREATE TABLE "refresh_session" ("id" SERIAL NOT NULL, "tokenId" uuid NOT NULL, "userId" integer NOT NULL, "secretHash" character varying NOT NULL, "expiresAt" TIMESTAMP NOT NULL, "revokedAt" TIMESTAMP, "replacedByTokenId" character varying(36), "userAgentHash" character varying(64), "ipHash" character varying(64), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "lastUsedAt" TIMESTAMP, "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_deb778cee8b1032c4c5dd5daff9" UNIQUE ("tokenId"), CONSTRAINT "PK_5d0d8c21064803b5b2baaa50cbb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_98fc1b86461292cc109e202430" ON "refresh_session" ("userId", "revokedAt") `);
        await queryRunner.query(`ALTER TABLE "listing" ADD CONSTRAINT "FK_c4307d9d9d24454eb434e66b16e" FOREIGN KEY ("sellerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "seller_profile" ADD CONSTRAINT "FK_c2b29aefac4072d2503cab6c0c4" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "order_item" ADD CONSTRAINT "FK_646bf9ece6f45dbe41c203e06e0" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "order_item" ADD CONSTRAINT "FK_98485f02e15103e64a2fb7663c2" FOREIGN KEY ("listingId") REFERENCES "listing"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "order_item" DROP CONSTRAINT "FK_98485f02e15103e64a2fb7663c2"`);
        await queryRunner.query(`ALTER TABLE "order_item" DROP CONSTRAINT "FK_646bf9ece6f45dbe41c203e06e0"`);
        await queryRunner.query(`ALTER TABLE "seller_profile" DROP CONSTRAINT "FK_c2b29aefac4072d2503cab6c0c4"`);
        await queryRunner.query(`ALTER TABLE "listing" DROP CONSTRAINT "FK_c4307d9d9d24454eb434e66b16e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_98fc1b86461292cc109e202430"`);
        await queryRunner.query(`DROP TABLE "refresh_session"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3985a594ad9e9968305116a23d"`);
        await queryRunner.query(`DROP TABLE "order_delivery"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_646bf9ece6f45dbe41c203e06e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_98485f02e15103e64a2fb7663c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f709e794395a2717136334d2d2"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4ce012acf8e17487759fe6bc8b"`);
        await queryRunner.query(`DROP TABLE "order_item"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_823a52ece9a868f29c968bdbe4"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4e9f8dd16ec084bca97b3262ed"`);
        await queryRunner.query(`DROP TABLE "order"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d09d285fe1645cd2f0db811e29"`);
        await queryRunner.query(`DROP TABLE "payment"`);
        await queryRunner.query(`DROP TABLE "seller_profile"`);
        await queryRunner.query(`DROP TABLE "user"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3ed25aab37a6f85165654530c3"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3c8f08be8d02877e3b72dc20e5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e4094512a37eb4e7f0b7ca1761"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5790e969dbfb5ea2298459cdc3"`);
        await queryRunner.query(`DROP TABLE "listing"`);
    }

}
