import "reflect-metadata";
import * as dotenv from "dotenv";
import * as argon2 from "argon2";
import dataSource from "../data-source";
import { User } from "../users/user.entity";
import { SellerProfile } from "../sellers/seller.entity";
import { Listing } from "../listings/listing.entity";

if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

const password = "Test123";

async function upsertUser(params: {
  email: string;
  username: string;
  role: "client" | "seller" | "admin";
  phone?: string;
}) {
  const repo = dataSource.getRepository(User);
  const existing = await repo.findOne({ where: { email: params.email } });
  if (existing) return existing;

  return repo.save(
    repo.create({
      ...params,
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
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Seed script is disabled in production");
  }

  await dataSource.initialize();

  const admin = await upsertUser({
    email: "admin@tgtg.local",
    username: "Admin",
    role: "admin",
  });
  const client = await upsertUser({
    email: "client@tgtg.local",
    username: "Client",
    role: "client",
  });
  const seller = await upsertUser({
    email: "seller@tgtg.local",
    username: "Demo Bakery",
    role: "seller",
    phone: "0555000000",
  });

  const sellerRepo = dataSource.getRepository(SellerProfile);
  let profile = await sellerRepo
    .createQueryBuilder("seller")
    .leftJoinAndSelect("seller.user", "user")
    .where("user.id = :userId", { userId: seller.id })
    .getOne();

  if (!profile) {
    profile = await sellerRepo.save(
      sellerRepo.create({
        user: seller,
        storeName: "Demo Bakery",
        address: "Didouche Mourad Street",
        city: "Algiers",
        wilaya: "Algiers",
        phone: "0555000000",
        businessType: "Bakery",
        placeId: null,
        lat: 36.7538,
        lng: 3.0588,
        logoUrl: null,
        isVerified: true,
      }),
    );
  }

  const listingRepo = dataSource.getRepository(Listing);
  const existingListing = await listingRepo.findOne({
    where: { sellerId: seller.id, title: "Evening pastry bag" },
  });

  if (!existingListing) {
    await listingRepo.save(
      listingRepo.create({
        sellerId: seller.id,
        title: "Evening pastry bag",
        description: "A surprise mix of fresh pastries from today's bake.",
        priceDzd: 450,
        originalValueDzd: 1200,
        quantityAvailable: 5,
        category: "bread",
        wilaya: "Algiers",
        city: "Algiers",
        status: "active",
        pickupStartAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
        pickupEndAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
        lat: profile.lat,
        lng: profile.lng,
        imageUrl: null,
        address: profile.address,
        pickupInstructions: "Ask for your surprise bag at the counter.",
        packaging: null,
        packagingNote: null,
        ingredientsAndAllergens: "May contain gluten, dairy, nuts, and eggs.",
      }),
    );
  }

  console.log("Seed complete");
  console.log(`Admin:  admin@tgtg.local / ${password}`);
  console.log(`Client: client@tgtg.local / ${password}`);
  console.log(`Seller: seller@tgtg.local / ${password}`);

  await dataSource.destroy();
}

main().catch(async (error) => {
  console.error(error);
  if (dataSource.isInitialized) await dataSource.destroy();
  process.exit(1);
});
