import { MigrationInterface, QueryRunner } from "typeorm";

export class AddClientProfileFields1773876000000 implements MigrationInterface {
  name = "AddClientProfileFields1773876000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "country" character varying(80)`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "gender" character varying(40)`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "dietaryPreferences" character varying(120)`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "birthday" date`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "preferredPickupTimes" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "notificationSettings" jsonb`,
    );

    await queryRunner.query(
      `UPDATE "user" SET "country" = 'Algeria' WHERE "country" IS NULL AND "role" = 'client'`,
    );
    await queryRunner.query(
      `UPDATE "user" SET "preferredPickupTimes" = '[]'::jsonb WHERE "preferredPickupTimes" IS NULL`,
    );
    await queryRunner.query(
      `UPDATE "user"
       SET "notificationSettings" = '{"calendarReminders":false,"emailUpdates":false,"pushNotifications":true,"importantUpdates":true,"announcements":true,"surpriseBagAlerts":true}'::jsonb
       WHERE "notificationSettings" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN IF EXISTS "notificationSettings"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN IF EXISTS "preferredPickupTimes"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN IF EXISTS "birthday"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN IF EXISTS "dietaryPreferences"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN IF EXISTS "gender"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN IF EXISTS "country"`,
    );
  }
}
