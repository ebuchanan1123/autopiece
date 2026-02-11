import { IsInt,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  IsNumber,
  IsDateString } from 'class-validator';
import type { ListingStatus } from '../listing.entity';
import { PartialType } from '@nestjs/mapped-types';
import { CreateListingDto } from './create-listing.dto';



export class UpdateListingDto extends PartialType(CreateListingDto) {
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

  @IsOptional()
  @IsIn(['active', 'sold', 'hidden', 'draft', 'removed'])
  status?: ListingStatus;
}
