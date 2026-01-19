import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateOrderDto {
  @IsInt()
  @Min(1)
  serviceId: number;

  @IsIn(['online', 'cod'])
  paymentMethod: 'online' | 'cod';

  @IsOptional()
  requirements?: any;

  // Optional for Fiverr-style; keep if you want “contact info”
  @IsOptional()
  @IsString()
  @MaxLength(120)
  shippingName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  shippingPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  shippingAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  wilaya?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;
}
