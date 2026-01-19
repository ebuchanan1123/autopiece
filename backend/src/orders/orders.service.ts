import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { JwtUser } from '../auth/types/jwt-user.type';
import { ServicesService } from '../services/services.service';
import { Order } from './order.entity';
import { Payment } from './payment.entity';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(Payment) private readonly paymentRepo: Repository<Payment>,
    private readonly servicesService: ServicesService,
  ) {}

  // Buyer: create a single-service order (Buy Now)
  async createOrder(user: JwtUser, dto: CreateOrderDto) {
    const service = await this.servicesService.findById(dto.serviceId);
    if (!service) throw new NotFoundException('Service not found');

    if (service.status !== 'active') {
      throw new BadRequestException('Service is not active');
    }

    // Fiverr-style: online only
    if (dto.paymentMethod !== 'online') {
      throw new BadRequestException('Only online payments are supported');
    }

    const order = await this.orderRepo.save(
      this.orderRepo.create({
        buyerId: user.sub,
        paymentMethod: 'online',
        status: 'pending_payment',
        totalDzd: service.priceDzd,

        serviceId: service.id,
        freelancerId: service.freelancerId,
        unitPriceDzd: service.priceDzd,
        titleSnapshot: service.title,

        // Fiverr fields
        requirements: dto.requirements ?? null,
        requirementsSubmittedAt: dto.requirements ? new Date() : null,
        // dueAt: you can compute later using package deliveryDays
      }),
    );

    await this.paymentRepo.save(
      this.paymentRepo.create({
        orderId: order.id,
        provider: 'satim',
        status: 'initiated',
        amountDzd: order.totalDzd,
      }),
    );

    return {
      orderId: order.id,
      status: order.status,
      paymentUrl: null,
    };
  }

  async myOrders(user: JwtUser) {
    return this.orderRepo.find({
      where: { buyerId: user.sub },
      order: { createdAt: 'DESC' },
    });
  }

  async freelancerOrders(user: JwtUser) {
    if (user.role !== 'freelancer' && user.role !== 'admin') {
      throw new ForbiddenException();
    }

    return this.orderRepo.find({
      where: user.role === 'admin' ? {} : { freelancerId: user.sub },
      order: { createdAt: 'DESC' },
    });
  }

  async cancelOrder(user: JwtUser, orderId: number) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException();

    if (order.buyerId !== user.sub && user.role !== 'admin') {
      throw new ForbiddenException();
    }

    if (['delivered', 'completed', 'refunded'].includes(order.status)) {
      throw new BadRequestException('Cannot cancel this order');
    }

    order.status = 'cancelled';
    await this.orderRepo.save(order);

    return { ok: true };
  }

  async freelancerUpdateStatus(user: JwtUser, orderId: number, next: string) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException();

    if (user.role !== 'admin' && user.sub !== order.freelancerId) {
      throw new ForbiddenException();
    }

    const allowed: Record<string, string[]> = {
      pending_payment: ['paid', 'cancelled'],
      paid: ['in_progress', 'cancelled', 'refunded'],
      in_progress: ['delivered', 'cancelled'],
      delivered: ['completed', 'revision_requested'],
      revision_requested: ['in_progress', 'cancelled'],
      completed: [],
      cancelled: [],
      refunded: [],
    };

    const current = order.status;
    if (!allowed[current]?.includes(next)) {
      throw new BadRequestException(`Cannot change ${current} -> ${next}`);
    }

    order.status = next as any;
    await this.orderRepo.save(order);

    return { ok: true };
  }

  async getOrder(user: JwtUser, orderId: number) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException();

    const canAccess =
      user.role === 'admin' ||
      order.buyerId === user.sub ||
      order.freelancerId === user.sub;

    if (!canAccess) throw new ForbiddenException();

    return order;
  }
}
