import { IsArray, IsIn, IsInt, ArrayMaxSize, IsPositive } from "class-validator";
import { Type } from "class-transformer";

export class BulkTranslateListingDto {
  @IsIn(["en", "fr", "ar"])
  lang: "en" | "fr" | "ar";

  @IsArray()
  @ArrayMaxSize(100)
  @IsInt({ each: true })
  @IsPositive({ each: true })
  @Type(() => Number)
  listingIds: number[];
}
