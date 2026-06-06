import { apiFetch } from "@/src/lib/api";

export type ReserveItem = {
  listingId: number;
  quantity: number;
};

export type ReserveOrderRequest = {
  items: ReserveItem[];
  paymentMethod: "online" | "in_store";
  paymentProvider?: "saved_card";
  paymentCardLast4?: string;
};

export type ReserveOrderResponse = {
  orderId: number;
  orderNumber: string;
  status: string;
  totalDzd: number;
  pickupPin?: string | null;
  paymentStatus?: string | null;
  checkoutUrl?: string | null;
};

export type Order = {
  id: number;
  customerId?: number;
  orderNumber: string;
  status: "reserved" | "in_progress" | "picked_up" | "paid" | "expired" | "cancelled" | string;
  totalDzd: number;
  paymentMethod: "online" | "in_store";
  pickupPin?: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function reserveOrder(
  listingId: number,
  quantity = 1,
  options?: {
    paymentMethod?: "online" | "in_store";
    paymentProvider?: "saved_card";
    paymentCardLast4?: string;
  }
) {
  const body: ReserveOrderRequest = {
    items: [{ listingId, quantity }],
    paymentMethod: options?.paymentMethod ?? "in_store",
    paymentProvider: options?.paymentProvider,
    paymentCardLast4: options?.paymentCardLast4,
  };

  return apiFetch<ReserveOrderResponse>("/orders/reserve", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getMyOrders() {
  return apiFetch<Order[]>("/orders/me");
}

export async function cancelOrder(orderId: number) {
  return apiFetch<{ ok: boolean }>(`/orders/${orderId}/cancel`, {
    method: "POST",
  });
}

export type OrderItem = {
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
  review?: {
    id: number;
    overallRating: number;
    pickupRating: number;
    qualityRating: number;
    varietyRating: number;
    quantityRating: number;
  } | null;
  listing: {
    id: number;
    title?: string;
    storeName?: string | null;
    sellerLogoUrl?: string | null;
    address?: string | null;
    pickupStartAt?: string | null;
    pickupEndAt?: string | null;
    city?: string;
    wilaya?: string;
    priceDzd?: number;
    originalValueDzd?: number;
    ratingAvg?: number;
    ratingCount?: number;
    pickupRatingAvg?: number;
    qualityRatingAvg?: number;
    varietyRatingAvg?: number;
    quantityRatingAvg?: number;
  } | null;
};

export type OrderDetails = {
  order: Order;
  pickupPin?: string | null;
  payment?: {
    provider: "satim";
    status: string;
    amountDzd: number;
    cardLast4?: string | null;
  } | null;
  items: OrderItem[];
};

export async function getOrderDetails(orderId: number) {
  return apiFetch<OrderDetails>(`/orders/${orderId}`);
}

export async function confirmSellerPickup(itemId: number, pickupPin: string) {
  return apiFetch<{ ok: boolean }>(`/orders/items/${itemId}/picked-up`, {
    method: "PATCH",
    body: JSON.stringify({ pickupPin }),
  });
}

export async function submitOrderItemReview(
  itemId: number,
  payload: {
    overallRating: number;
    pickupRating: number;
    qualityRating: number;
    varietyRating: number;
    quantityRating: number;
  }
) {
  return apiFetch<{ ok: boolean }>(`/orders/items/${itemId}/review`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
