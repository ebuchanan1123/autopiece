import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterSellerDto {
  @IsEmail({}, { message: "Enter a valid email address." })
  @MaxLength(254)
  email: string;


  @IsString()
  @MinLength(6, { message: "Password must be at least 6 characters." })
  @MaxLength(72)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: "Password must include an uppercase letter, a lowercase letter, and a number.",
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

  @IsString()
  @MaxLength(255)
  address: string;

  @IsString()
  @MaxLength(100)
  city: string;

  @IsString()
  @MaxLength(100)
  wilaya: string;
}
