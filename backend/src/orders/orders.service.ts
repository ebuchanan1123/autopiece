import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, In, Repository } from "typeorm";
import type { JwtUser } from "../auth/types/jwt-user.type";
import { ListingsService } from "../listings/listings.service";
import { Order } from "./order.entity";
import { Payment } from "./payment.entity";
import { OrderItem } from "./order-item.entity";
import { ReserveOrderDto } from "./dto/reserve-order.dto";
import { Listing } from "../listings/listing.entity";
import { SellerNotification } from "./seller-notification.entity";
import { SellerProfile } from "../sellers/seller.entity";
import { OrderReview } from "./order-review.entity";
import { CreateOrderReviewDto } from "./dto/create-order-review.dto";
import { PaymentsService } from "../payments/payments.service";

@Injectable()
export class OrdersService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly itemRepo: Repository<OrderItem>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(SellerNotification)
    private readonly sellerNotificationRepo: Repository<SellerNotification>,
    @InjectRepository(SellerProfile)
    private readonly sellerProfileRepo: Repository<SellerProfile>,
    @InjectRepository(OrderReview)
    private readonly orderReviewRepo: Repository<OrderReview>,
    private readonly listingsService: ListingsService,
    private readonly paymentsService: PaymentsService,
  ) {}

  private makeOrderNumber() {
    return `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .slice(2, 7)
      .toUpperCase()}`;
  }

  private makeSaleNumber() {
    return `BAG-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .slice(2, 7)
      .toUpperCase()}`;
  }

  async getOrderDetails(user: JwtUser, orderId: number) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException();

    const isOwner = order.customerId === Number(user.sub);
    const isAdmin = user.role === "admin";
    if (!isOwner && !isAdmin) throw new ForbiddenException();

    const items = await this.itemRepo.find({
      where: { orderId },
      relations: {
        listing: true,
      },
      order: { createdAt: "ASC" },
    });

    const sellerIds = Array.from(
      new Set(items.map((item) => Number(item.sellerId)).filter(Boolean)),
    );
    const sellerProfiles = sellerIds.length
      ? await this.sellerProfileRepo
          .createQueryBuilder("seller")
          .leftJoinAndSelect("seller.user", "user")
          .where("user.id IN (:...sellerIds)", { sellerIds })
          .getMany()
      : [];
    const sellerProfileMap = new Map<number, SellerProfile>();
    for (const profile of sellerProfiles) {
      const userId = Number((profile as any).user?.id);
      if (userId) sellerProfileMap.set(userId, profile);
    }
    const reviews = items.length
      ? await this.orderReviewRepo.find({
          where: { orderItemId: In(items.map((item) => item.id)) },
        })
      : [];
    const reviewMap = new Map<number, OrderReview>();
    for (const review of reviews) {
      reviewMap.set(review.orderItemId, review);
    }

    const payment = await this.paymentRepo.findOne({ where: { orderId } });

    return {
      order,
      payment: payment
        ? {
            provider: payment.provider,
            status: payment.status,
            amountDzd: payment.amountDzd,
            cardLast4: payment.rawPayload?.cardLast4 ?? null,
          }
        : null,
      items: items.map((it) => ({
        id: it.id,
        orderId: it.orderId,
        listingId: it.listingId,
        sellerId: it.sellerId,
        quantity: it.quantity,
        unitPriceDzd: it.unitPriceDzd,
        saleNumber: it.saleNumber,
        status: it.status,
        reservedUntil: it.reservedUntil,
        createdAt: it.createdAt,
        review: reviewMap.has(it.id)
          ? {
              id: reviewMap.get(it.id)!.id,
              overallRating: reviewMap.get(it.id)!.overallRating,
              pickupRating: reviewMap.get(it.id)!.pickupRating,
              qualityRating: reviewMap.get(it.id)!.qualityRating,
              varietyRating: reviewMap.get(it.id)!.varietyRating,
              quantityRating: reviewMap.get(it.id)!.quantityRating,
            }
          : null,
        listing: it.listing
          ? {
              id: it.listing.id,
              title: (it.listing as any).title,
              storeName:
                sellerProfileMap.get(Number(it.sellerId))?.storeName ?? null,
              sellerLogoUrl:
                sellerProfileMap.get(Number(it.sellerId))?.logoUrl ?? null,
              address:
                sellerProfileMap.get(Number(it.sellerId))?.address ??
                (it.listing as any).address ??
                null,
              city: (it.listing as any).city,
              wilaya: (it.listing as any).wilaya,
              priceDzd: (it.listing as any).priceDzd,
              originalValueDzd: (it.listing as any).originalValueDzd,
              ratingAvg: (it.listing as any).ratingAvg,
              ratingCount: (it.listing as any).ratingCount,
              pickupRatingAvg: (it.listing as any).pickupRatingAvg,
              qualityRatingAvg: (it.listing as any).qualityRatingAvg,
              varietyRatingAvg: (it.listing as any).varietyRatingAvg,
              quantityRatingAvg: (it.listing as any).quantityRatingAvg,
            }
          : null,
      })),
    };
  }

  // Customer: reserve one or more bags (creates an Order + OrderItems)
  async reserveOrder(user: JwtUser, dto: ReserveOrderDto) {
    if (!dto.items?.length) throw new BadRequestException("No items");

    const customerId = Number(user.sub);

    return this.dataSource.transaction(async (manager) => {
      const listingIds = dto.items.map((i) => i.listingId);

      // Load listings inside the transaction + lock rows to prevent overselling
      const listings = await manager
        .getRepository(Listing)
        .createQueryBuilder("l")
        .where("l.id IN (:...ids)", { ids: listingIds })
        .setLock("pessimistic_write")
        .getMany();

      if (listings.length !== listingIds.length) {
        throw new NotFoundException("One or more listings not found");
      }

      // Validate stock + status
      let total = 0;
      for (const item of dto.items) {
        const listing = listings.find((l) => l.id === item.listingId)!;

        if (listing.status !== "active") {
          throw new BadRequestException(`Listing ${listing.id} is not active`);
        }

        if (item.quantity > listing.quantityAvailable) {
          throw new BadRequestException(
            `Not enough quantity for listing ${listing.id}`,
          );
        }

        total += listing.priceDzd * item.quantity;
      }

      const isOnline = dto.paymentMethod === "online";
      const orderStatus = isOnline ? "in_progress" : "reserved";
      const itemStatus = isOnline ? "paid" : "reserved";
      const sellerSummaries = new Map<
        number,
        { bagCount: number; listingTitles: string[] }
      >();

      // Create order
      const order = await manager.getRepository(Order).save(
        manager.getRepository(Order).create({
          customerId,
          orderNumber: this.makeOrderNumber(),
          paymentMethod: dto.paymentMethod,
          status: orderStatus,
          totalDzd: total,
        }),
      );

      // Create items + decrement stock
      for (const item of dto.items) {
        const listing = listings.find((l) => l.id === item.listingId)!;

        // decrement stock
        listing.quantityAvailable -= item.quantity;
        if (listing.quantityAvailable <= 0) listing.status = "sold_out";

        // IMPORTANT: save via Listing repository (not listing.constructor)
        await manager.getRepository(Listing).save(listing);

        // create one OrderItem per bag (each has its own saleNumber)
        for (let k = 0; k < item.quantity; k++) {
          await manager.getRepository(OrderItem).save(
            manager.getRepository(OrderItem).create({
              orderId: order.id,
              listingId: listing.id,
              sellerId: listing.sellerId,
              quantity: 1,
              unitPriceDzd: listing.priceDzd,
              saleNumber: this.makeSaleNumber(),
              status: itemStatus,
              reservedUntil: isOnline
                ? null
                : new Date(Date.now() + 30 * 60 * 1000),
            }),
          );
        }

        const summary = sellerSummaries.get(listing.sellerId) ?? {
          bagCount: 0,
          listingTitles: [],
        };
        summary.bagCount += item.quantity;
        summary.listingTitles.push(
          (listing as any).title ?? `Listing ${listing.id}`,
        );
        sellerSummaries.set(listing.sellerId, summary);
      }

      // Route all online checkout through the payment provider abstraction.
      if (isOnline) {
        const paymentAttempt = await this.paymentsService.charge({
          amountDzd: order.totalDzd,
          orderId: order.id,
          orderNumber: order.orderNumber,
          requestedMethod: dto.paymentProvider,
          paymentCardLast4: dto.paymentCardLast4 ?? null,
        });

        await manager.getRepository(Payment).save(
          manager.getRepository(Payment).create({
            orderId: order.id,
            provider: paymentAttempt.provider,
            status: paymentAttempt.status,
            amountDzd: order.totalDzd,
            providerPaymentId: paymentAttempt.providerPaymentId ?? null,
            rawPayload: paymentAttempt.rawPayload ?? null,
          }),
        );
      }

      for (const [sellerId, summary] of sellerSummaries.entries()) {
        const uniqueTitles = Array.from(new Set(summary.listingTitles));
        const title = isOnline ? "New paid reservation" : "New reservation";
        const body = isOnline
          ? `${summary.bagCount} bag(s) were paid for in order ${order.orderNumber}. Prepare ${uniqueTitles.slice(0, 2).join(", ")}.`
          : `${summary.bagCount} bag(s) were reserved in order ${order.orderNumber}.`;

        await manager.getRepository(SellerNotification).save(
          manager.getRepository(SellerNotification).create({
            sellerId,
            orderId: order.id,
            type: isOnline ? "bag_paid" : "bag_reserved",
            title,
            body,
            metadata: {
              orderNumber: order.orderNumber,
              listingTitles: uniqueTitles,
              bagCount: summary.bagCount,
            },
            readAt: null,
          }),
        );
      }

      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        totalDzd: order.totalDzd,
      };
    });
  }

  async myOrders(user: JwtUser) {
    return this.orderRepo.find({
      where: { customerId: Number(user.sub) },
      order: { createdAt: "DESC" },
    });
  }
  async myOrderItems(user: JwtUser) {
    const customerId = Number(user.sub);

    return this.itemRepo.find({
      where: { order: { customerId } },
      relations: { listing: true, order: true },
      order: { createdAt: "DESC" },
    });
  }

  // Seller: see orders that contain items for them
  async sellerOrders(user: JwtUser) {
    if (user.role !== "seller" && user.role !== "admin") {
      throw new ForbiddenException();
    }

    const sellerId = Number(user.sub);

    return this.itemRepo.find({
      where: user.role === "admin" ? {} : { sellerId },
      relations: {
        listing: true,
        order: true,
      },
      order: { createdAt: "DESC" },
    });
  }

  async cancelOrder(user: JwtUser, orderId: number) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException();

    const isOwner = order.customerId === Number(user.sub);
    if (!isOwner && user.role !== "admin") throw new ForbiddenException();

    if (
      order.status === "paid" ||
      order.status === "in_progress" ||
      order.status === "picked_up"
    ) {
      throw new BadRequestException(
        "Cannot cancel an order that has already been processed",
      );
    }
    if (order.status === "cancelled") return { ok: true };

    return this.dataSource.transaction(async (manager) => {
      const items = await manager.getRepository(OrderItem).find({
        where: { orderId },
      });

      // release stock back
      for (const it of items) {
        if (it.status !== "reserved") continue;

        const listing = await manager.getRepository(Listing).findOne({
          where: { id: it.listingId },
        });
        if (listing) {
          listing.quantityAvailable += 1;
          if (listing.status === "sold_out" && listing.quantityAvailable > 0) {
            listing.status = "active";
          }
          await manager.getRepository(Listing).save(listing);
        }

        it.status = "cancelled";
        await manager.getRepository(OrderItem).save(it);
      }

      order.status = "cancelled";
      await manager.getRepository(Order).save(order);

      return { ok: true };
    });
  }
  async markItemPickedUp(user: JwtUser, itemId: number) {
    if (user.role !== "seller" && user.role !== "admin") {
      throw new ForbiddenException();
    }

    const item = await this.itemRepo.findOne({ where: { id: itemId } });
    if (!item) throw new NotFoundException();

    if (user.role !== "admin" && item.sellerId !== Number(user.sub)) {
      throw new ForbiddenException();
    }

    if (item.status !== "reserved" && item.status !== "paid") {
      throw new BadRequestException("Item is not reservable/pickup-ready");
    }

    item.status = "picked_up";
    await this.itemRepo.save(item);

    const items = await this.itemRepo.find({
      where: { orderId: item.orderId },
    });
    const order = await this.orderRepo.findOne({ where: { id: item.orderId } });
    if (order) {
      const allPickedUp = items.every((entry) =>
        entry.id === item.id ? true : entry.status === "picked_up",
      );
      order.status = allPickedUp ? "picked_up" : "in_progress";
      await this.orderRepo.save(order);
    }

    return { ok: true };
  }

  async submitItemReview(
    user: JwtUser,
    itemId: number,
    dto: CreateOrderReviewDto,
  ) {
    const item = await this.itemRepo.findOne({
      where: { id: itemId },
      relations: { order: true, listing: true },
    });
    if (!item) throw new NotFoundException();

    if (item.order.customerId !== Number(user.sub) && user.role !== "admin") {
      throw new ForbiddenException();
    }

    if (item.status !== "picked_up") {
      throw new BadRequestException("Only picked up bags can be reviewed");
    }

    const existing = await this.orderReviewRepo.findOne({
      where: { orderItemId: itemId },
    });
    if (existing) {
      throw new BadRequestException("This bag has already been reviewed");
    }

    await this.orderReviewRepo.save(
      this.orderReviewRepo.create({
        orderItemId: item.id,
        orderId: item.orderId,
        listingId: item.listingId,
        customerId: item.order.customerId,
        overallRating: dto.overallRating,
        pickupRating: dto.pickupRating,
        qualityRating: dto.qualityRating,
        varietyRating: dto.varietyRating,
        quantityRating: dto.quantityRating,
      }),
    );

    const allReviews = await this.orderReviewRepo.find({
      where: { listingId: item.listingId },
    });
    const count = allReviews.length;
    const avg = (values: number[]) =>
      count
        ? Number(
            (values.reduce((sum, value) => sum + value, 0) / count).toFixed(1),
          )
        : 0;

    const listing = await this.listingsService.findById(item.listingId);
    if (listing) {
      listing.ratingCount = count;
      listing.ratingAvg = avg(allReviews.map((review) => review.overallRating));
      (listing as any).pickupRatingAvg = avg(
        allReviews.map((review) => review.pickupRating),
      );
      (listing as any).qualityRatingAvg = avg(
        allReviews.map((review) => review.qualityRating),
      );
      (listing as any).varietyRatingAvg = avg(
        allReviews.map((review) => review.varietyRating),
      );
      (listing as any).quantityRatingAvg = avg(
        allReviews.map((review) => review.quantityRating),
      );
      await this.dataSource.getRepository(Listing).save(listing);
    }

    return { ok: true };
  }
}
