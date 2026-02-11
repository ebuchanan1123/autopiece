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
  category: string;
  wilaya: string;
  city: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export async function getListings() {
  return apiFetch<Listing[]>("/listings");
}
