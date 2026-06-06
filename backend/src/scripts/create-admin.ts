import "reflect-metadata";
import * as dotenv from "dotenv";
import * as argon2 from "argon2";
import dataSource from "../data-source";
import { User } from "../users/user.entity";

if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

function requireValue(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function validatePassword(password: string) {
  if (password.length < 12) {
    throw new Error("ADMIN_PASSWORD must be at least 12 characters");
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    throw new Error(
      "ADMIN_PASSWORD must include uppercase, lowercase, and a number",
    );
  }
}

async function main() {
  const email = requireValue("ADMIN_EMAIL").toLowerCase();
  const password = requireValue("ADMIN_PASSWORD");
  const username = process.env.ADMIN_USERNAME?.trim() || "Admin";
  validatePassword(password);

  await dataSource.initialize();

  const repo = dataSource.getRepository(User);
  const existing = await repo.findOne({ where: { email } });

  if (existing) {
    existing.username = username;
    existing.role = "admin";
    existing.passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
      timeCost: 3,
      memoryCost: 64 * 1024,
      parallelism: 1,
    });
    existing.failedLoginCount = 0;
    existing.lastFailedLoginAt = null;
    existing.lockUntil = null;
    await repo.save(existing);
    console.log(`Admin account updated: ${email}`);
  } else {
    await repo.save(
      repo.create({
        email,
        username,
        role: "admin",
        passwordHash: await argon2.hash(password, {
          type: argon2.argon2id,
          timeCost: 3,
          memoryCost: 64 * 1024,
          parallelism: 1,
        }),
        failedLoginCount: 0,
        lastFailedLoginAt: null,
        lockUntil: null,
      }),
    );
    console.log(`Admin account created: ${email}`);
  }

  await dataSource.destroy();
}

main().catch(async (error) => {
  console.error(error);
  if (dataSource.isInitialized) await dataSource.destroy();
  process.exit(1);
});
