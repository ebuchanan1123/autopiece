import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { JwtUser } from "../auth/types/jwt-user.type";
import { User } from "../users/user.entity";
import { UsersService } from "../users/users.service";
import { SellerProfile } from "../sellers/seller.entity";
import { SellersService } from "../sellers/sellers.service";
import { Listing, type ListingStatus } from "../listings/listing.entity";
import { Order } from "../orders/order.entity";
import { OrderItem } from "../orders/order-item.entity";
import { Payment } from "../orders/payment.entity";
import { AuditService } from "./audit.service";

const LISTING_STATUSES: ListingStatus[] = [
  "active",
  "sold_out",
  "hidden",
  "draft",
  "removed",
];

@UseGuards(JwtAuthGuard)
@Roles("admin")
@Throttle({ default: { limit: 120, ttl: 60_000 } })
@Controller("admin")
export class AdminController {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(SellerProfile)
    private readonly sellerRepo: Repository<SellerProfile>,
    @InjectRepository(Listing)
    private readonly listingRepo: Repository<Listing>,
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    private readonly usersService: UsersService,
    private readonly sellersService: SellersService,
    private readonly audit: AuditService,
  ) {}

  private assertAdmin(user: JwtUser) {
    if (user.role !== "admin") throw new ForbiddenException();
  }

  private getLimit(limit?: string) {
    return Math.min(Math.max(Number(limit) || 100, 1), 250);
  }

  private safePayment(payment: Payment | null) {
    if (!payment) return null;
    return {
      id: payment.id,
      orderId: payment.orderId,
      provider: payment.provider,
      status: payment.status,
      amountDzd: payment.amountDzd,
      providerPaymentId: payment.providerPaymentId,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }

  private safeListing(listing: Listing) {
    return {
      id: listing.id,
      sellerId: listing.sellerId,
      title: listing.title,
      description: listing.description,
      priceDzd: listing.priceDzd,
      originalValueDzd: listing.originalValueDzd,
      quantityAvailable: listing.quantityAvailable,
      pickupStartAt: listing.pickupStartAt,
      pickupEndAt: listing.pickupEndAt,
      category: listing.category,
      wilaya: listing.wilaya,
      city: listing.city,
      status: listing.status,
      imageUrl: listing.imageUrl,
      address: listing.address,
      createdAt: listing.createdAt,
      updatedAt: listing.updatedAt,
    };
  }

  @Get("users")
  async users(
    @CurrentUser() user: JwtUser,
    @Query("q") q?: string,
    @Query("role") role?: string,
    @Query("limit") limit?: string,
  ) {
    this.assertAdmin(user);
    const qb = this.userRepo
      .createQueryBuilder("user")
      .orderBy("user.createdAt", "DESC")
      .take(this.getLimit(limit));

    if (role && role !== "all") qb.andWhere("user.role = :role", { role });
    if (q?.trim()) {
      qb.andWhere(
        "(user.email ILIKE :q OR user.username ILIKE :q OR user.phone ILIKE :q)",
        { q: `%${q.trim()}%` },
      );
    }

    const users = await qb.getMany();
    return { users: users.map((entry) => this.usersService.toSafeUser(entry)) };
  }

  @Get("sellers")
  async sellers(
    @CurrentUser() user: JwtUser,
    @Query("q") q?: string,
    @Query("status") status?: string,
    @Query("limit") limit?: string,
  ) {
    this.assertAdmin(user);
    const qb = this.sellerRepo
      .createQueryBuilder("seller")
      .leftJoinAndSelect("seller.user", "user")
      .orderBy("seller.id", "DESC")
      .take(this.getLimit(limit));

    if (status === "verified") qb.andWhere("seller.isVerified = true");
    if (status === "pending") qb.andWhere("seller.isVerified = false");
    if (q?.trim()) {
      qb.andWhere(
        "(seller.storeName ILIKE :q OR seller.city ILIKE :q OR seller.wilaya ILIKE :q OR seller.phone ILIKE :q OR user.email ILIKE :q)",
        { q: `%${q.trim()}%` },
      );
    }

    const sellers = await qb.getMany();
    return {
      sellers: sellers.map((entry) => ({
        ...this.sellersService.toSafeProfile(entry),
        user: entry.user ? this.usersService.toSafeUser(entry.user) : null,
      })),
    };
  }

  @Patch("sellers/:userId/verification")
  async updateSellerVerification(
    @CurrentUser() user: JwtUser,
    @Param("userId") userId: string,
    @Body() body: { isVerified?: boolean },
  ) {
    this.assertAdmin(user);
    const profile = await this.sellersService.getProfile(Number(userId));
    if (!profile) throw new NotFoundException("Seller profile not found");

    profile.isVerified = Boolean(body.isVerified);
    const saved = await this.sellerRepo.save(profile);
    await this.audit.record({
      actorUserId: Number(user.sub),
      action: "seller.verification.updated",
      entityType: "seller_profile",
      entityId: saved.id,
      metadata: {
        sellerUserId: Number(userId),
        isVerified: saved.isVerified,
      },
    });

    return { seller: this.sellersService.toSafeProfile(saved) };
  }

  @Get("listings")
  async listings(
    @CurrentUser() user: JwtUser,
    @Query("q") q?: string,
    @Query("status") status?: ListingStatus | "all",
    @Query("limit") limit?: string,
  ) {
    this.assertAdmin(user);
    const qb = this.listingRepo
      .createQueryBuilder("listing")
      .orderBy("listing.createdAt", "DESC")
      .take(this.getLimit(limit));

    if (status && status !== "all" && LISTING_STATUSES.includes(status)) {
      qb.andWhere("listing.status = :status", { status });
    }
    if (q?.trim()) {
      qb.andWhere(
        "(listing.title ILIKE :q OR listing.city ILIKE :q OR listing.wilaya ILIKE :q)",
        { q: `%${q.trim()}%` },
      );
    }

    const listings = await qb.getMany();
    return { listings: listings.map((listing) => this.safeListing(listing)) };
  }

  @Patch("listings/:id/status")
  async updateListingStatus(
    @CurrentUser() user: JwtUser,
    @Param("id") id: string,
    @Body() body: { status?: ListingStatus },
  ) {
    this.assertAdmin(user);
    if (!body.status || !LISTING_STATUSES.includes(body.status)) {
      throw new NotFoundException("Listing status not supported");
    }

    const listing = await this.listingRepo.findOne({ where: { id: Number(id) } });
    if (!listing) throw new NotFoundException("Listing not found");

    const previousStatus = listing.status;
    listing.status = body.status;
    const saved = await this.listingRepo.save(listing);
    await this.audit.record({
      actorUserId: Number(user.sub),
      action: "listing.status.updated",
      entityType: "listing",
      entityId: saved.id,
      metadata: { previousStatus, status: saved.status },
    });

    return { listing: this.safeListing(saved) };
  }

  @Get("orders")
  async orders(
    @CurrentUser() user: JwtUser,
    @Query("q") q?: string,
    @Query("status") status?: string,
    @Query("limit") limit?: string,
  ) {
    this.assertAdmin(user);
    const qb = this.orderRepo
      .createQueryBuilder("order")
      .orderBy("order.createdAt", "DESC")
      .take(this.getLimit(limit));

    if (status && status !== "all") {
      qb.andWhere("order.status = :status", { status });
    }
    if (q?.trim()) {
      qb.andWhere(
        "(order.orderNumber ILIKE :q OR order.paymentMethod ILIKE :q)",
        { q: `%${q.trim()}%` },
      );
    }

    const orders = await qb.getMany();
    return { orders };
  }

  @Get("orders/:id")
  async order(@CurrentUser() user: JwtUser, @Param("id") id: string) {
    this.assertAdmin(user);
    const order = await this.orderRepo.findOne({ where: { id: Number(id) } });
    if (!order) throw new NotFoundException("Order not found");
    const payment = await this.paymentRepo.findOne({
      where: { orderId: order.id },
    });
    const customer = await this.userRepo.findOne({
      where: { id: order.customerId },
    });
    const items = await this.orderItemRepo.find({
      where: { orderId: order.id },
      relations: { listing: true },
      order: { createdAt: "ASC" },
    });

    return {
      order,
      customer: customer ? this.usersService.toSafeUser(customer) : null,
      payment: this.safePayment(payment),
      items: items.map((item) => ({
        id: item.id,
        orderId: item.orderId,
        listingId: item.listingId,
        sellerId: item.sellerId,
        quantity: item.quantity,
        unitPriceDzd: item.unitPriceDzd,
        saleNumber: item.saleNumber,
        status: item.status,
        reservedUntil: item.reservedUntil,
        createdAt: item.createdAt,
        listing: item.listing ? this.safeListing(item.listing) : null,
      })),
    };
  }

  @Get("audit")
  async auditLog(@CurrentUser() user: JwtUser, @Query("limit") limit?: string) {
    this.assertAdmin(user);
    return { audit: await this.audit.recent(Number(limit) || 100) };
  }
}
