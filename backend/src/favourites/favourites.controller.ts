import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { JwtUser } from "../auth/types/jwt-user.type";
import { FavouritesService } from "./favourites.service";

@UseGuards(JwtAuthGuard)
@Controller()
export class FavouritesController {
  constructor(private readonly service: FavouritesService) {}

  @Get("me/favourites")
  myFavourites(@CurrentUser() user: JwtUser) {
    return this.service.myFavourites(user);
  }

  @Post("favourites/:listingId")
  add(@Param("listingId") listingId: string, @CurrentUser() user: JwtUser) {
    return this.service.add(Number(listingId), user);
  }

  @Delete("favourites/:listingId")
  remove(@Param("listingId") listingId: string, @CurrentUser() user: JwtUser) {
    return this.service.remove(Number(listingId), user);
  }
}
