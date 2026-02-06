import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtUser } from '../auth/types/jwt-user.type';
import { OrdersService } from './orders.service';
import { ReserveOrderDto } from './dto/reserve-order.dto';

@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  // customer reserves one or more bags
  @Post('reserve')
  reserve(@CurrentUser() user: JwtUser, @Body() dto: ReserveOrderDto) {
    return this.orders.reserveOrder(user, dto);
  }

  // customer orders list
  @Get('me')
  myOrders(@CurrentUser() user: JwtUser) {
    return this.orders.myOrders(user);
  }

  // seller view: order items reserved/paid for this seller
  @Get('seller')
  sellerOrders(@CurrentUser() user: JwtUser) {
    return this.orders.sellerOrders(user);
  }

  // cancel order (customer/admin) - you need to implement cancelOrder again in service
  @Post(':id/cancel')
  cancel(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.orders.cancelOrder(user, Number(id));
  }

  // seller marks one bag picked up (by orderItem id)
  @Patch('items/:itemId/picked-up')
  pickedUp(@CurrentUser() user: JwtUser, @Param('itemId') itemId: string) {
    return this.orders.markItemPickedUp(user, Number(itemId));
  }
}
