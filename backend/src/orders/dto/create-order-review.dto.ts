import { IsInt, Max, Min } from "class-validator";

export class CreateOrderReviewDto {
  @IsInt()
  @Min(1)
  @Max(5)
  overallRating: number;

  @IsInt()
  @Min(1)
  @Max(5)
  pickupRating: number;

  @IsInt()
  @Min(1)
  @Max(5)
  qualityRating: number;

  @IsInt()
  @Min(1)
  @Max(5)
  varietyRating: number;

  @IsInt()
  @Min(1)
  @Max(5)
  quantityRating: number;
}
