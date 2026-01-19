import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterClientDto {
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsString()
  @MinLength(10)
  @MaxLength(72) // bcrypt safety
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'Password must contain at least 1 uppercase, 1 lowercase, and 1 number',
  })
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}
