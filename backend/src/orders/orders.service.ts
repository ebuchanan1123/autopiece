import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type { JwtUser } from '../auth/types/jwt-user.type';
import { ListingsService } from '../listings/listings.service';
import { Order } from './order.entity';
import { Payment } from './payment.entity';
import { OrderItem } from './order-item.entity';
import { ReserveOrderDto } from './dto/reserve-order.dto';
import { Listing } from '../listings/listing.entity';


@Injectable()
export class OrdersService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem) private readonly itemRepo: Repository<OrderItem>,
    @InjectRepository(Payment) private readonly paymentRepo: Repository<Payment>,
    private readonly listingsService: ListingsService,
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

  // Customer: reserve one or more bags (creates an Order + OrderItems)
  async reserveOrder(user: JwtUser, dto: ReserveOrderDto) {
    if (!dto.items?.length) throw new BadRequestException('No items');

    const customerId = Number(user.sub);

    return this.dataSource.transaction(async (manager) => {
      // Load all listings
      const listingIds = dto.items.map((i) => i.listingId);
      const listings = await this.listingsService.findByIds(listingIds);

      if (listings.length !== listingIds.length) {
        throw new NotFoundException('One or more listings not found');
      }

      // Validate stock + status
      let total = 0;
      for (const item of dto.items) {
        const listing = listings.find((l) => l.id === item.listingId)!;

        if (listing.status !== 'active') {
          throw new BadRequestException(`Listing ${listing.id} is not active`);
        }

        if (item.quantity > listing.quantityAvailable) {
          throw new BadRequestException(
            `Not enough quantity for listing ${listing.id}`,
          );
        }

        total += listing.priceDzd * item.quantity;
      }

      // Create order
      const order = await manager.getRepository(Order).save(
        manager.getRepository(Order).create({
          customerId,
          orderNumber: this.makeOrderNumber(),
          paymentMethod: dto.paymentMethod,
          status: 'reserved',
          totalDzd: total,
        }),
      );

      // Create items + decrement stock
      for (const item of dto.items) {
        const listing = listings.find((l) => l.id === item.listingId)!;

        // decrement stock
        listing.quantityAvailable -= item.quantity;
        if (listing.quantityAvailable <= 0) listing.status = 'sold_out';
        await manager.getRepository(listing.constructor as any).save(listing);

        // create one OrderItem per bag (so each has its own saleNumber)
        for (let k = 0; k < item.quantity; k++) {
          await manager.getRepository(OrderItem).save(
            manager.getRepository(OrderItem).create({
              orderId: order.id,
              listingId: listing.id,
              sellerId: listing.sellerId,
              quantity: 1,
              unitPriceDzd: listing.priceDzd,
              saleNumber: this.makeSaleNumber(),
              status: 'reserved',
              reservedUntil: new Date(Date.now() + 30 * 60 * 1000), // hold 30 minutes
            }),
          );
        }
      }

      // If online, create a payment intent record (you can later plug SATIM)
      if (dto.paymentMethod === 'online') {
        await manager.getRepository(Payment).save(
          manager.getRepository(Payment).create({
            orderId: order.id,
            provider: 'satim',
            status: 'initiated',
            amountDzd: order.totalDzd,
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
      order: { createdAt: 'DESC' },
    });
  }

  // Seller: see orders that contain items for them
  async sellerOrders(user: JwtUser) {
    if (user.role !== 'seller' && user.role !== 'admin') {
      throw new ForbiddenException();
    }

    const sellerId = Number(user.sub);

    return this.itemRepo.find({
      where: user.role === 'admin' ? {} : { sellerId },
      order: { createdAt: 'DESC' },
    });
  }

  async cancelOrder(user: JwtUser, orderId: number) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException();

    const isOwner = order.customerId === Number(user.sub);
    if (!isOwner && user.role !== 'admin') throw new ForbiddenException();

    if (order.status === 'paid') {
      throw new BadRequestException('Cannot cancel a paid order (MVP rule)');
    }
    if (order.status === 'cancelled') return { ok: true };

    return this.dataSource.transaction(async (manager) => {
      const items = await manager.getRepository(OrderItem).find({
        where: { orderId },
      });

      // release stock back
      for (const it of items) {
        if (it.status !== 'reserved') continue;

        const listing = await manager.getRepository(Listing).findOne({
          where: { id: it.listingId },
        });
        if (listing) {
          listing.quantityAvailable += 1;
          if (listing.status === 'sold_out' && listing.quantityAvailable > 0) {
            listing.status = 'active';
          }
          await manager.getRepository(Listing).save(listing);
        }

        it.status = 'cancelled';
        await manager.getRepository(OrderItem).save(it);
      }

      order.status = 'cancelled';
      await manager.getRepository(Order).save(order);

      return { ok: true };
    });
  }
  async markItemPickedUp(user: JwtUser, itemId: number) {
    if (user.role !== 'seller' && user.role !== 'admin') {
      throw new ForbiddenException();
    }

    const item = await this.itemRepo.findOne({ where: { id: itemId } });
    if (!item) throw new NotFoundException();

    if (user.role !== 'admin' && item.sellerId !== Number(user.sub)) {
      throw new ForbiddenException();
    }

    if (item.status !== 'reserved' && item.status !== 'paid') {
      throw new BadRequestException('Item is not reservable/pickup-ready');
    }

    item.status = 'picked_up';
    await this.itemRepo.save(item);

    return { ok: true };
  }
}
