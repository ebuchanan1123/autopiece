import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFavourites1771340986950 implements MigrationInterface {
  name = "AddFavourites1771340986950";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "reservation" ("id" SERIAL NOT NULL, "clientId" integer NOT NULL, "listingId" integer NOT NULL, "quantity" integer NOT NULL DEFAULT '1', "status" character varying(16) NOT NULL DEFAULT 'pending', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_48b1f9922368359ab88e8bfa525" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4dbe69ff6d22052d827cbb794a" ON "reservation" ("status", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fdc69a160b8627fa7518abcb00" ON "reservation" ("listingId", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5c1cb2d24f21a0d4d96061c6b7" ON "reservation" ("clientId", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE TABLE "favourite" ("id" SERIAL NOT NULL, "clientId" integer NOT NULL, "listingId" integer NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_56f1996fc2983d1895e4a8f3af3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_babb6aa5ee914e2f4ccf7cb2a5" ON "favourite" ("clientId", "listingId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "reservation" ADD CONSTRAINT "FK_cc7c746858c238288e45eedb9ac" FOREIGN KEY ("clientId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservation" ADD CONSTRAINT "FK_61c35cd3732c1d3767df83709f6" FOREIGN KEY ("listingId") REFERENCES "listing"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "favourite" ADD CONSTRAINT "FK_543eac436dc870ec03c89b19f02" FOREIGN KEY ("clientId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "favourite" ADD CONSTRAINT "FK_5bf43abeda11c9e7fcb84c31b8b" FOREIGN KEY ("listingId") REFERENCES "listing"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "favourite" DROP CONSTRAINT "FK_5bf43abeda11c9e7fcb84c31b8b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "favourite" DROP CONSTRAINT "FK_543eac436dc870ec03c89b19f02"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservation" DROP CONSTRAINT "FK_61c35cd3732c1d3767df83709f6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservation" DROP CONSTRAINT "FK_cc7c746858c238288e45eedb9ac"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_babb6aa5ee914e2f4ccf7cb2a5"`,
    );
    await queryRunner.query(`DROP TABLE "favourite"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5c1cb2d24f21a0d4d96061c6b7"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_fdc69a160b8627fa7518abcb00"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4dbe69ff6d22052d827cbb794a"`,
    );
    await queryRunner.query(`DROP TABLE "reservation"`);
  }
}
