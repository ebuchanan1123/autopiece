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
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateOrderDto) {
    return this.orders.createOrder(user, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  myOrders(@CurrentUser() user: JwtUser) {
    return this.orders.myOrders(user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('freelancer')
  freelancerOrders(@CurrentUser() user: JwtUser) {
    return this.orders.freelancerOrders(user);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  getOne(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.orders.getOrder(user, +id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/cancel')
  cancel(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.orders.cancelOrder(user, +id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  freelancerUpdateStatus(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.orders.freelancerUpdateStatus(user, +id, dto.status);
  }
}
