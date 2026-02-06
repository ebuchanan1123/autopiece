import { IsIn, IsInt, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

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

  @IsIn(['online', 'in_store'])
  paymentMethod: 'online' | 'in_store';
}
