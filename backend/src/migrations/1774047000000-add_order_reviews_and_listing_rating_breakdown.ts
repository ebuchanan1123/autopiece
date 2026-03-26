import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOrderReviewsAndListingRatingBreakdown1774047000000 implements MigrationInterface {
  name = "AddOrderReviewsAndListingRatingBreakdown1774047000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "listing" ADD "pickupRatingAvg" double precision NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "listing" ADD "qualityRatingAvg" double precision NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "listing" ADD "varietyRatingAvg" double precision NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "listing" ADD "quantityRatingAvg" double precision NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `CREATE TABLE "order_review" ("id" SERIAL NOT NULL, "orderItemId" integer NOT NULL, "orderId" integer NOT NULL, "listingId" integer NOT NULL, "customerId" integer NOT NULL, "overallRating" integer NOT NULL, "pickupRating" integer NOT NULL, "qualityRating" integer NOT NULL, "varietyRating" integer NOT NULL, "quantityRating" integer NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_0c4bbba983dff3b317aa8972a8e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_order_review_order_item" ON "order_review" ("orderItemId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_order_review_listing" ON "order_review" ("listingId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_order_review_customer" ON "order_review" ("customerId") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_order_review_customer"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_order_review_listing"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_order_review_order_item"`,
    );
    await queryRunner.query(`DROP TABLE "order_review"`);
    await queryRunner.query(
      `ALTER TABLE "listing" DROP COLUMN "quantityRatingAvg"`,
    );
    await queryRunner.query(
      `ALTER TABLE "listing" DROP COLUMN "varietyRatingAvg"`,
    );
    await queryRunner.query(
      `ALTER TABLE "listing" DROP COLUMN "qualityRatingAvg"`,
    );
    await queryRunner.query(
      `ALTER TABLE "listing" DROP COLUMN "pickupRatingAvg"`,
    );
  }
}
