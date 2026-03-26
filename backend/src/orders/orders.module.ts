import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ListingModule } from "../listings/listing.module";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { Order } from "./order.entity";
import { Payment } from "./payment.entity";
import { OrderItem } from "./order-item.entity";
import { SellerNotification } from "./seller-notification.entity";
import { SellerProfile } from "../sellers/seller.entity";
import { OrderReview } from "./order-review.entity";
import { PaymentsModule } from "../payments/payments.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      Payment,
      OrderItem,
      SellerNotification,
      SellerProfile,
      OrderReview,
    ]),
    ListingModule,
    PaymentsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
