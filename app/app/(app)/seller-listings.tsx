import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { ScreenBody } from "@/src/components/screen-body";
import { ScreenHeader } from "@/src/components/screen-header";
import { getMyListings, type Listing, updateListing } from "@/src/features/listings/listings.api";

export default function SellerListingsScreen() {
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restockTarget, setRestockTarget] = useState<Listing | null>(null);
  const [restockAmount, setRestockAmount] = useState("1");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setItems(await getMyListings());
    } catch (e: any) {
      setError(e?.message ?? "Could not load your listings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const activeCount = useMemo(() => items.filter((item) => item.status === "active").length, [items]);
  const soldOutCount = useMemo(() => items.filter((item) => item.status === "sold_out").length, [items]);

  async function markSoldOut(item: Listing) {
    try {
      await updateListing(item.id, { status: "sold_out", quantityAvailable: 0 });
      await load();
    } catch (e: any) {
      Alert.alert("Could not mark listing sold out", e?.message ?? "Please try again.");
    }
  }

  async function submitRestock() {
    if (!restockTarget) return;
    const quantity = Number(restockAmount);
    if (!Number.isFinite(quantity) || quantity < 1) {
      Alert.alert("Invalid quantity", "Enter a quantity of at least 1.");
      return;
    }

    try {
      setSaving(true);
      await updateListing(restockTarget.id, { quantityAvailable: quantity, status: "active" });
      setRestockTarget(null);
      setRestockAmount("1");
      await load();
    } catch (e: any) {
      Alert.alert("Could not restock listing", e?.message ?? "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <ScreenHeader title="My listings" showBack />
      <ScreenBody>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={load} tintColor="#0B6E69" colors={["#0B6E69"]} />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Active</Text>
              <Text style={styles.summaryValue}>{activeCount}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Sold out</Text>
              <Text style={styles.summaryValue}>{soldOutCount}</Text>
            </View>
          </View>

          <Pressable style={styles.createButton} onPress={() => router.push("/(app)/seller-listing-new")}>
            <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
            <Text style={styles.createButtonText}>Create new listing</Text>
          </Pressable>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {items.length ? (
            items.map((item) => {
              const soldOut = item.status === "sold_out";
              return (
                <View key={item.id} style={[styles.card, soldOut ? styles.cardSoldOut : null]}>
                  <View style={styles.bannerWrap}>
                    {item.imageUrl ? (
                      <Image source={{ uri: item.imageUrl }} style={styles.bannerImage} />
                    ) : (
                      <View style={styles.bannerFallback}>
                        <Text style={styles.bannerFallbackText}>{item.category}</Text>
                      </View>
                    )}
                    <View style={styles.overlayRow}>
                      <View style={[styles.statusPill, soldOut ? styles.soldOutPill : styles.activePill]}>
                        <Text style={[styles.statusPillText, soldOut ? styles.soldOutPillText : null]}>
                          {soldOut ? "Sold out" : `${item.quantityAvailable} left`}
                        </Text>
                      </View>
                      <Text style={styles.priceText}>{item.priceDzd} DZD</Text>
                    </View>
                  </View>

                  <View style={styles.cardBody}>
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.subtitle} numberOfLines={2}>
                      {item.description}
                    </Text>
                    <Text style={styles.meta}>
                      {item.city}, {item.wilaya} • {item.category}
                    </Text>

                    <View style={styles.ratingRow}>
                      <View style={styles.ratingPill}>
                        <Ionicons name="star" size={15} color="#19B37A" />
                        <Text style={styles.ratingValue}>
                          {Number(item.ratingAvg ?? 0) > 0 ? Number(item.ratingAvg).toFixed(1) : "New"}
                        </Text>
                      </View>
                      <Text style={styles.ratingCount}>
                        {Number(item.ratingCount ?? 0) > 0
                          ? `${item.ratingCount} review${item.ratingCount === 1 ? "" : "s"}`
                          : "No reviews yet"}
                      </Text>
                    </View>

                    <View style={styles.actionsRow}>
                      <Pressable
                        style={[styles.actionButton, styles.actionGhost]}
                        onPress={() => router.push(`/(app)/seller-listing-edit/${item.id}`)}
                      >
                        <Text style={styles.actionGhostText}>Edit listing</Text>
                      </Pressable>

                      <Pressable
                        style={[styles.actionButton, styles.actionSecondary]}
                        onPress={() => {
                          setRestockTarget(item);
                          setRestockAmount(String(Math.max(item.quantityAvailable || 1, 1)));
                        }}
                      >
                        <Text style={styles.actionSecondaryText}>Restock</Text>
                      </Pressable>
                    </View>

                    {!soldOut ? (
                      <Pressable
                        style={[styles.actionButton, styles.actionDanger]}
                        onPress={() =>
                          Alert.alert("Mark sold out", "This listing will be hidden from customers until you restock it.", [
                            { text: "Cancel", style: "cancel" },
                            { text: "Mark sold out", style: "destructive", onPress: () => markSoldOut(item) },
                          ])
                        }
                      >
                        <Text style={styles.actionDangerText}>Mark sold out</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No listings yet</Text>
              <Text style={styles.emptyText}>
                Create your first bag here, then come back to restock or mark it sold out whenever you need.
              </Text>
            </View>
          )}
        </ScrollView>

        <Modal visible={!!restockTarget} transparent animationType="fade" onRequestClose={() => setRestockTarget(null)}>
          <View style={styles.modalOverlay}>
            <Pressable style={styles.modalBackdrop} onPress={() => setRestockTarget(null)} />
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Restock listing</Text>
              <Text style={styles.modalText}>
                Enter how many orders should be available for {restockTarget?.title ?? "this listing"}.
              </Text>
              <TextInput
                style={styles.modalInput}
                value={restockAmount}
                onChangeText={setRestockAmount}
                keyboardType="number-pad"
                placeholder="4"
                placeholderTextColor="#6F7D7B"
              />
              <View style={styles.modalActions}>
                <Pressable style={styles.modalGhost} onPress={() => setRestockTarget(null)}>
                  <Text style={styles.modalGhostText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.modalSolid} onPress={submitRestock} disabled={saving}>
                  <Text style={styles.modalSolidText}>{saving ? "Saving..." : "Restock"}</Text>
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
  content: { padding: 18, paddingBottom: 34, backgroundColor: "#FFFDF8" },
  summaryRow: { flexDirection: "row", gap: 12, marginBottom: 14 },
  summaryCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E1EAE6",
    padding: 16,
  },
  summaryLabel: { color: "#72817F", fontWeight: "800", fontSize: 13, textTransform: "uppercase" },
  summaryValue: { color: "#1F2C2B", fontSize: 24, fontWeight: "900", marginTop: 8 },
  createButton: {
    backgroundColor: "#116B62",
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  createButtonText: { color: "#FFFFFF", fontWeight: "900", fontSize: 16 },
  error: { marginBottom: 12, color: "#B54E41", fontWeight: "800" },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E1EAE6",
    overflow: "hidden",
    marginBottom: 16,
  },
  cardSoldOut: { opacity: 0.78 },
  bannerWrap: { position: "relative" },
  bannerImage: { width: "100%", height: 158 },
  bannerFallback: { height: 158, backgroundColor: "#C7D8D7", alignItems: "center", justifyContent: "center" },
  bannerFallbackText: { color: "#285C59", fontWeight: "900", fontSize: 22 },
  overlayRow: {
    position: "absolute",
    top: 14,
    left: 14,
    right: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusPill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#FFF0A8" },
  activePill: { backgroundColor: "#FFF0A8" },
  soldOutPill: { backgroundColor: "rgba(255,255,255,0.92)" },
  statusPillText: { color: "#334240", fontWeight: "900", fontSize: 13 },
  soldOutPillText: { color: "#5D6A68" },
  priceText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    textShadowColor: "rgba(0,0,0,0.28)",
    textShadowRadius: 10,
  },
  cardBody: { padding: 18 },
  title: { color: "#1F2C2B", fontSize: 24, fontWeight: "900" },
  subtitle: { marginTop: 8, color: "#5D6A68", fontWeight: "700", lineHeight: 22 },
  meta: { marginTop: 10, color: "#7A8784", fontWeight: "800" },
  ratingRow: { marginTop: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#DCE6E2",
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  ratingValue: { color: "#1F2C2B", fontWeight: "900", fontSize: 14 },
  ratingCount: { color: "#72817F", fontWeight: "700", fontSize: 14 },
  actionsRow: { flexDirection: "row", gap: 10, marginTop: 18 },
  actionButton: { flex: 1, borderRadius: 16, alignItems: "center", justifyContent: "center", paddingVertical: 14 },
  actionGhost: { borderWidth: 1, borderColor: "#D9E6E2", backgroundColor: "#FFFFFF" },
  actionGhostText: { color: "#1F2C2B", fontWeight: "900" },
  actionSecondary: { backgroundColor: "#E8F5F2" },
  actionSecondaryText: { color: "#116B62", fontWeight: "900" },
  actionDanger: { marginTop: 10, borderWidth: 1, borderColor: "#E8C8CF", backgroundColor: "#FFF8F9" },
  actionDangerText: { color: "#B54E41", fontWeight: "900" },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E1EAE6",
    padding: 22,
  },
  emptyTitle: { color: "#1F2C2B", fontSize: 20, fontWeight: "900" },
  emptyText: { marginTop: 8, color: "#72817F", fontWeight: "700", lineHeight: 24 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(28, 36, 34, 0.28)",
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
  modalText: { marginTop: 8, color: "#64716F", fontWeight: "700", lineHeight: 24 },
  modalInput: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#DCE6E2",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1F2C2B",
  },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 18 },
  modalGhost: { paddingHorizontal: 14, paddingVertical: 12 },
  modalGhostText: { color: "#6F7D7B", fontWeight: "800" },
  modalSolid: { backgroundColor: "#116B62", borderRadius: 999, paddingHorizontal: 18, paddingVertical: 12 },
  modalSolidText: { color: "#FFFFFF", fontWeight: "900" },
});
