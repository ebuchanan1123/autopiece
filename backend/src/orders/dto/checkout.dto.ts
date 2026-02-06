import { IsArray, IsIn, IsInt, IsPositive, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class CheckoutItemDto {
  @IsInt()
  @IsPositive()
  listingId: number;

  @IsInt()
  @IsPositive()
  quantity: number;
}

export class CheckoutDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items: CheckoutItemDto[];

  @IsIn(['online', 'cod'])
  paymentMethod: 'online' | 'cod';

  @IsString()
  @MaxLength(120)
  shippingName: string;

  @IsString()
  @MaxLength(40)
  shippingPhone: string;

  @IsString()
  @MaxLength(200)
  shippingAddress: string;

  @IsString()
  @MaxLength(80)
  wilaya: string;

  @IsString()
  @MaxLength(80)
  city: string;
}
