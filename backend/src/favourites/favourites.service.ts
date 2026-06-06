import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import type { JwtUser } from "../auth/types/jwt-user.type";
import { Favourite } from "./favourite.entity";
import { Listing } from "../listings/listing.entity";

@Injectable()
export class FavouritesService {
  constructor(
    @InjectRepository(Favourite)
    private readonly favRepo: Repository<Favourite>,
    @InjectRepository(Listing)
    private readonly listingsRepo: Repository<Listing>,
  ) {}

  private ensureClient(user: JwtUser) {
    if (user.role !== "client")
      throw new ForbiddenException("Only clients can favourite");
  }

  async add(listingId: number, user: JwtUser) {
    this.ensureClient(user);
    const clientId = Number(user.sub);

    const listing = await this.listingsRepo.findOne({
      where: { id: listingId },
    });
    if (!listing) throw new NotFoundException("Listing not found");

    const existing = await this.favRepo.findOne({
      where: { clientId, listingId },
    });
    if (existing) return existing; // idempotent

    const fav = this.favRepo.create({ clientId, listingId });
    return this.favRepo.save(fav);
  }

  async remove(listingId: number, user: JwtUser) {
    this.ensureClient(user);
    const clientId = Number(user.sub);

    await this.favRepo.delete({ clientId, listingId });
    return { ok: true };
  }

  async myFavourites(user: JwtUser) {
    this.ensureClient(user);
    const clientId = Number(user.sub);

    const rows = await this.favRepo.find({
      where: { clientId },
      relations: { listing: true },
      order: { createdAt: "DESC" },
    });

    return rows.map((r) => r.listing);
  }
}
