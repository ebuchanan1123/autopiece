import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  IsNumber,
  IsDateString,
} from 'class-validator';

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
}
