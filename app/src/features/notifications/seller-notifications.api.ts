import { apiFetch } from "@/src/lib/api";

export type SellerNotification = {
  id: number;
  orderId: number;
  type: "bag_reserved" | "bag_paid";
  title: string;
  body: string;
  metadata?: Record<string, unknown> | null;
  readAt?: string | null;
  createdAt: string;
};

export async function getSellerNotifications() {
  return apiFetch<SellerNotification[]>("/orders/seller/notifications");
}

export async function markSellerNotificationRead(notificationId: number) {
  return apiFetch<{ ok: boolean }>(`/orders/seller/notifications/${notificationId}/read`, {
    method: "PATCH",
  });
}
