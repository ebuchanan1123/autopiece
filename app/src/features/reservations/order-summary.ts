import { getOrderDetails, getMyOrders, type Order } from "./reservations.api";
import type { AppLang } from "@/src/features/i18n/lang.context";

export type OrderSummary = {
  order: Order;
  title: string;
  subtitle: string;
  sellerLogoUrl: string | null;
  itemCount: number;
  savedDzd: number;
  listingId: number | null;
  monthKey: string;
  monthLabel: string;
};

export type OrderMonthGroup = {
  key: string;
  title: string;
  count: number;
  items: OrderSummary[];
};

function formatMonthLabel(date: Date, lang: AppLang) {
  const locale = lang === "fr" ? "fr-CA" : lang === "ar" ? "ar-DZ" : "en-CA";
  return date.toLocaleDateString(locale, { month: "long", year: "numeric" });
}

function formatMonthKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  return `${year}-${month}`;
}

export async function getMyOrderSummaries(lang: AppLang) {
  const orders = await getMyOrders();

  const summaries = await Promise.all(
    orders.map(async (order) => {
      try {
        const details = await getOrderDetails(order.id);
        const primaryItem = details.items[0] ?? null;
        const title = primaryItem?.listing?.title ?? order.orderNumber ?? `Order #${order.id}`;
        const subtitle =
          primaryItem?.listing?.storeName ??
          primaryItem?.listing?.city ??
          primaryItem?.listing?.wilaya ??
          new Date(order.createdAt).toLocaleDateString();
        const itemCount = details.items.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0) || 1;
        const savedDzd = details.items.reduce((sum, item) => {
          const original = Number(item.listing?.originalValueDzd ?? item.unitPriceDzd ?? 0);
          const paid = Number(item.unitPriceDzd ?? item.listing?.priceDzd ?? 0);
          return sum + Math.max(original - paid, 0);
        }, 0);
        const createdAt = new Date(order.createdAt);

        return {
          order,
          title,
          subtitle,
          sellerLogoUrl: primaryItem?.listing?.sellerLogoUrl ?? null,
          itemCount,
          savedDzd,
          listingId: primaryItem?.listingId ?? null,
          monthKey: formatMonthKey(createdAt),
          monthLabel: formatMonthLabel(createdAt, lang),
        } satisfies OrderSummary;
      } catch {
        const createdAt = new Date(order.createdAt);

        return {
          order,
          title: order.orderNumber ?? `Order #${order.id}`,
          subtitle: new Date(order.createdAt).toLocaleDateString(),
          sellerLogoUrl: null,
          itemCount: 1,
          savedDzd: 0,
          listingId: null,
          monthKey: formatMonthKey(createdAt),
          monthLabel: formatMonthLabel(createdAt, lang),
        } satisfies OrderSummary;
      }
    })
  );

  return summaries.sort(
    (a, b) => new Date(b.order.createdAt).getTime() - new Date(a.order.createdAt).getTime()
  );
}

export function groupOrdersByMonth(items: OrderSummary[]) {
  const groups = new Map<string, OrderMonthGroup>();

  for (const item of items) {
    const existing = groups.get(item.monthKey);
    if (existing) {
      existing.items.push(item);
      existing.count += item.itemCount;
    } else {
      groups.set(item.monthKey, {
        key: item.monthKey,
        title: item.monthLabel,
        count: item.itemCount,
        items: [item],
      });
    }
  }

  return Array.from(groups.values()).sort((a, b) => b.key.localeCompare(a.key));
}

export function getTotalBags(items: OrderSummary[]) {
  return items.reduce((sum, item) => sum + item.itemCount, 0);
}

export function getTotalSavedDzd(items: OrderSummary[]) {
  return items.reduce((sum, item) => sum + Number(item.savedDzd ?? 0), 0);
}
