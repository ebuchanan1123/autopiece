import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

class ReserveItemDto {
  @IsInt()
  listingId: number;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class ReserveOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReserveItemDto)
  items: ReserveItemDto[];

  @IsIn(["online", "in_store"])
  paymentMethod: "online" | "in_store";

  @IsOptional()
  @IsIn(["saved_card"])
  paymentProvider?: "saved_card";

  @IsOptional()
  @IsString()
  @MaxLength(4)
  paymentCardLast4?: string;
}
