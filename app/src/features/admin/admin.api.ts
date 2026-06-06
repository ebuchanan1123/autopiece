import { apiFetch } from "@/src/lib/api";
import type { AuthUser } from "@/src/features/auth/auth.api";
import type { Listing } from "@/src/features/listings/listings.api";
import type { Order, OrderItem } from "@/src/features/orders/orders.api";

export type AdminSeller = {
  id: number;
  storeName: string;
  address: string;
  city: string;
  wilaya: string;
  phone: string;
  businessType?: string | null;
  logoUrl?: string | null;
  isVerified: boolean;
  user?: AuthUser | null;
};

export type AuditLog = {
  id: number;
  actorUserId: number | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type AdminPayment = {
  id: number;
  orderId: number;
  provider: string;
  status: string;
  amountDzd: number;
  providerPaymentId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminOrderDetail = {
  order: Order;
  customer: AuthUser | null;
  payment: AdminPayment | null;
  items: OrderItem[];
};

function queryString(params: Record<string, string | number | undefined>) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "" && value !== "all") {
      qs.set(key, String(value));
    }
  });
  const value = qs.toString();
  return value ? `?${value}` : "";
}

export async function getAdminUsers(params: { q?: string; role?: string } = {}) {
  const data = await apiFetch<{ users: AuthUser[] }>(
    `/admin/users${queryString({ ...params, limit: 100 })}`,
  );
  return data.users;
}

export async function getAdminSellers(
  params: { q?: string; status?: string } = {},
) {
  const data = await apiFetch<{ sellers: AdminSeller[] }>(
    `/admin/sellers${queryString({ ...params, limit: 100 })}`,
  );
  return data.sellers;
}

export async function updateSellerVerification(userId: number, isVerified: boolean) {
  const data = await apiFetch<{ seller: AdminSeller }>(
    `/admin/sellers/${userId}/verification`,
    {
      method: "PATCH",
      body: JSON.stringify({ isVerified }),
    },
  );
  return data.seller;
}

export async function getAdminListings(
  params: { q?: string; status?: string } = {},
) {
  const data = await apiFetch<{ listings: Listing[] }>(
    `/admin/listings${queryString({ ...params, limit: 100 })}`,
  );
  return data.listings;
}

export async function updateListingStatus(
  listingId: number,
  status: "active" | "sold_out" | "hidden" | "draft" | "removed",
) {
  const data = await apiFetch<{ listing: Listing }>(
    `/admin/listings/${listingId}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
  );
  return data.listing;
}

export async function getAdminOrders(
  params: { q?: string; status?: string } = {},
) {
  const data = await apiFetch<{ orders: Order[] }>(
    `/admin/orders${queryString({ ...params, limit: 100 })}`,
  );
  return data.orders;
}

export async function getAdminOrder(orderId: number) {
  return apiFetch<AdminOrderDetail>(`/admin/orders/${orderId}`);
}

export async function getAuditLog() {
  const data = await apiFetch<{ audit: AuditLog[] }>("/admin/audit?limit=100");
  return data.audit;
}
