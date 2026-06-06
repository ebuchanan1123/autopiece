import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getOrderDetails, type OrderDetails } from "@/src/features/orders/orders.api";

function formatDate(value?: string | null) {
  if (!value) return "Pickup time will appear in your order";
  return new Date(value).toLocaleString("en-CA", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function OrderConfirmedScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();
  const orderId = Number(params.id);
  const [data, setData] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setData(await getOrderDetails(orderId));
    } catch (e: any) {
      setError(e?.message ?? "Could not load your order.");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  const item = data?.items[0] ?? null;
  const pickupPin = data?.pickupPin ?? data?.order.pickupPin ?? "----";
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.root}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#0C766F" />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.error}>{error}</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={[styles.content, { paddingTop: insets.top + 22, paddingBottom: insets.bottom + 28 }]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.hero}>
              <View style={styles.heroIcon}>
                <Ionicons name="checkmark" size={40} color="#FFFFFF" />
              </View>
              <Text style={styles.eyebrow}>Reservation confirmed</Text>
              <Text style={styles.title}>Show this pickup PIN to the seller</Text>
              <Text style={styles.subtitle}>
                The seller will use this code to confirm that your bag has been collected.
              </Text>
            </View>

            <View style={styles.pinCard}>
              <Text style={styles.pinLabel}>Pickup PIN</Text>
              <Text style={styles.pinValue}>{pickupPin}</Text>
              <Text style={styles.pinHint}>Keep this screen open when you arrive.</Text>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>{item?.listing?.title ?? "Your order"}</Text>
              <Text style={styles.infoMeta}>{data?.order.orderNumber ?? ""}</Text>
              <Text style={styles.infoBody}>
                Total: {data?.order.totalDzd ?? 0} DZD
              </Text>
              <Text style={styles.infoBody}>Pickup window: {formatDate(item?.listing?.pickupStartAt ?? null)}</Text>
            </View>

            <Pressable style={styles.primaryBtn} onPress={() => router.replace("/(app)/orders")}>
              <Text style={styles.primaryBtnText}>View my orders</Text>
            </Pressable>

            <Pressable style={styles.secondaryBtn} onPress={() => router.replace({ pathname: "/(app)/order/[id]", params: { id: String(orderId) } })}>
              <Text style={styles.secondaryBtnText}>Open order details</Text>
            </Pressable>
          </ScrollView>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFDF8" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  content: { paddingHorizontal: 20 },
  hero: { alignItems: "center" },
  heroIcon: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: "#0C766F",
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrow: { marginTop: 18, color: "#0C766F", fontWeight: "900", fontSize: 13, textTransform: "uppercase" },
  title: { marginTop: 10, color: "#1F2C2B", fontWeight: "900", fontSize: 30, textAlign: "center" },
  subtitle: { marginTop: 12, color: "#60706D", fontWeight: "700", textAlign: "center", lineHeight: 24 },
  pinCard: {
    marginTop: 24,
    backgroundColor: "#123A36",
    borderRadius: 28,
    paddingVertical: 28,
    paddingHorizontal: 18,
    alignItems: "center",
  },
  pinLabel: { color: "#B8D8D2", fontWeight: "800", fontSize: 14, textTransform: "uppercase" },
  pinValue: { marginTop: 12, color: "#FFFFFF", fontSize: 56, fontWeight: "900", letterSpacing: 8 },
  pinHint: { marginTop: 10, color: "#D3E7E2", fontWeight: "700" },
  infoCard: {
    marginTop: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E1EAE6",
    padding: 18,
  },
  infoTitle: { color: "#1F2C2B", fontWeight: "900", fontSize: 20 },
  infoMeta: { marginTop: 8, color: "#71807D", fontWeight: "800" },
  infoBody: { marginTop: 10, color: "#42514F", fontWeight: "700" },
  primaryBtn: {
    marginTop: 22,
    backgroundColor: "#0C766F",
    borderRadius: 18,
    alignItems: "center",
    paddingVertical: 16,
  },
  primaryBtnText: { color: "#FFFFFF", fontWeight: "900", fontSize: 16 },
  secondaryBtn: {
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#D7E4E0",
    alignItems: "center",
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
  },
  secondaryBtnText: { color: "#1F2C2B", fontWeight: "900", fontSize: 16 },
  error: { color: "#B54E41", fontWeight: "800", textAlign: "center" },
});
