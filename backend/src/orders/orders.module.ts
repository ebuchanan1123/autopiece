import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ListingModule } from '../listings/listing.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order } from './order.entity';
import { Payment } from './payment.entity';
import { OrderItem } from './order-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, Payment, OrderItem]),
    ListingModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
