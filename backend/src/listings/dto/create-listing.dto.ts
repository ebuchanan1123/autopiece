import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  IsNumber,
  IsDateString,
  IsArray,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

class PackagingItemDto {
  @IsString()
  @MaxLength(80)
  label: string;

  @IsString()
  @MaxLength(80)
  status: string;
}

export class CreateListingDto {
  @IsString()
  @MaxLength(120)
  title: string;

  @IsString()
  @MaxLength(5000)
  description: string;

  @IsInt()
  @Min(0)
  priceDzd: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  originalValueDzd?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantityAvailable?: number;

  @IsString()
  @MaxLength(80)
  category: string;

  @IsString()
  @MaxLength(80)
  wilaya: string;

  @IsString()
  @MaxLength(80)
  city: string;

  @IsOptional()
  @IsDateString()
  pickupStartAt?: string;

  @IsOptional()
  @IsDateString()
  pickupEndAt?: string;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;

  /**
   * NEW optional fields (rich listing page)
   */

  @IsOptional()
  @IsString()
  @MaxLength(700000)
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  pickupInstructions?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PackagingItemDto)
  packaging?: PackagingItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(400)
  packagingNote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  ingredientsAndAllergens?: string;
}
