import { IsInt, Min } from "class-validator";

export class CreateReservationDto {
  @IsInt()
  @Min(1)
  listingId: number;
}
