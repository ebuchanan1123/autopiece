import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditLog } from "./audit-log.entity";
import { AuditService } from "./audit.service";
import { AdminController } from "./admin.controller";
import { User } from "../users/user.entity";
import { SellerProfile } from "../sellers/seller.entity";
import { Listing } from "../listings/listing.entity";
import { Order } from "../orders/order.entity";
import { OrderItem } from "../orders/order-item.entity";
import { Payment } from "../orders/payment.entity";
import { UsersModule } from "../users/users.module";
import { SellersModule } from "../sellers/sellers.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AuditLog,
      User,
      SellerProfile,
      Listing,
      Order,
      OrderItem,
      Payment,
    ]),
    UsersModule,
    SellersModule,
  ],
  controllers: [AdminController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AdminModule {}
