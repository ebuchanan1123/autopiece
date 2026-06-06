import { IsOptional, IsString, MaxLength, IsNumber } from "class-validator";
import { Type } from "class-transformer";

export class UpdateSellerProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(140)
  storeName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  businessType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  wilaya?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(700000)
  logoUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;
}
