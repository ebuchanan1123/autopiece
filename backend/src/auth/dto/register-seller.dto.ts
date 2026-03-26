import {
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";
import { Type } from "class-transformer";

export class RegisterSellerDto {
  @IsOptional()
  @IsString()
  @MinLength(3, { message: "Username must be at least 3 characters." })
  @MaxLength(40)
  username?: string;

  @IsEmail({}, { message: "Enter a valid email address." })
  @MaxLength(254)
  email: string;

  @IsString()
  @MinLength(6, { message: "Password must be at least 6 characters." })
  @MaxLength(72)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message:
      "Password must include an uppercase letter, a lowercase letter, and a number.",
  })
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  storeName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  businessType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  placeId?: string;

  @IsString()
  @MaxLength(255)
  address: string;

  @IsString()
  @MaxLength(100)
  city: string;

  @IsString()
  @MaxLength(100)
  wilaya: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;
}
