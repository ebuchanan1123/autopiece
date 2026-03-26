import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { JwtUser } from "../auth/types/jwt-user.type";
import { ReservationsService } from "./reservations.service";
import { CreateReservationDto } from "./dto/create-reservation.dto";

@Controller()
export class ReservationsController {
  constructor(private readonly service: ReservationsService) {}

  @UseGuards(JwtAuthGuard)
  @Post("reservations")
  create(@Body() dto: CreateReservationDto, @CurrentUser() user: JwtUser) {
    return this.service.create(dto, user);
  }

  @UseGuards(JwtAuthGuard)
  @Get("me/reservations")
  myReservations(@CurrentUser() user: JwtUser) {
    return this.service.myReservations(user);
  }
}
