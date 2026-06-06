import { IsString, Length } from "class-validator";

export class ConfirmPickupDto {
  @IsString()
  @Length(4, 8)
  pickupPin: string;
}
