import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateMarketplaceSchema1768856287592 implements MigrationInterface {
    name = 'UpdateMarketplaceSchema1768856287592'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "service" ("id" SERIAL NOT NULL, "freelancerId" integer NOT NULL, "title" character varying NOT NULL, "description" text NOT NULL, "priceDzd" integer NOT NULL, "category" character varying(80) NOT NULL, "make" character varying(80) NOT NULL, "model" character varying(80) NOT NULL, "year" integer, "wilaya" character varying(80) NOT NULL, "city" character varying(80) NOT NULL, "condition" character varying(10) NOT NULL DEFAULT 'used', "status" character varying(16) NOT NULL DEFAULT 'active', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_85a21558c006647cd76fdce044b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_e6ea4d804d0d9060f7dcdadf24" ON "service" ("freelancerId", "status") `);
        await queryRunner.query(`CREATE INDEX "IDX_f794382fa1a6594bf9a0433279" ON "service" ("wilaya", "city") `);
        await queryRunner.query(`CREATE INDEX "IDX_30cbd1c9d7834c7df5c97165f8" ON "service" ("status", "createdAt") `);
        await queryRunner.query(`CREATE TABLE "order_delivery" ("id" SERIAL NOT NULL, "orderItemId" integer NOT NULL, "message" text NOT NULL, "attachments" jsonb, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_962eec87d3d029c51525f259fba" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_3985a594ad9e9968305116a23d" ON "order_delivery" ("orderItemId", "createdAt") `);
        await queryRunner.query(`CREATE TABLE "freelancer_profile" ("id" SERIAL NOT NULL, "storeName" character varying NOT NULL, "address" character varying NOT NULL, "city" character varying NOT NULL, "wilaya" character varying NOT NULL, "phone" character varying NOT NULL, "isVerified" boolean NOT NULL DEFAULT false, "userId" integer, CONSTRAINT "REL_3bcebc3402ba08dcebda7196e2" UNIQUE ("userId"), CONSTRAINT "PK_02075bf38ed605f3a7d7a2267d9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "deliveryFeeDzd"`);
        await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "shippingName"`);
        await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "shippingPhone"`);
        await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "shippingAddress"`);
        await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "wilaya"`);
        await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "city"`);
        await queryRunner.query(`ALTER TABLE "order" ADD "serviceId" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "order" ADD "freelancerId" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "order" ADD "unitPriceDzd" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "order" ADD "titleSnapshot" character varying(140) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "order" ADD "requirements" jsonb`);
        await queryRunner.query(`ALTER TABLE "order" ADD "requirementsSubmittedAt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "order" ADD "dueAt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "order" ADD "completedAt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "order" ALTER COLUMN "paymentMethod" SET DEFAULT 'online'`);
        await queryRunner.query(`ALTER TABLE "order" ALTER COLUMN "status" SET DEFAULT 'pending_payment'`);
        await queryRunner.query(`CREATE INDEX "IDX_c721e93645fdc15f040096d1ea" ON "order" ("serviceId") `);
        await queryRunner.query(`CREATE INDEX "IDX_e22ab62e663055e7b8b577d1dc" ON "order" ("freelancerId", "createdAt") `);
        await queryRunner.query(`ALTER TABLE "service" ADD CONSTRAINT "FK_07e6497cdd994fe1ffb495c1a88" FOREIGN KEY ("freelancerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "freelancer_profile" ADD CONSTRAINT "FK_3bcebc3402ba08dcebda7196e21" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "freelancer_profile" DROP CONSTRAINT "FK_3bcebc3402ba08dcebda7196e21"`);
        await queryRunner.query(`ALTER TABLE "service" DROP CONSTRAINT "FK_07e6497cdd994fe1ffb495c1a88"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e22ab62e663055e7b8b577d1dc"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c721e93645fdc15f040096d1ea"`);
        await queryRunner.query(`ALTER TABLE "order" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "order" ALTER COLUMN "paymentMethod" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "completedAt"`);
        await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "dueAt"`);
        await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "requirementsSubmittedAt"`);
        await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "requirements"`);
        await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "titleSnapshot"`);
        await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "unitPriceDzd"`);
        await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "freelancerId"`);
        await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "serviceId"`);
        await queryRunner.query(`ALTER TABLE "order" ADD "city" character varying(80) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "order" ADD "wilaya" character varying(80) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "order" ADD "shippingAddress" character varying(200) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "order" ADD "shippingPhone" character varying(40) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "order" ADD "shippingName" character varying(120) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "order" ADD "deliveryFeeDzd" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`DROP TABLE "freelancer_profile"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3985a594ad9e9968305116a23d"`);
        await queryRunner.query(`DROP TABLE "order_delivery"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_30cbd1c9d7834c7df5c97165f8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f794382fa1a6594bf9a0433279"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e6ea4d804d0d9060f7dcdadf24"`);
        await queryRunner.query(`DROP TABLE "service"`);
    }

}
