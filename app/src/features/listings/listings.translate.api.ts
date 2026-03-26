import { apiFetch } from "@/src/lib/api";

export type ListingTranslationResponse = {
  listingId: number;
  lang: "en" | "fr" | "ar";
  title: string;
  description: string;
  cached: boolean;
  createdAt: string;
};

export async function translateListing(listingId: number, lang: "en" | "fr" | "ar") {
  return apiFetch<ListingTranslationResponse>(`/listings/${listingId}/translate`, {
    method: "POST",
    body: JSON.stringify({ lang }),
  });
}
