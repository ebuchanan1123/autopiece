import { IsInt, IsOptional, IsString, Min, MaxLength, IsIn } from 'class-validator';
import type { ServiceStatus } from '../service.entity';
import { PartialType } from '@nestjs/mapped-types';
import { CreateServiceDto } from './create-service.dto';



export class UpdateServiceDto extends PartialType(CreateServiceDto) {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceDzd?: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  make?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  model?: string;

  @IsOptional()
  @IsInt()
  @Min(1900)
  year?: number;


  @IsOptional()
  @IsString()
  @MaxLength(80)
  wilaya?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @IsOptional()
  @IsIn(['active', 'sold', 'hidden', 'draft', 'removed'])
  status?: ServiceStatus;
}
