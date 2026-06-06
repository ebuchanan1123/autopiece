import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Listing } from "./listing.entity";
import { ListingsService } from "./listings.service";
import { ListingsController } from "./listings.controller";
import { ListingTranslation } from "./listing-translation.entity";
import { GoogleTranslateService } from "../common/translate/google-translate.service";
import { SellerProfile } from "../sellers/seller.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([Listing, ListingTranslation, SellerProfile]),
  ],
  providers: [ListingsService, GoogleTranslateService],
  controllers: [ListingsController],
  exports: [ListingsService],
})
export class ListingModule {}
