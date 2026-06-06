import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getOrderDetails,
  submitOrderItemReview,
  type OrderDetails,
} from "@/src/features/orders/orders.api";
import { ScreenBody } from "@/src/components/screen-body";
import { ScreenHeader } from "@/src/components/screen-header";

function statusLabel(status?: string) {
  if (status === "picked_up") return "Picked up";
  if (status === "in_progress") return "In progress";
  if (status === "paid") return "Paid";
  if (status === "expired") return "Expired";
  if (status === "cancelled") return "Cancelled";
  if (status === "reserved") return "Reserved";
  return status ?? "Order";
}

function statusTone(status?: string) {
  if (status === "expired") return styles.statusWrapExpired;
  if (status === "cancelled") return styles.statusWrapCancelled;
  return styles.statusWrapDefault;
}

function paymentLabel(data: OrderDetails | null) {
  if (!data) return "Unknown";
  if (data.order.paymentMethod !== "online") return "Pay in store";
  if (data.payment?.cardLast4) return `Payment card •••• ${data.payment.cardLast4}`;
  if (data.payment?.provider === "satim") return "Card payment";
  return "Online checkout";
}

function formatDate(value?: string) {
  if (!value) return "Unknown date";
  return new Date(value).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function OrderDetailsScreen() {
  const insets = useSafeAreaInsets();
  const refreshOffset = insets.top + 24;
  const params = useLocalSearchParams();
  const orderId = Number(params.id);

  const [data, setData] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [overallRating, setOverallRating] = useState(0);
  const [pickupRating, setPickupRating] = useState(0);
  const [qualityRating, setQualityRating] = useState(0);
  const [varietyRating, setVarietyRating] = useState(0);
  const [quantityRating, setQuantityRating] = useState(0);
  const [reviewSaving, setReviewSaving] = useState(false);

  const load = useCallback(async () => {
    if (!Number.isFinite(orderId)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getOrderDetails(orderId);
      setData(res);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load order");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  const primaryItem = data?.items[0] ?? null;
  const sellerName = primaryItem?.listing?.storeName ?? primaryItem?.listing?.city ?? "Store";
  const sellerLogoUrl = primaryItem?.listing?.sellerLogoUrl ?? null;
  const sellerAddress =
    primaryItem?.listing?.address ??
    [primaryItem?.listing?.city, primaryItem?.listing?.wilaya].filter(Boolean).join(", ");
  const itemCount = useMemo(
    () => (data?.items ?? []).reduce((sum, item) => sum + Number(item.quantity ?? 0), 0),
    [data]
  );
  const orderStatus = data?.order.status;
  const hasReview = !!primaryItem?.review;

  function fillAllRatings(next: number) {
    setOverallRating(next);
    setPickupRating(next);
    setQualityRating(next);
    setVarietyRating(next);
    setQuantityRating(next);
    setReviewOpen(true);
  }

  async function submitReview() {
    if (!primaryItem) return;
    const scores = [overallRating, pickupRating, qualityRating, varietyRating, quantityRating];
    if (scores.some((score) => score < 1 || score > 5)) {
      Alert.alert("Missing ratings", "Please rate all four qualities before submitting.");
      return;
    }
    try {
      setReviewSaving(true);
      await submitOrderItemReview(primaryItem.id, {
        overallRating,
        pickupRating,
        qualityRating,
        varietyRating,
        quantityRating,
      });
      setReviewOpen(false);
      await load();
    } catch (e: any) {
      Alert.alert("Could not submit review", e?.message ?? "Please try again.");
    } finally {
      setReviewSaving(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title="Your order" showBack />
      <ScreenBody>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={load}
              progressViewOffset={refreshOffset}
              tintColor="#0B6E69"
              colors={["#0B6E69"]}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {data ? (
            <>
              <View style={styles.ratingCard}>
                <Text style={styles.ratingTitle}>How was your overall experience?</Text>
                <View style={styles.starsRow}>
                  {Array.from({ length: 5 }).map((_, index) => {
                    const value = index + 1;
                    const active = hasReview ? value <= Number(primaryItem?.review?.overallRating ?? 0) : value <= overallRating;
                    return (
                      <Pressable
                        key={index}
                        onPress={() => (!hasReview && orderStatus === "picked_up" ? fillAllRatings(value) : undefined)}
                        disabled={hasReview || orderStatus !== "picked_up"}
                      >
                        <Ionicons key={index} name={active ? "star" : "star-outline"} size={42} color="#FFFFFF" />
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={styles.ratingHint}>
                  {hasReview
                    ? "Thanks for rating this order."
                    : orderStatus === "picked_up"
                      ? "Tap a star to leave your review."
                      : "You can rate this bag once it has been picked up."}
                </Text>
              </View>

              <View style={[styles.receiptShell, statusTone(orderStatus)]}>
                <View style={styles.receiptStatusRow}>
                  <Ionicons
                    name={orderStatus === "picked_up" ? "checkmark-circle" : "time"}
                    size={26}
                    color="#FFFFFF"
                  />
                  <Text style={styles.receiptStatusText}>{statusLabel(orderStatus)}</Text>
                </View>

                <View style={styles.receiptInner}>
                  <View style={styles.storeRow}>
                    <View style={styles.storeLogoWrap}>
                      {sellerLogoUrl ? (
                        <Image source={{ uri: sellerLogoUrl }} style={styles.storeLogoImage} />
                      ) : (
                        <Text style={styles.storeLogoText}>
                          {sellerName
                            .split(/\s+/)
                            .slice(0, 2)
                            .map((part) => part[0]?.toUpperCase() ?? "")
                            .join("")}
                        </Text>
                      )}
                    </View>

                    <View style={styles.storeMain}>
                      <Text style={styles.storeName}>{sellerName}</Text>
                      {sellerAddress ? (
                        <Text style={styles.storeAddress} numberOfLines={1}>
                          {sellerAddress}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  <View style={styles.detailGrid}>
                    <View style={styles.detailCell}>
                      <Text style={styles.detailLabel}>
                        {orderStatus === "picked_up" ? "Picked up" : "Reserved"}
                      </Text>
                      <Text style={styles.detailValue}>{formatDate(data.order.createdAt)}</Text>
                    </View>
                    <View style={styles.detailCell}>
                      <Text style={styles.detailLabel}>Order ID</Text>
                      <Text style={styles.detailValue}>{data.order.orderNumber}</Text>
                    </View>
                    <View style={styles.detailCell}>
                      <Text style={styles.detailLabel}>Surprise Bag</Text>
                      <Text style={styles.detailValue}>
                        {itemCount}x {primaryItem?.listing?.title ?? "Bag"}
                      </Text>
                    </View>
                    <View style={styles.detailCell}>
                      <Text style={styles.detailLabel}>Total</Text>
                      <Text style={styles.detailValue}>{data.order.totalDzd} DZD</Text>
                    </View>
                    <View style={[styles.detailCell, styles.detailCellWide]}>
                      <Text style={styles.detailLabel}>Payment method</Text>
                      <Text style={styles.detailValue}>{paymentLabel(data)}</Text>
                    </View>
                  </View>
                </View>
              </View>

              {orderStatus !== "picked_up" && data.pickupPin ? (
                <View style={styles.pickupPinCard}>
                  <Text style={styles.pickupPinLabel}>Pickup PIN</Text>
                  <Text style={styles.pickupPinValue}>{data.pickupPin}</Text>
                  <Text style={styles.pickupPinHint}>Show this code to the seller at pickup.</Text>
                </View>
              ) : null}

              {orderStatus !== "picked_up" ? (
                <View style={styles.pickupNote}>
                  <Ionicons name="phone-portrait-outline" size={22} color="#0C766F" />
                  <Text style={styles.pickupNoteText}>
                    Show this reservation screen at pickup so the seller can mark your bag as collected.
                  </Text>
                </View>
              ) : null}

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Items in this order</Text>
              </View>

              {data.items.map((item) => {
                const title = item.listing?.title ?? `Listing #${item.listingId}`;
                const place =
                  item.listing?.storeName ??
                  [item.listing?.city, item.listing?.wilaya].filter(Boolean).join(", ");
                const saved = Math.max(
                  Number(item.listing?.originalValueDzd ?? item.unitPriceDzd ?? 0) -
                    Number(item.unitPriceDzd ?? item.listing?.priceDzd ?? 0),
                  0
                );

                return (
                  <Pressable
                    key={item.id}
                    style={styles.itemCard}
                    onPress={() =>
                      router.push({
                        pathname: "/(app)/listing/[id]",
                        params: { id: String(item.listingId) },
                      })
                    }
                  >
                    <View style={styles.itemCardTop}>
                      <View style={styles.itemBadgeCircle}>
                        {item.listing?.sellerLogoUrl ? (
                          <Image source={{ uri: item.listing.sellerLogoUrl }} style={styles.itemBadgeImage} />
                        ) : (
                          <Text style={styles.itemBadgeText}>
                            {title
                              .split(/\s+/)
                              .slice(0, 2)
                              .map((part) => part[0]?.toUpperCase() ?? "")
                              .join("")}
                          </Text>
                        )}
                      </View>
                      <View style={styles.itemCardMain}>
                        <Text style={styles.itemCardTitle} numberOfLines={1}>
                          {title}
                        </Text>
                        {place ? (
                          <Text style={styles.itemCardSubtitle} numberOfLines={1}>
                            {place}
                          </Text>
                        ) : null}
                      </View>
                      <Ionicons name="chevron-forward" size={22} color="#93A09D" />
                    </View>

                    <View style={styles.itemMetaRow}>
                      <View style={styles.itemMetaPill}>
                        <Text style={styles.itemMetaPillText}>{statusLabel(item.status)}</Text>
                      </View>
                      <Text style={styles.itemMetaText}>{item.saleNumber}</Text>
                    </View>

                    <View style={styles.itemPriceRow}>
                      <Text style={styles.itemPriceValue}>{item.unitPriceDzd} DZD</Text>
                      {saved > 0 ? <Text style={styles.itemSavedText}>Saved {saved} DZD</Text> : null}
                    </View>
                  </Pressable>
                );
              })}

              <Pressable style={styles.helpLink} onPress={() => router.push("/(app)/help")}>
                <Ionicons name="headset-outline" size={30} color="#253230" />
                <Text style={styles.helpText}>Need help?</Text>
              </Pressable>
            </>
          ) : !loading ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>No items found for this order.</Text>
            </View>
          ) : null}
        </ScrollView>

        <Modal visible={reviewOpen} transparent animationType="fade" onRequestClose={() => setReviewOpen(false)}>
          <View style={styles.modalOverlay}>
            <Pressable style={styles.modalBackdrop} onPress={() => setReviewOpen(false)} />
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Rate your bag</Text>
              <Text style={styles.modalBody}>Tell us a bit more about the pickup experience.</Text>

              {([
                ["Pickup", pickupRating, setPickupRating],
                ["Quality", qualityRating, setQualityRating],
                ["Variety", varietyRating, setVarietyRating],
                ["Quantity", quantityRating, setQuantityRating],
              ] satisfies [string, number, (value: number) => void][]).map(([label, value, setter]) => (
                <View key={String(label)} style={styles.ratingRow}>
                  <Text style={styles.ratingRowLabel}>{label}</Text>
                  <View style={styles.ratingRowStars}>
                    {Array.from({ length: 5 }).map((_, index) => {
                      const ratingValue = index + 1;
                      return (
                        <Pressable key={ratingValue} onPress={() => setter(ratingValue)}>
                          <Ionicons
                            name={ratingValue <= Number(value) ? "star" : "star-outline"}
                            size={28}
                            color="#0C766F"
                          />
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}

              <View style={styles.modalActions}>
                <Pressable style={styles.modalGhost} onPress={() => setReviewOpen(false)}>
                  <Text style={styles.modalGhostText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.modalSolid} onPress={submitReview} disabled={reviewSaving}>
                  <Text style={styles.modalSolidText}>{reviewSaving ? "Saving..." : "Submit review"}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </ScreenBody>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 18, paddingBottom: 32 },
  error: { color: "#C05343", fontWeight: "800", marginBottom: 12 },
  ratingCard: {
    backgroundColor: "#3CA171",
    borderRadius: 26,
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  ratingTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "900", textAlign: "center" },
  starsRow: { marginTop: 20, flexDirection: "row", justifyContent: "center", gap: 12 },
  ratingHint: { marginTop: 14, color: "rgba(255,255,255,0.84)", fontWeight: "700", textAlign: "center" },
  receiptShell: { marginTop: 18, borderRadius: 28, padding: 18 },
  statusWrapDefault: { backgroundColor: "#0B6E69" },
  statusWrapExpired: { backgroundColor: "#8B6C2F" },
  statusWrapCancelled: { backgroundColor: "#9C564C" },
  receiptStatusRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 16 },
  receiptStatusText: { color: "#FFFFFF", fontWeight: "900", fontSize: 18 },
  receiptInner: { backgroundColor: "#FFFFFF", borderRadius: 24, padding: 18 },
  pickupPinCard: {
    marginTop: 16,
    backgroundColor: "#123A36",
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 18,
    alignItems: "center",
  },
  pickupPinLabel: { color: "#B8D8D2", fontSize: 13, fontWeight: "800", textTransform: "uppercase" },
  pickupPinValue: { marginTop: 10, color: "#FFFFFF", fontSize: 44, fontWeight: "900", letterSpacing: 6 },
  pickupPinHint: { marginTop: 8, color: "#D4E9E4", fontWeight: "700" },
  storeRow: { flexDirection: "row", alignItems: "center" },
  storeLogoWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  storeLogoImage: { width: "100%", height: "100%" },
  storeLogoText: { color: "#0C766F", fontWeight: "900", fontSize: 20 },
  storeMain: { flex: 1, marginLeft: 14 },
  storeName: { color: "#1F2C2B", fontSize: 20, fontWeight: "900" },
  storeAddress: { marginTop: 4, color: "#5E6B69", fontSize: 14, fontWeight: "700" },
  detailGrid: { marginTop: 24, flexDirection: "row", flexWrap: "wrap", gap: 22 },
  detailCell: { width: "45%" },
  detailCellWide: { width: "100%" },
  detailLabel: { color: "#92A09D", fontSize: 13, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.8 },
  detailValue: { marginTop: 8, color: "#1F2C2B", fontSize: 18, fontWeight: "500" },
  pickupNote: {
    marginTop: 16,
    borderRadius: 20,
    backgroundColor: "#EAF7F3",
    borderWidth: 1,
    borderColor: "#D8ECE6",
    padding: 16,
    flexDirection: "row",
    gap: 10,
  },
  pickupNoteText: { flex: 1, color: "#305652", fontWeight: "700", lineHeight: 22 },
  sectionHeader: {
    marginTop: 24,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 22, fontWeight: "900", color: "#1F2C2B" },
  itemCard: {
    borderWidth: 1,
    borderColor: "#E1EAE6",
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    padding: 16,
    marginBottom: 14,
    shadowColor: "#23413C",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  itemCardTop: { flexDirection: "row", alignItems: "center" },
  itemBadgeCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#F1F7F4",
    borderWidth: 2,
    borderColor: "#2F7A6A",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  itemBadgeImage: { width: "100%", height: "100%" },
  itemBadgeText: { color: "#116B62", fontWeight: "900", fontSize: 18 },
  itemCardMain: { flex: 1, marginLeft: 14, marginRight: 12 },
  itemCardTitle: { fontSize: 17, fontWeight: "900", color: "#1F2C2B" },
  itemCardSubtitle: { marginTop: 5, fontSize: 14, color: "#72817F", fontWeight: "700" },
  itemMetaRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  itemMetaPill: {
    borderRadius: 999,
    backgroundColor: "#F3F8F5",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  itemMetaPillText: { color: "#116B62", fontWeight: "800", fontSize: 13 },
  itemMetaText: { flex: 1, textAlign: "right", color: "#8C9996", fontWeight: "700", fontSize: 12 },
  itemPriceRow: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#EEF2F0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemPriceValue: { fontSize: 20, fontWeight: "900", color: "#1F2C2B" },
  itemSavedText: { color: "#116B62", fontWeight: "800", fontSize: 14 },
  helpLink: { marginTop: 18, alignItems: "center", justifyContent: "center", paddingVertical: 12, gap: 6 },
  helpText: { color: "#253230", fontSize: 18, fontWeight: "500" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(19, 27, 27, 0.28)",
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  modalBackdrop: { ...StyleSheet.absoluteFillObject },
  modalCard: {
    backgroundColor: "#FFFDF8",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E1EAE6",
    padding: 20,
  },
  modalTitle: { color: "#1F2C2B", fontSize: 22, fontWeight: "900" },
  modalBody: { marginTop: 8, color: "#64716F", fontWeight: "700", lineHeight: 24 },
  ratingRow: { marginTop: 18 },
  ratingRowLabel: { color: "#1F2C2B", fontWeight: "800", fontSize: 16 },
  ratingRowStars: { marginTop: 8, flexDirection: "row", gap: 8 },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 24 },
  modalGhost: { paddingHorizontal: 14, paddingVertical: 12 },
  modalGhostText: { color: "#6F7D7B", fontWeight: "800" },
  modalSolid: { backgroundColor: "#116B62", borderRadius: 999, paddingHorizontal: 18, paddingVertical: 12 },
  modalSolidText: { color: "#FFFFFF", fontWeight: "900" },
  emptyWrap: {
    borderWidth: 1,
    borderColor: "#E1EAE6",
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    padding: 22,
  },
  emptyText: { color: "#72817F", fontWeight: "700" },
});
