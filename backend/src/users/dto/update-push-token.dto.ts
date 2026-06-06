import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdatePushTokenDto {
  @IsString()
  @MaxLength(255)
  token: string;

  @IsOptional()
  @IsIn(["ios", "android", "web", "unknown"])
  platform?: "ios" | "android" | "web" | "unknown";
}
