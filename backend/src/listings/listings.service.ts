import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { Listing } from "./listing.entity";
import { CreateListingDto } from "./dto/create-listing.dto";
import { UpdateListingDto } from "./dto/update-listing.dto";
import type { JwtUser } from "../auth/types/jwt-user.type";
import { ListingTranslation } from "./listing-translation.entity";
import { GoogleTranslateService } from "../common/translate/google-translate.service";
import { SellerProfile } from "../sellers/seller.entity";

@Injectable()
export class ListingsService {
  constructor(
    @InjectRepository(ListingTranslation)
    private readonly translationRepo: Repository<ListingTranslation>,
    private readonly translate: GoogleTranslateService,

    @InjectRepository(Listing)
    private readonly repo: Repository<Listing>,

    @InjectRepository(SellerProfile)
    private readonly sellerRepo: Repository<SellerProfile>,
  ) {}

  private async enrichListings<T extends Listing | Listing[]>(
    value: T,
  ): Promise<T> {
    const listings = Array.isArray(value) ? value : [value];
    const sellerIds = Array.from(
      new Set(
        listings.map((listing) => Number(listing.sellerId)).filter(Boolean),
      ),
    );
    if (!sellerIds.length) return value;

    const profiles = await this.sellerRepo
      .createQueryBuilder("seller")
      .leftJoinAndSelect("seller.user", "user")
      .where("user.id IN (:...sellerIds)", { sellerIds })
      .getMany();

    const profileMap = new Map<number, SellerProfile>();
    for (const profile of profiles) {
      const userId = Number((profile as any).user?.id);
      if (userId) profileMap.set(userId, profile);
    }

    const enriched = listings.map((listing) => {
      const profile = profileMap.get(Number(listing.sellerId));
      return Object.assign(listing, {
        storeName: profile?.storeName ?? null,
        sellerLogoUrl: profile?.logoUrl ?? null,
        sellerBusinessType: profile?.businessType ?? null,
      });
    });

    return (Array.isArray(value) ? enriched : enriched[0]) as T;
  }

  async translateListing(listingId: number, lang: "en" | "fr" | "ar") {
    const listing = await this.repo.findOne({ where: { id: listingId } });

    if (!listing) {
      throw new NotFoundException("Listing not found");
    }

    // Check cache first
    const existing = await this.translationRepo.findOne({
      where: { listingId, lang },
    });

    if (existing) {
      return {
        listingId,
        lang,
        title: existing.title,
        description: existing.description,
        cached: true,
        createdAt: existing.createdAt,
      };
    }

    // Translate fields
    const title = await this.translate.translateText(listing.title ?? "", lang);

    const description = await this.translate.translateText(
      listing.description ?? "",
      lang,
    );

    const saved = await this.translationRepo.save(
      this.translationRepo.create({
        listingId,
        lang,
        title,
        description,
      }),
    );

    return {
      listingId,
      lang,
      title: saved.title,
      description: saved.description,
      cached: false,
      createdAt: saved.createdAt,
    };
  }

  async create(dto: CreateListingDto, user: JwtUser) {
    if (user.role !== "seller") {
      throw new ForbiddenException("Only sellers can create listings");
    }

    const listing = this.repo.create({
      sellerId: Number(user.sub),
      title: dto.title,
      description: dto.description,
      priceDzd: dto.priceDzd,
      originalValueDzd: dto.originalValueDzd ?? 0,
      quantityAvailable: dto.quantityAvailable ?? 1,
      category: dto.category,
      wilaya: dto.wilaya,
      city: dto.city,
      pickupStartAt: dto.pickupStartAt ? new Date(dto.pickupStartAt) : null,
      pickupEndAt: dto.pickupEndAt ? new Date(dto.pickupEndAt) : null,
      lat: dto.lat ?? null,
      lng: dto.lng ?? null,
      imageUrl: dto.imageUrl ?? null,
      address: dto.address ?? null,
      pickupInstructions: dto.pickupInstructions ?? null,
      packaging: dto.packaging ?? null,
      packagingNote: dto.packagingNote ?? null,
      ingredientsAndAllergens: dto.ingredientsAndAllergens ?? null,
    });

    return this.repo.save(listing);
  }

  async findMine(user: JwtUser) {
    if (user.role !== "seller" && user.role !== "admin") {
      throw new ForbiddenException("Only sellers can view their listings");
    }

    const listings = await this.repo.find({
      where: user.role === "admin" ? {} : { sellerId: Number(user.sub) },
      order: { createdAt: "DESC" },
    });

    return this.enrichListings(listings);
  }

