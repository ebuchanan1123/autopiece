import { apiFetch } from "@/src/lib/api";
import type { Listing } from "@/src/features/listings/listings.api";

export function getMyFavourites() {
  return apiFetch<Listing[]>("/me/favourites");
}

export function favouriteAdd(listingId: number) {
  return apiFetch<void>(`/favourites/${listingId}`, { method: "POST" });
}

export function favouriteRemove(listingId: number) {
  return apiFetch<void>(`/favourites/${listingId}`, { method: "DELETE" });
}
