import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1766880220180 implements MigrationInterface {
    name = 'InitSchema1766880220180'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "user" ("id" SERIAL NOT NULL, "email" character varying NOT NULL, "passwordHash" character varying NOT NULL, "role" character varying NOT NULL DEFAULT 'client', "phone" character varying, "failedLoginCount" integer NOT NULL DEFAULT '0', "lastFailedLoginAt" TIMESTAMP WITH TIME ZONE, "lockUntil" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "seller_profile" ("id" SERIAL NOT NULL, "storeName" character varying NOT NULL, "address" character varying NOT NULL, "city" character varying NOT NULL, "wilaya" character varying NOT NULL, "phone" character varying NOT NULL, "isVerified" boolean NOT NULL DEFAULT false, "userId" integer, CONSTRAINT "REL_c2b29aefac4072d2503cab6c0c" UNIQUE ("userId"), CONSTRAINT "PK_1455fd9c9540da78423b04567a1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "refresh_session" ("id" SERIAL NOT NULL, "tokenId" uuid NOT NULL, "userId" integer NOT NULL, "secretHash" character varying NOT NULL, "expiresAt" TIMESTAMP NOT NULL, "revokedAt" TIMESTAMP, "replacedByTokenId" character varying(36), "userAgentHash" character varying(64), "ipHash" character varying(64), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "lastUsedAt" TIMESTAMP, "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_deb778cee8b1032c4c5dd5daff9" UNIQUE ("tokenId"), CONSTRAINT "PK_5d0d8c21064803b5b2baaa50cbb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_98fc1b86461292cc109e202430" ON "refresh_session" ("userId", "revokedAt") `);
        await queryRunner.query(`ALTER TABLE "seller_profile" ADD CONSTRAINT "FK_c2b29aefac4072d2503cab6c0c4" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "seller_profile" DROP CONSTRAINT "FK_c2b29aefac4072d2503cab6c0c4"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_98fc1b86461292cc109e202430"`);
        await queryRunner.query(`DROP TABLE "refresh_session"`);
        await queryRunner.query(`DROP TABLE "seller_profile"`);
        await queryRunner.query(`DROP TABLE "user"`);
    }

}
