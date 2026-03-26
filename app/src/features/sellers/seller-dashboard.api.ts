import { apiFetch } from "@/src/lib/api";

export type SellerOrderItem = {
  id: number;
  orderId: number;
  listingId: number;
  sellerId: number;
  quantity: number;
  unitPriceDzd: number;
  saleNumber: string;
  status: string;
  reservedUntil: string | null;
  createdAt: string;
  listing?: {
    title?: string;
  } | null;
  order?: {
    orderNumber?: string;
    status?: string;
  } | null;
};

export async function getSellerOrders() {
  return apiFetch<SellerOrderItem[]>("/orders/seller");
}

export async function markSellerOrderItemPickedUp(itemId: number) {
  return apiFetch<{ ok: boolean }>(`/orders/items/${itemId}/picked-up`, {
    method: "PATCH",
  });
}
