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
import { PaymentWebhookEvent } from "../payments/payment-webhook-event.entity";
import { PaymentsModule } from "../payments/payments.module";
import { UsersModule } from "../users/users.module";
import { PaymentCallbacksController } from "./payment-callbacks.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      Payment,
      OrderItem,
      SellerNotification,
      SellerProfile,
      OrderReview,
      PaymentWebhookEvent,
    ]),
    ListingModule,
    PaymentsModule,
    UsersModule,
  ],
  controllers: [OrdersController, PaymentCallbacksController],
  providers: [OrdersService],
})
export class OrdersModule {}
