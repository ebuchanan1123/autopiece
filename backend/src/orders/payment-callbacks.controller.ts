import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  UnauthorizedException,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { OrdersService } from "./orders.service";

@Controller("payments")
export class PaymentCallbacksController {
  constructor(private readonly ordersService: OrdersService) {}

  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Post("satim/callback")
  async satimCallback(
    @Body() body: Record<string, unknown>,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const result = await this.ordersService.handlePaymentProviderCallback(
      "satim",
      body ?? {},
      headers,
    );

    if (!result.verified) {
      throw new UnauthorizedException("Invalid payment callback signature");
    }

    return result;
  }

  @Get("satim/return")
  satimReturn() {
    return {
      ok: true,
      message:
        "Payment return received. The order status is updated by the secure server callback.",
    };
  }
}
