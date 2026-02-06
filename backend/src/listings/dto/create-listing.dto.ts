import {
  IsInt,
  IsOptional,
  IsString,
  Min,
  IsIn,
} from 'class-validator';
import type { ListingStatus } from '../listing.entity';

export class CreateListingDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsInt()
  @Min(0)
  priceDzd: number;

  @IsString()
  category: string;

  @IsString()
  make: string;

  @IsString()
  model: string;

  @IsOptional()
  @IsInt()
  year?: number;

  @IsString()
  wilaya: string;

  @IsString()
  city: string;

  @IsOptional()
  @IsIn(['active', 'draft'])
  status?: ListingStatus;
  listingId: any;
}
