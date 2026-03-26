import { IsInt, Min } from "class-validator";

export class CreateFavouriteDto {
  @IsInt()
  @Min(1)
  listingId: number;
}
