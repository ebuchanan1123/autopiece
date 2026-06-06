import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FavouritesController } from "./favourites.controller";
import { FavouritesService } from "./favourites.service";
import { Favourite } from "./favourite.entity";
import { Listing } from "../listings/listing.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Favourite, Listing])],
  controllers: [FavouritesController],
  providers: [FavouritesService],
})
export class FavouritesModule {}
