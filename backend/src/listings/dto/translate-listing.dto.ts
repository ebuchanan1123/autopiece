import { IsIn } from "class-validator";

export class TranslateListingDto {
  @IsIn(["en", "fr", "ar"])
  lang: "en" | "fr" | "ar";
}
