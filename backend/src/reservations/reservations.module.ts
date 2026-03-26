import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ReservationsController } from "./reservations.controller";
import { ReservationsService } from "./reservations.service";
import { Reservation } from "./reservation.entity";
import { Listing } from "../listings/listing.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Reservation, Listing])],
  controllers: [ReservationsController],
  providers: [ReservationsService],
})
export class ReservationsModule {}