  async update(id: number, dto: UpdateListingDto, user: JwtUser) {
    return this.repo.manager.transaction(async (manager) => {
      const listing = await manager
        .getRepository(Listing)
        .createQueryBuilder("listing")
        .where("listing.id = :id", { id })
        .setLock("pessimistic_write")
        .getOne();

      if (!listing) throw new NotFoundException();

      if (listing.sellerId !== user.sub && user.role !== "admin") {
        throw new ForbiddenException();
      }

      Object.assign(listing, dto);
      return manager.getRepository(Listing).save(listing);
    });
  }

  async remove(id: number, user: JwtUser) {
    const listing = await this.repo.findOne({ where: { id } });
    if (!listing) throw new NotFoundException();

    if (listing.sellerId !== user.sub && user.role !== "admin") {
      throw new ForbiddenException();
    }

    listing.status = "removed";
    return this.repo.save(listing);
  }

  async findById(id: number) {
    return this.repo.findOne({ where: { id } });
  }

  async translateListingsBulk(listingIds: number[], lang: "en" | "fr" | "ar") {
    // Normalize + guard
    const ids = Array.from(
      new Set(
        (listingIds ?? [])
          .map((x) => Number(x))
          .filter((x) => Number.isFinite(x) && x > 0),
      ),
    );

    if (ids.length === 0) return [];

    // If target is English, no need to translate: return empty cached-style result
    // (You can also return original listing text here, but bulk endpoint is meant for translations.)
    if (lang === "en") {
      return ids.map((listingId) => ({
        listingId,
        lang,
        title: "",
        description: "",
        cached: true,
        createdAt: new Date().toISOString(),
      }));
    }

    // 1) Fetch existing cached translations
    const existing = await this.translationRepo.find({
      where: { listingId: In(ids), lang },
    });

    const existingById = new Map<number, ListingTranslation>();
    for (const row of existing) existingById.set(row.listingId, row);

    const missingIds = ids.filter((id) => !existingById.has(id));

    // 2) Translate missing ones
    if (missingIds.length > 0) {
      const listings = await this.repo.find({
        where: { id: In(missingIds) },
      });

      // translate each listing; keep it sequential to avoid hammering LibreTranslate
      // (You can add concurrency later if you want)
      for (const l of listings) {
        const title = await this.translate.translateText(l.title ?? "", lang);
        const description = await this.translate.translateText(
          l.description ?? "",
          lang,
        );

        const saved = await this.translationRepo.save(
          this.translationRepo.create({
            listingId: l.id,
            lang,
            title,
            description,
          }),
        );

        existingById.set(l.id, saved);
      }
    }

    // 3) Return results in the same order as request (only for ids that exist)
    // If an id didn't exist in DB, it won't be in existingById. We silently drop it.
    return ids
      .map((listingId) => {
        const row = existingById.get(listingId);
        if (!row) return null;

        // Determine cached flag: if it was in the original existing set, it's cached; otherwise it was just created.
        const wasCached = existing.some((e) => e.listingId === listingId);

        return {
          listingId,
          lang,
          title: row.title,
          description: row.description,
          cached: wasCached,
          createdAt: row.createdAt,
        };
      })
      .filter(Boolean);
  }

  async findPublicById(id: number) {
    const listing = await this.repo.findOne({ where: { id } });
    if (!listing || listing.status !== "active") throw new NotFoundException();
    return this.enrichListings(listing);
  }

  async findByIds(ids: number[]) {
    if (!ids.length) return [];
    return this.repo.find({ where: { id: In(ids) } });
  }

  async findPublic(query: {
    q?: string;
    wilaya?: string;
    city?: string;
    page?: number;
  }) {
    const qb = this.repo
      .createQueryBuilder("l")
      .where("l.status = :status", { status: "active" });

    if (query.q) {
      qb.andWhere("(l.title ILIKE :q OR l.description ILIKE :q)", {
        q: `%${query.q}%`,
      });
    }

    if (query.wilaya)
      qb.andWhere("l.wilaya = :wilaya", { wilaya: query.wilaya });
    if (query.city) qb.andWhere("l.city = :city", { city: query.city });

    const page = query.page ?? 1;
    qb.take(20).skip((page - 1) * 20);

    const listings = await qb.getMany();
    return this.enrichListings(listings);
  }
  async mapPins(params: {
    minLat: number;
    minLng: number;
    maxLat: number;
    maxLng: number;
  }) {
    return this.repo
      .createQueryBuilder("l")
      .select([
        "l.id",
        "l.title",
        "l.priceDzd",
        "l.lat",
        "l.lng",
        "l.city",
        "l.wilaya",
        "l.pickupStartAt",
        "l.pickupEndAt",
      ])
      .where("l.status = :status", { status: "active" })
      .andWhere("l.lat IS NOT NULL AND l.lng IS NOT NULL")
      .andWhere("l.lat BETWEEN :minLat AND :maxLat", params)
      .andWhere("l.lng BETWEEN :minLng AND :maxLng", params)
      .getMany();
  }
}
