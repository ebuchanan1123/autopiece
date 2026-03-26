import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Patch,
  Delete,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ListingsService } from "./listings.service";
import { CreateListingDto } from "./dto/create-listing.dto";
import { UpdateListingDto } from "./dto/update-listing.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { JwtUser } from "../auth/types/jwt-user.type";
import { TranslateListingDto } from "./dto/translate-listing.dto";

type BulkTranslateDto = {
  lang: "en" | "fr" | "ar";
  listingIds: number[];
};

@Controller("listings")
export class ListingsController {
  constructor(private readonly service: ListingsService) {}

  @Get()
  findPublic(@Query() query: any) {
    return this.service.findPublic(query);
  }

  @Get(":id")
  findOnePublic(@Param("id") id: string) {
    return this.service.findPublicById(+id);
  }

  @UseGuards(JwtAuthGuard)
  @Post("translate/bulk")
  translateBulk(
    @Body() dto: { lang: "en" | "fr" | "ar"; listingIds: number[] },
  ) {
    const ids = Array.isArray(dto.listingIds) ? dto.listingIds : [];
    return this.service.translateListingsBulk(ids, dto.lang);
  }

  @UseGuards(JwtAuthGuard)
  @Post(":id/translate")
  translate(@Param("id") id: string, @Body() dto: TranslateListingDto) {
    return this.service.translateListing(Number(id), dto.lang);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateListingDto, @CurrentUser() user: JwtUser) {
    return this.service.create(dto, user);
  }

  @UseGuards(JwtAuthGuard)
  @Get("me/mine")
  findMine(@CurrentUser() user: JwtUser) {
    return this.service.findMine(user);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateListingDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.update(+id, dto, user);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(":id")
  remove(@Param("id") id: string, @CurrentUser() user: JwtUser) {
    return this.service.remove(+id, user);
  }
}
