import { MigrationInterface, QueryRunner } from "typeorm";

export class AddListingTranslations1771441117356 implements MigrationInterface {
  name = "AddListingTranslations1771441117356";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "listing_translation" ("id" SERIAL NOT NULL, "listingId" integer NOT NULL, "lang" character varying(2) NOT NULL, "title" text NOT NULL, "description" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_d315395bb71dcd952ce4189595c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_a2f9eb85fed83fcd69d54d146a" ON "listing_translation" ("listingId", "lang") `,
    );
    await queryRunner.query(
      `ALTER TABLE "listing_translation" ADD CONSTRAINT "FK_95a2a9126e2df3ead533edd1ab1" FOREIGN KEY ("listingId") REFERENCES "listing"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "listing_translation" DROP CONSTRAINT "FK_95a2a9126e2df3ead533edd1ab1"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a2f9eb85fed83fcd69d54d146a"`,
    );
    await queryRunner.query(`DROP TABLE "listing_translation"`);
  }
}
