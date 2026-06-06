import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { JwtUser } from "../auth/types/jwt-user.type";
import { OrdersService } from "./orders.service";
import { ReserveOrderDto } from "./dto/reserve-order.dto";
import { CreateOrderReviewDto } from "./dto/create-order-review.dto";
import { ConfirmPickupDto } from "./dto/confirm-pickup.dto";

@UseGuards(JwtAuthGuard)
@Controller("orders")
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  // customer reserves one or more bags
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post("reserve")
  reserve(@CurrentUser() user: JwtUser, @Body() dto: ReserveOrderDto) {
    return this.orders.reserveOrder(user, dto);
  }

  @Get("me/items")
  myOrderItems(@CurrentUser() user: JwtUser) {
    return this.orders.myOrderItems(user);
  }

  // customer orders list
  @Get("me")
  myOrders(@CurrentUser() user: JwtUser) {
    return this.orders.myOrders(user);
  }

  // seller view: order items reserved/paid for this seller
  @Get("seller")
  sellerOrders(@CurrentUser() user: JwtUser) {
    return this.orders.sellerOrders(user);
  }

  @Get("seller/notifications")
  sellerNotifications(@CurrentUser() user: JwtUser) {
    return this.orders.sellerNotifications(user);
  }

  @Patch("seller/notifications/:notificationId/read")
  markSellerNotificationRead(
    @CurrentUser() user: JwtUser,
    @Param("notificationId") notificationId: string,
  ) {
    return this.orders.markSellerNotificationRead(user, Number(notificationId));
  }

  @Get(":id")
  getOne(@CurrentUser() user: JwtUser, @Param("id") id: string) {
    return this.orders.getOrderDetails(user, Number(id));
  }

  // cancel order (customer/admin)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post(":id/cancel")
  cancel(@CurrentUser() user: JwtUser, @Param("id") id: string) {
    return this.orders.cancelOrder(user, Number(id));
  }

  // seller marks one bag picked up (by orderItem id)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Patch("items/:itemId/picked-up")
  pickedUp(
    @CurrentUser() user: JwtUser,
    @Param("itemId") itemId: string,
    @Body() dto: ConfirmPickupDto,
  ) {
    return this.orders.markItemPickedUp(user, Number(itemId), dto.pickupPin);
  }

  @Post("items/:itemId/review")
  review(
    @CurrentUser() user: JwtUser,
    @Param("itemId") itemId: string,
    @Body() dto: CreateOrderReviewDto,
  ) {
    return this.orders.submitItemReview(user, Number(itemId), dto);
  }
}
