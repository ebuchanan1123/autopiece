import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { SellersService } from "./sellers.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { JwtUser } from "../auth/types/jwt-user.type";
import { UpdateSellerProfileDto } from "./dto/update-seller-profile.dto";

@Controller("sellers")
export class SellersController {
  constructor(private readonly sellersService: SellersService) {}

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get("place-search")
  searchPlaces(@Query("q") q?: string) {
    return this.sellersService.searchPlaces(q ?? "");
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  async me(@CurrentUser() user: JwtUser) {
    const profile = await this.sellersService.getProfile(Number(user.sub));
    if (!profile) throw new NotFoundException();
    return { seller: this.sellersService.toSafeProfile(profile) };
  }

  @UseGuards(JwtAuthGuard)
  @Patch("me")
  async updateMe(
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdateSellerProfileDto,
  ) {
    const profile = await this.sellersService.updateProfile(
      Number(user.sub),
      dto,
    );
    if (!profile) throw new NotFoundException();
    return { seller: this.sellersService.toSafeProfile(profile) };
  }
}
