import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { Reservation } from "./reservation.entity";
import { Listing } from "../listings/listing.entity";
import type { JwtUser } from "../auth/types/jwt-user.type";

@Injectable()
export class ReservationsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Reservation)
    private readonly reservationsRepo: Repository<Reservation>,
    @InjectRepository(Listing)
    private readonly listingsRepo: Repository<Listing>,
  ) {}

  async create(dto: { listingId: number }, user: JwtUser) {
    if (user.role !== "client") {
      throw new ForbiddenException("Only clients can reserve");
    }

    const clientId = Number(user.sub);
    const listingId = Number(dto.listingId);

    return this.dataSource.transaction(async (manager) => {
      // Lock the listing row so "last item" can't be oversold
      const listing = await manager.findOne(Listing, {
        where: { id: listingId },
        lock: { mode: "pessimistic_write" },
      });

      if (!listing) throw new NotFoundException("Listing not found");

      if (listing.status !== "active") {
        throw new BadRequestException("Listing is not available");
      }

      const available = Number(listing.quantityAvailable ?? 0);

      // Sold out path: keep DB consistent, then throw
      if (available < 1) {
        listing.quantityAvailable = 0;
        listing.status = "sold_out";
        await manager.save(Listing, listing);

        throw new BadRequestException("Sold out");
      }

      // Always reserve exactly 1
      listing.quantityAvailable = available - 1;

      if (listing.quantityAvailable <= 0) {
        listing.quantityAvailable = 0;
        listing.status = "sold_out";
      }

      await manager.save(Listing, listing);

      const reservation = manager.create(Reservation, {
        clientId,
        listingId: listing.id,
        quantity: 1,
        status: "pending",
      });

      return manager.save(Reservation, reservation);
    });
  }

  async myReservations(user: JwtUser) {
    if (user.role !== "client") {
      throw new ForbiddenException("Only clients can view reservations");
    }

    const clientId = Number(user.sub);

    return this.reservationsRepo.find({
      where: { clientId },
      relations: { listing: true },
      order: { createdAt: "DESC" },
    });
  }
}
