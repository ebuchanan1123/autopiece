import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, EntityManager, In, Repository } from "typeorm";
import { createHash, createHmac, timingSafeEqual } from "crypto";
import type { JwtUser } from "../auth/types/jwt-user.type";
import { ListingsService } from "../listings/listings.service";
import { Order } from "./order.entity";
import { Payment, PaymentProvider } from "./payment.entity";
import { OrderItem } from "./order-item.entity";
import { ReserveOrderDto } from "./dto/reserve-order.dto";
import { Listing } from "../listings/listing.entity";
import { SellerNotification } from "./seller-notification.entity";
import { SellerProfile } from "../sellers/seller.entity";
import { OrderReview } from "./order-review.entity";
import { CreateOrderReviewDto } from "./dto/create-order-review.dto";
import { PaymentsService } from "../payments/payments.service";
import { UsersService } from "../users/users.service";
import {
  PaymentWebhookEvent,
  PaymentWebhookEventStatus,
} from "../payments/payment-webhook-event.entity";

type PaymentCallbackOutcome = "success" | "failed" | "pending" | "unknown";

type NormalizedPaymentCallback = {
  providerEventId: string;
  providerPaymentId: string | null;
  orderId: number | null;
  orderNumber: string | null;
  eventType: string;
  outcome: PaymentCallbackOutcome;
};

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
    @InjectRepository(PaymentWebhookEvent)
    private readonly paymentWebhookEventRepo: Repository<PaymentWebhookEvent>,
    private readonly listingsService: ListingsService,
    private readonly paymentsService: PaymentsService,
    private readonly usersService: UsersService,
    private readonly config: ConfigService,
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

  private makePickupPin() {
    return String(Math.floor(1000 + Math.random() * 9000));
  }

  private getHoldUntil(isOnline: boolean) {
    return new Date(Date.now() + (isOnline ? 15 : 30) * 60 * 1000);
  }

  private async markOnlineOrderPaid(manager: EntityManager, order: Order) {
    order.status = "in_progress";
    await manager.getRepository(Order).save(order);

    await manager
      .getRepository(OrderItem)
      .update(
        { orderId: order.id, status: "payment_pending" },
        { status: "paid", reservedUntil: null },
      );
  }

  private async notifySellers(
    manager: EntityManager,
    order: Order,
    sellerSummaries: Map<number, { bagCount: number; listingTitles: string[] }>,
    isPaid: boolean,
  ) {
    for (const [sellerId, summary] of sellerSummaries.entries()) {
      const uniqueTitles = Array.from(new Set(summary.listingTitles));
      const title = isPaid ? "New paid reservation" : "New reservation";
      const body = isPaid
        ? `${summary.bagCount} bag(s) were paid for in order ${order.orderNumber}. Prepare ${uniqueTitles.slice(0, 2).join(", ")}.`
        : `${summary.bagCount} bag(s) were reserved in order ${order.orderNumber}.`;

      await manager.getRepository(SellerNotification).save(
        manager.getRepository(SellerNotification).create({
          sellerId,
          orderId: order.id,
          type: isPaid ? "bag_paid" : "bag_reserved",
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
  }

  private async releaseOrderItems(
    manager: EntityManager,
    orderId: number,
    fromStatuses: string[],
    nextStatus: "cancelled" | "expired" | "payment_failed",
  ) {
    const items = await manager.getRepository(OrderItem).find({
      where: { orderId },
    });

    for (const item of items) {
      if (!fromStatuses.includes(item.status)) continue;

      const listing = await manager.getRepository(Listing).findOne({
        where: { id: item.listingId },
      });
      if (listing) {
        listing.quantityAvailable += Number(item.quantity ?? 1);
        if (listing.status === "sold_out" && listing.quantityAvailable > 0) {
          listing.status = "active";
        }
        await manager.getRepository(Listing).save(listing);
      }

      item.status = nextStatus;
      item.reservedUntil = null;
      await manager.getRepository(OrderItem).save(item);
    }
  }

  private stablePayload(payload: Record<string, unknown>) {
    const normalize = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map((entry) => normalize(entry));
      if (value && typeof value === "object") {
        return Object.keys(value as Record<string, unknown>)
          .sort()
          .reduce<Record<string, unknown>>((acc, key) => {
            acc[key] = normalize((value as Record<string, unknown>)[key]);
            return acc;
          }, {});
      }
      return value;
    };

    return JSON.stringify(normalize(payload));
  }

  private hashPayload(payload: Record<string, unknown>) {
    return createHash("sha256")
      .update(this.stablePayload(payload))
      .digest("hex");
  }

  private readHeader(
    headers: Record<string, string | string[] | undefined>,
    name: string,
  ) {
    const value =
      headers[name] ??
      headers[name.toLowerCase()] ??
      headers[name.toUpperCase()];
    return Array.isArray(value) ? value[0] : value;
  }

  private constantTimeEquals(a: string, b: string) {
    const left = Buffer.from(a);
    const right = Buffer.from(b);
    return left.length === right.length && timingSafeEqual(left, right);
  }

  private verifyPaymentCallbackSignature(
    provider: PaymentProvider,
    payload: Record<string, unknown>,
    headers: Record<string, string | string[] | undefined>,
  ) {
    if (provider !== "satim") return false;

    const secret = this.config.get<string>("SATIM_CALLBACK_SECRET");
    const isProd = this.config.get<string>("NODE_ENV") === "production";

    // Until SATIM's exact signing spec is supplied, development accepts unsigned
    // callbacks so we can test idempotency and state transitions locally.
    if (!secret) return !isProd;

    const signature =
      this.readHeader(headers, "x-satim-signature") ??
      this.readHeader(headers, "x-payment-signature") ??
      this.readHeader(headers, "x-signature");

    if (!signature) return false;

    const expected = createHmac("sha256", secret)
      .update(this.stablePayload(payload))
      .digest("hex");

    return this.constantTimeEquals(signature.trim(), expected);
  }

  private asString(value: unknown) {
    if (typeof value === "string") return value.trim() || null;
    if (typeof value === "number") return String(value);
    return null;
  }

  private asNumber(value: unknown) {
    if (typeof value === "number" && Number.isInteger(value)) return value;
    if (typeof value === "string" && /^\d+$/.test(value.trim())) {
      return Number(value.trim());
    }
    return null;
  }

  private normalizePaymentCallback(
    payload: Record<string, unknown>,
  ): NormalizedPaymentCallback {
    const providerEventId =
      this.asString(payload.eventId) ??
      this.asString(payload.event_id) ??
      this.asString(payload.notificationId) ??
      this.asString(payload.transactionId) ??
      this.asString(payload.paymentId) ??
      `payload_${this.hashPayload(payload)}`;

    const providerPaymentId =
      this.asString(payload.providerPaymentId) ??
      this.asString(payload.paymentId) ??
      this.asString(payload.transactionId) ??
      this.asString(payload.orderNumber);

    const orderNumber =
      this.asString(payload.orderNumber) ??
      this.asString(payload.order_number) ??
      this.asString(payload.orderId);

    const status =
      this.asString(payload.status)?.toLowerCase() ??
      this.asString(payload.paymentStatus)?.toLowerCase() ??
      this.asString(payload.result)?.toLowerCase() ??
      this.asString(payload.responseCode)?.toLowerCase() ??
      "";

    const outcome: PaymentCallbackOutcome = [
      "success",
      "successful",
      "paid",
      "approved",
      "confirmed",
      "00",
    ].includes(status)
      ? "success"
      : [
            "failed",
            "failure",
            "declined",
            "cancelled",
            "canceled",
            "rejected",
          ].includes(status)
        ? "failed"
        : ["pending", "initiated", "processing"].includes(status)
          ? "pending"
          : "unknown";

    return {
      providerEventId,
      providerPaymentId,
      orderId: this.asNumber(payload.internalOrderId ?? payload.appOrderId),
      orderNumber,
      eventType: this.asString(payload.type) ?? `payment.${outcome}`,
      outcome,
    };
  }

  private async buildSellerSummaries(manager: EntityManager, orderId: number) {
    const items = await manager.getRepository(OrderItem).find({
      where: { orderId },
      relations: { listing: true },
    });
    const summaries = new Map<
      number,
      { bagCount: number; listingTitles: string[] }
    >();

    for (const item of items) {
      const summary = summaries.get(item.sellerId) ?? {
        bagCount: 0,
        listingTitles: [],
      };
      summary.bagCount += Number(item.quantity ?? 1);
      summary.listingTitles.push(
        item.listing?.title ?? `Listing ${item.listingId}`,
      );
      summaries.set(item.sellerId, summary);
    }

    return summaries;
  }

  private async resolvePaymentForCallback(
    manager: EntityManager,
    normalized: NormalizedPaymentCallback,
  ) {
    const paymentRepo = manager.getRepository(Payment);
    const orderRepo = manager.getRepository(Order);

    let payment = normalized.providerPaymentId
      ? await paymentRepo.findOne({
          where: { providerPaymentId: normalized.providerPaymentId },
        })
      : null;

    let order = normalized.orderId
      ? await orderRepo.findOne({ where: { id: normalized.orderId } })
      : null;

    if (!order && normalized.orderNumber) {
      order = await orderRepo.findOne({
        where: { orderNumber: normalized.orderNumber },
      });
    }

    if (!payment && order) {
      payment = await paymentRepo.findOne({ where: { orderId: order.id } });
    }

    if (!order && payment) {
      order = await orderRepo.findOne({ where: { id: payment.orderId } });
    }

    return { payment, order };
  }

  async handlePaymentProviderCallback(
    provider: PaymentProvider,
    payload: Record<string, unknown>,
    headers: Record<string, string | string[] | undefined>,
  ) {
    const verified = this.verifyPaymentCallbackSignature(
      provider,
      payload,
      headers,
    );
    const normalized = this.normalizePaymentCallback(payload);
    const payloadHash = this.hashPayload(payload);

    if (!verified) {
      return {
        ok: false,
        verified,
        duplicate: false,
        processed: false,
      };
    }

    return this.dataSource.transaction(async (manager) => {
      const eventRepo = manager.getRepository(PaymentWebhookEvent);
      const existing = await eventRepo.findOne({
        where: {
          provider,
          providerEventId: normalized.providerEventId,
        },
      });

      if (existing) {
        if (existing.payloadHash !== payloadHash) {
          throw new ConflictException("Conflicting duplicate payment event");
        }

        return {
          ok: true,
          verified,
          duplicate: true,
          processed: existing.status === "processed",
          eventStatus: existing.status,
        };
      }

      const event = await eventRepo.save(
        eventRepo.create({
          provider,
          providerEventId: normalized.providerEventId,
          providerPaymentId: normalized.providerPaymentId,
          orderId: normalized.orderId,
          eventType: normalized.eventType,
          status: "received",
          payloadHash,
          payload,
          error: null,
          processedAt: null,
        }),
      );

      const { payment, order } = await this.resolvePaymentForCallback(
        manager,
        normalized,
      );

      if (!payment || !order) {
        event.status = "failed";
        event.error = "No matching local payment/order";
        event.processedAt = new Date();
        await eventRepo.save(event);
        return {
          ok: true,
          verified,
          duplicate: false,
          processed: false,
          eventStatus: event.status,
        };
      }

      event.orderId = order.id;
      event.providerPaymentId =
        payment.providerPaymentId ?? normalized.providerPaymentId;

      if (!payment.providerPaymentId && normalized.providerPaymentId) {
        payment.providerPaymentId = normalized.providerPaymentId;
      }

      const finalStatuses: PaymentWebhookEventStatus[] = [
        "processed",
        "ignored",
      ];
      const wasAlreadySuccessful = payment.status === "success";

      if (normalized.outcome === "success") {
        payment.status = "success";
        payment.rawPayload = {
          ...(payment.rawPayload ?? {}),
          callback: payload,
          callbackReceivedAt: new Date().toISOString(),
        };
        await manager.getRepository(Payment).save(payment);

        if (!wasAlreadySuccessful) {
          await this.markOnlineOrderPaid(manager, order);
          const sellerSummaries = await this.buildSellerSummaries(
            manager,
            order.id,
          );
          await this.notifySellers(manager, order, sellerSummaries, true);
        }

        event.status = "processed";
      } else if (normalized.outcome === "failed") {
        payment.status = "failed";
        payment.rawPayload = {
          ...(payment.rawPayload ?? {}),
          callback: payload,
          callbackReceivedAt: new Date().toISOString(),
        };
        await manager.getRepository(Payment).save(payment);

        if (order.status === "payment_pending") {
          order.status = "payment_failed";
          await manager.getRepository(Order).save(order);
          await this.releaseOrderItems(
            manager,
            order.id,
            ["payment_pending"],
            "payment_failed",
          );
        }

        event.status = "processed";
      } else {
        event.status = "ignored";
        event.error = `Unhandled payment outcome: ${normalized.outcome}`;
      }

      event.processedAt = finalStatuses.includes(event.status)
        ? new Date()
        : null;
      await eventRepo.save(event);

      return {
        ok: true,
        verified,
        duplicate: false,
        processed: event.status === "processed",
        eventStatus: event.status,
        orderId: order.id,
        paymentStatus: payment.status,
      };
    });
  }

  private async expireStaleReservations() {
    const now = new Date();

    await this.dataSource.transaction(async (manager) => {
      const expiredItems = await manager
        .getRepository(OrderItem)
        .createQueryBuilder("item")
        .where("item.status IN (:...statuses)", {
          statuses: ["reserved", "payment_pending"],
        })
        .andWhere("item.reservedUntil IS NOT NULL")
        .andWhere("item.reservedUntil < :now", { now: now.toISOString() })
        .setLock("pessimistic_write")
        .getMany();

      if (!expiredItems.length) return;

      for (const item of expiredItems) {
        item.status = "expired";
        await manager.getRepository(OrderItem).save(item);

        const listing = await manager
          .getRepository(Listing)
          .createQueryBuilder("listing")
          .where("listing.id = :id", { id: item.listingId })
          .setLock("pessimistic_write")
          .getOne();

        if (listing) {
          listing.quantityAvailable += Number(item.quantity ?? 1);
          if (listing.status === "sold_out" && listing.quantityAvailable > 0) {
            listing.status = "active";
          }
          await manager.getRepository(Listing).save(listing);
        }
      }

      const orderIds = Array.from(
        new Set(expiredItems.map((item) => item.orderId)),
      );
      for (const orderId of orderIds) {
        const items = await manager
          .getRepository(OrderItem)
          .find({ where: { orderId } });
        const order = await manager
          .getRepository(Order)
          .findOne({ where: { id: orderId } });
        if (!order) continue;

        const hasActiveReserved = items.some(
          (item) => item.status === "reserved",
        );
        const hasActivePending = items.some(
          (item) => item.status === "payment_pending",
        );
        const allExpiredOrCancelled = items.every(
          (item) => item.status === "expired" || item.status === "cancelled",
        );

        if (!hasActiveReserved && !hasActivePending && allExpiredOrCancelled) {
          order.status = "expired";
          await manager.getRepository(Order).save(order);

          await manager.getRepository(Payment).update(
            { orderId, status: "initiated" },
            {
              status: "failed",
              rawPayload: {
                reason: "payment_hold_expired",
                expiredAt: now.toISOString(),
              } as any,
            },
          );
        }
      }
    });
  }

  async getOrderDetails(user: JwtUser, orderId: number) {
    await this.expireStaleReservations();

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
              pickupStartAt: (it.listing as any).pickupStartAt ?? null,
              pickupEndAt: (it.listing as any).pickupEndAt ?? null,
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
      pickupPin: order.pickupPin,
    };
  }

  // Customer: reserve one or more bags (creates an Order + OrderItems)
  async reserveOrder(user: JwtUser, dto: ReserveOrderDto) {
    await this.expireStaleReservations();

    if (!dto.items?.length) throw new BadRequestException("No items");

    const customerId = Number(user.sub);

    const result = await this.dataSource.transaction(async (manager) => {
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
      const orderStatus = isOnline ? "payment_pending" : "reserved";
      const itemStatus = isOnline ? "payment_pending" : "reserved";
      const reservedUntil = this.getHoldUntil(isOnline);
      const sellerSummaries = new Map<
        number,
        { bagCount: number; listingTitles: string[] }
      >();
      let paymentStatus: string | null = null;
      let checkoutUrl: string | null = null;

      // Create order
      const order = await manager.getRepository(Order).save(
        manager.getRepository(Order).create({
          customerId,
          orderNumber: this.makeOrderNumber(),
          paymentMethod: dto.paymentMethod,
          status: orderStatus,
          totalDzd: total,
          pickupPin: this.makePickupPin(),
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
              reservedUntil,
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
        paymentStatus = paymentAttempt.status;
        checkoutUrl = paymentAttempt.checkoutUrl ?? null;

        await manager.getRepository(Payment).save(
          manager.getRepository(Payment).create({
            orderId: order.id,
            provider: paymentAttempt.provider,
            status: paymentAttempt.status,
            amountDzd: order.totalDzd,
            providerPaymentId: paymentAttempt.providerPaymentId ?? null,
            rawPayload: {
              ...(paymentAttempt.rawPayload ?? {}),
              checkoutUrl: paymentAttempt.checkoutUrl ?? null,
            },
          }),
        );

        if (paymentAttempt.status === "success") {
          await this.markOnlineOrderPaid(manager, order);
          await this.notifySellers(manager, order, sellerSummaries, true);
        } else if (paymentAttempt.status === "failed") {
          order.status = "payment_failed";
          await manager.getRepository(Order).save(order);
          await this.releaseOrderItems(
            manager,
            order.id,
            ["payment_pending"],
            "payment_failed",
          );
        }
      } else {
        await this.notifySellers(manager, order, sellerSummaries, false);
      }

      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        totalDzd: order.totalDzd,
        pickupPin: order.pickupPin,
        paymentStatus,
        checkoutUrl,
        sellerSummaries: Array.from(sellerSummaries.entries()).map(
          ([sellerId, summary]) => ({
            sellerId,
            bagCount: summary.bagCount,
            listingTitles: Array.from(new Set(summary.listingTitles)),
          }),
        ),
        customerId,
      };
    });

    const isConfirmed =
      result.status === "reserved" || result.status === "in_progress";

    if (isConfirmed) {
      await this.usersService.sendPushToUsers(
        result.sellerSummaries.map((entry) => Number(entry.sellerId)),
        {
          title: "New reservation",
          body: `Order ${result.orderNumber} is ready to review in your seller dashboard.`,
          data: {
            pathname: "/(app)/seller-dashboard",
            orderId: result.orderId,
            orderNumber: result.orderNumber,
          },
        },
      );

      await this.usersService.sendPushToUsers([result.customerId], {
        title: "Reservation confirmed",
        body: `Your order ${result.orderNumber} is confirmed. Show your pickup PIN at collection.`,
        data: {
          pathname: "/(app)/order/[id]",
          id: String(result.orderId),
        },
      });
    }

    return {
      orderId: result.orderId,
      orderNumber: result.orderNumber,
      status: result.status,
      totalDzd: result.totalDzd,
      pickupPin: result.pickupPin,
      paymentStatus: result.paymentStatus,
      checkoutUrl: result.checkoutUrl,
    };
  }

  async myOrders(user: JwtUser) {
    await this.expireStaleReservations();

    return this.orderRepo.find({
      where: { customerId: Number(user.sub) },
      order: { createdAt: "DESC" },
    });
  }
  async myOrderItems(user: JwtUser) {
    await this.expireStaleReservations();

    const customerId = Number(user.sub);

    return this.itemRepo.find({
      where: { order: { customerId } },
      relations: { listing: true, order: true },
      order: { createdAt: "DESC" },
    });
  }

  // Seller: see orders that contain items for them
  async sellerOrders(user: JwtUser) {
    await this.expireStaleReservations();

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

  async sellerNotifications(user: JwtUser) {
    if (user.role !== "seller" && user.role !== "admin") {
      throw new ForbiddenException();
    }

    const sellerId = Number(user.sub);
    const notifications = await this.sellerNotificationRepo.find({
      where: user.role === "admin" ? {} : { sellerId },
      order: { createdAt: "DESC" },
      take: 50,
    });

    return notifications.map((entry) => ({
      id: entry.id,
      orderId: entry.orderId,
      type: entry.type,
      title: entry.title,
      body: entry.body,
      metadata: entry.metadata,
      readAt: entry.readAt,
      createdAt: entry.createdAt,
    }));
  }

  async markSellerNotificationRead(user: JwtUser, notificationId: number) {
    if (user.role !== "seller" && user.role !== "admin") {
      throw new ForbiddenException();
    }

    const notification = await this.sellerNotificationRepo.findOne({
      where: { id: notificationId },
    });
    if (!notification) throw new NotFoundException();

    if (user.role !== "admin" && notification.sellerId !== Number(user.sub)) {
      throw new ForbiddenException();
    }

    if (!notification.readAt) {
      notification.readAt = new Date();
      await this.sellerNotificationRepo.save(notification);
    }

    return { ok: true };
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
    if (order.status === "cancelled" || order.status === "expired")
      return { ok: true };

    return this.dataSource.transaction(async (manager) => {
      await this.releaseOrderItems(
        manager,
        orderId,
        ["reserved", "payment_pending"],
        "cancelled",
      );

      order.status = "cancelled";
      await manager.getRepository(Order).save(order);

      return { ok: true };
    });
  }
  async markItemPickedUp(user: JwtUser, itemId: number, pickupPin?: string) {
    if (user.role !== "seller" && user.role !== "admin") {
      throw new ForbiddenException();
    }

    const item = await this.itemRepo.findOne({
      where: { id: itemId },
      relations: { order: true },
    });
    if (!item) throw new NotFoundException();

    if (user.role !== "admin" && item.sellerId !== Number(user.sub)) {
      throw new ForbiddenException();
    }

    if (item.status !== "reserved" && item.status !== "paid") {
      throw new BadRequestException("Item is not reservable/pickup-ready");
    }

    if (user.role !== "admin") {
      const normalizedPin = pickupPin?.trim();
      if (!normalizedPin) {
        throw new BadRequestException("Pickup PIN is required");
      }
      if (normalizedPin !== item.order?.pickupPin) {
        throw new BadRequestException("Incorrect pickup PIN");
      }
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

      await this.usersService.sendPushToUsers([Number(order.customerId)], {
        title: "Bag picked up",
        body: `Order ${order.orderNumber} has been marked as collected.`,
        data: {
          pathname: "/(app)/order/[id]",
          id: String(order.id),
        },
      });
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
