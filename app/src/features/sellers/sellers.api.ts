import { apiFetch } from "@/src/lib/api";
import type { AuthResponse } from "@/src/features/auth/auth.api";
import { setRefreshToken, setToken } from "@/src/lib/token";
import { syncProfileFromAuth } from "@/src/features/profile/profile.store";

export type SellerPlaceResult = {
  id: string;
  name: string;
  address: string;
  businessType: string;
  phone: string;
  lat: number | null;
  lng: number | null;
};

export type SellerProfile = {
  id: number;
  storeName: string;
  address: string;
  city: string;
  wilaya: string;
  phone: string;
  businessType?: string | null;
  placeId?: string | null;
  lat?: number | null;
  lng?: number | null;
  logoUrl?: string | null;
  isVerified: boolean;
};

export type RegisterSellerPayload = {
  email: string;
  password: string;
  phone?: string;
  username?: string;
  storeName: string;
  businessType?: string;
  placeId?: string;
  address: string;
  city: string;
  wilaya: string;
  lat?: number | null;
  lng?: number | null;
};

export type UpdateSellerProfilePayload = {
  storeName?: string;
  businessType?: string;
  address?: string;
  city?: string;
  wilaya?: string;
  phone?: string;
  logoUrl?: string | null;
  lat?: number | null;
  lng?: number | null;
};

export async function searchSellerPlaces(query: string) {
  const q = query.trim();
  if (!q) return [];
  return apiFetch<SellerPlaceResult[]>(`/sellers/place-search?q=${encodeURIComponent(q)}`);
}

export async function registerSeller(payload: RegisterSellerPayload) {
  const data = await apiFetch<AuthResponse>("/auth/register-seller", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  await setToken(data.accessToken);
  if (data.refreshCookieValue) {
    await setRefreshToken(data.refreshCookieValue);
  }
  await syncProfileFromAuth(data.user);
  return data;
}

export async function getMySellerProfile() {
  const data = await apiFetch<{ seller: SellerProfile }>("/sellers/me");
  return data.seller;
}

export async function updateMySellerProfile(payload: UpdateSellerProfilePayload) {
  const data = await apiFetch<{ seller: SellerProfile }>("/sellers/me", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return data.seller;
}
