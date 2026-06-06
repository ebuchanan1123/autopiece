import { apiFetch } from "@/src/lib/api";

export type Listing = {
  id: number;
  sellerId: number;
  title: string;
  description: string;
  priceDzd: number;
  originalValueDzd: number;
  quantityAvailable: number;
  pickupStartAt: string | null;
  pickupEndAt: string | null;
  lat: number | null;
  lng: number | null;
  ratingAvg: number;
  ratingCount: number;
  pickupRatingAvg?: number;
  qualityRatingAvg?: number;
  varietyRatingAvg?: number;
  quantityRatingAvg?: number;
  category: string;
  wilaya: string;
  city: string;
  status: string;
  imageUrl?: string | null;
  address?: string | null;
  pickupInstructions?: string | null;
  packaging?: { label: string; status: string }[] | null;
  packagingNote?: string | null;
  ingredientsAndAllergens?: string | null;
  storeName?: string | null;
  sellerLogoUrl?: string | null;
  sellerBusinessType?: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function getListings() {
  return apiFetch<Listing[]>("/listings");
}

export async function getListing(id: number) {
  return apiFetch<Listing>(`/listings/${id}`);
}

export type CreateListingPayload = {
  title: string;
  description: string;
  priceDzd: number;
  originalValueDzd?: number;
  quantityAvailable?: number;
  category: string;
  wilaya: string;
  city: string;
  pickupStartAt?: string | null;
  pickupEndAt?: string | null;
  lat?: number | null;
  lng?: number | null;
  imageUrl?: string | null;
  address?: string | null;
  pickupInstructions?: string | null;
  packaging?: { label: string; status: string }[] | null;
  packagingNote?: string | null;
  ingredientsAndAllergens?: string | null;
};

export type UpdateListingPayload = Partial<CreateListingPayload> & {
  status?: "active" | "sold_out" | "hidden" | "draft" | "removed";
};

export async function createListing(payload: CreateListingPayload) {
  return apiFetch<Listing>("/listings", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getMyListings() {
  return apiFetch<Listing[]>("/listings/me/mine");
}

export async function updateListing(id: number, payload: UpdateListingPayload) {
  return apiFetch<Listing>(`/listings/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function translateListing(id: number, lang: "en" | "fr" | "ar") {
  return apiFetch<{ title: string; description: string; lang: string }>(
    `/listings/${id}/translate`,
    { method: "POST", body: JSON.stringify({ lang }) }
  );
}
