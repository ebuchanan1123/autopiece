import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getListing, type Listing } from "@/src/features/listings/listings.api";
import { reserveOrder } from "@/src/features/orders/orders.api";
import { getProfileSettings, type PaymentCard } from "@/src/features/profile/profile.store";

type PaymentMethodOption =
  | { kind: "saved_card"; title: string; subtitle: string; card?: PaymentCard }
  | { kind: "card_checkout"; title: string; subtitle: string };

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();
  const listingId = Number(params.id);

  const [listing, setListing] = useState<Listing | null>(null);
  const [cards, setCards] = useState<PaymentCard[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodOption | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [nextListing, profile] = await Promise.all([
          getListing(listingId),
          getProfileSettings(),
        ]);

        setListing(nextListing);
        setCards(profile.paymentCards);
        if (profile.paymentCards.length > 0) {
          const firstCard = profile.paymentCards[0];
          setSelectedMethod({
            kind: "saved_card",
            title: firstCard.cardType,
            subtitle: `•••• ${firstCard.last4}`,
            card: firstCard,
          });
        } else {
          setSelectedMethod({
            kind: "card_checkout",
            title: "Card checkout",
            subtitle: "Secure online payment will be finalized with SATIM",
          });
        }
      } catch (e: any) {
        setError(e?.message ?? "Could not load checkout");
      } finally {
        setLoading(false);
      }
    })();
  }, [listingId]);

  const paymentOptions = useMemo<PaymentMethodOption[]>(() => {
    const methods: PaymentMethodOption[] = [];
    for (const card of cards) {
      methods.push({
        kind: "saved_card",
        title: card.cardType,
        subtitle: `•••• ${card.last4}  •  ${card.expiry}`,
        card,
      });
    }
    methods.push({
      kind: "card_checkout",
      title: "Card checkout",
      subtitle: "Use the current online payment flow while SATIM is being finalized",
    });
    return methods;
  }, [cards]);

  const maxQuantity = Math.max(1, Math.min(10, listing?.quantityAvailable ?? 1));
  const subtotal = (listing?.priceDzd ?? 0) * quantity;
  const serviceFee = 0;
  const total = subtotal + serviceFee;

  async function onPay() {
    if (!listing || !selectedMethod) return;

    try {
      setPaying(true);
      const response = await reserveOrder(listing.id, quantity, {
        paymentMethod: "online",
        paymentProvider: selectedMethod.kind === "saved_card" ? "saved_card" : undefined,
        paymentCardLast4:
          selectedMethod.kind === "saved_card" ? selectedMethod.card?.last4 : undefined,
      });

      if (response.status === "payment_pending" && response.checkoutUrl) {
        await Linking.openURL(response.checkoutUrl);
        Alert.alert(
          "Payment started",
          "Complete the secure card checkout to confirm your Surprise Bag.",
        );
      } else {
        Alert.alert(
          "Reservation confirmed",
          "Your Surprise Bag is reserved and the seller has been notified to prepare it.",
        );
      }
      router.replace({
        pathname: "/(app)/order-confirmed/[id]",
        params: { id: String(response.orderId) },
      });
      return response;
    } catch (e: any) {
      Alert.alert("Checkout failed", e?.message ?? "Please try again.");
    } finally {
      setPaying(false);
    }
  }

  function paymentLabel() {
    if (!selectedMethod) return "Pay";
    if (selectedMethod.kind === "card_checkout") return "Confirm order";
    return "Pay now";
  }

  function paymentIconName() {
    return "card-outline" as const;
  }

  return (
    <>
      <Stack.Screen options={{ title: "", headerShown: false }} />
      <View style={styles.root}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#0C766F" />
          </View>
        ) : error || !listing ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error ?? "Checkout unavailable."}</Text>
          </View>
        ) : (
          <>
            <ScrollView
              contentContainerStyle={[
                styles.container,
                { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 132 },
              ]}
              showsVerticalScrollIndicator={false}
            >
              <Pressable onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={26} color="#1F2C2B" />
              </Pressable>

              <View style={styles.brandDot} />
              <Text style={styles.title}>{listing.title}</Text>

              <View style={styles.pickupRow}>
                <View style={styles.pickupPill}>
                  <Text style={styles.pickupPillText}>Pick up today</Text>
                </View>
                <Text style={styles.pickupTime}>
                  {formatPickupRange(listing.pickupStartAt, listing.pickupEndAt)}
                </Text>
              </View>

              <View style={styles.panel}>
                <Text style={styles.panelLabel}>Payment method</Text>
                <Text style={styles.panelHint}>
                  Online card payments are still in the final integration phase. This checkout flow
                  keeps reservations working while SATIM is being connected.
                </Text>
                <View style={styles.methodRow}>
                  <View style={styles.methodLeft}>
                    <View style={styles.methodIconBox}>
                      <Ionicons name={paymentIconName()} size={28} color="#26312F" />
                    </View>
                    <View>
                      <Text style={styles.methodTitle}>{selectedMethod?.title}</Text>
                      <Text style={styles.methodSubtitle}>{selectedMethod?.subtitle}</Text>
                    </View>
                  </View>
                  <Pressable onPress={() => setSheetOpen(true)}>
                    <Text style={styles.changeText}>Change</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.summaryCard}>
                <SummaryRow label="Subtotal" value={`${subtotal} DZD`} />
                <SummaryRow label="Service fee" value={`${serviceFee} DZD`} />
                <SummaryRow label="Total" value={`${total} DZD`} strong />
              </View>

              <Text style={styles.termsText}>
                By paying for this meal you agree to the app&apos;s terms and privacy policy.
              </Text>
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
              <View style={styles.qtyWrap}>
                <Pressable
                  style={styles.qtyButton}
                  onPress={() => setQuantity((value) => Math.max(1, value - 1))}
                >
                  <Ionicons name="remove" size={24} color="#778583" />
                </Pressable>
                <Text style={styles.qtyValue}>{quantity}</Text>
                <Pressable
                  style={styles.qtyButton}
                  onPress={() => setQuantity((value) => Math.min(maxQuantity, value + 1))}
                >
                  <Ionicons name="add" size={24} color="#778583" />
                </Pressable>
              </View>

              <Pressable
                style={[
                  styles.payButton,
                  paying ? styles.payButtonDisabled : null,
                ]}
                onPress={onPay}
                disabled={paying}
              >
                <Ionicons name={paymentIconName()} size={22} color="#FFFFFF" />
                <Text style={styles.payButtonText}>{paying ? "Processing..." : paymentLabel()}</Text>
              </Pressable>
            </View>
          </>
        )}

        <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={() => setSheetOpen(false)}>
          <View style={styles.sheetOverlay}>
            <Pressable style={styles.sheetBackdrop} onPress={() => setSheetOpen(false)} />
            <View style={[styles.sheet, { paddingBottom: insets.bottom + 18 }]}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Select a payment method</Text>
                <Pressable onPress={() => setSheetOpen(false)}>
                  <Ionicons name="close" size={30} color="#1F2C2B" />
                </Pressable>
              </View>

              {paymentOptions.map((option) => {
                const active =
                  option.kind === selectedMethod?.kind &&
                  (option.kind !== "saved_card" ||
                    (selectedMethod?.kind === "saved_card" &&
                      option.card?.id === selectedMethod.card?.id));

                return (
                  <Pressable
                    key={option.kind === "saved_card" ? option.card?.id : option.kind}
                    style={styles.sheetOption}
                    onPress={() => {
                      setSelectedMethod(option);
                      setSheetOpen(false);
                    }}
                  >
                    <View style={styles.methodIconBox}>
                      <Ionicons name="card-outline" size={28} color="#26312F" />
                    </View>
                    <View style={styles.sheetOptionText}>
                      <Text style={styles.sheetOptionTitle}>{option.title}</Text>
                      <Text style={styles.sheetOptionSubtitle}>{option.subtitle}</Text>
                    </View>
                    {active ? (
                      <Ionicons name="checkmark-circle" size={26} color="#0C766F" />
                    ) : (
                      <Ionicons name="chevron-forward" size={22} color="#879391" />
                    )}
                  </Pressable>
                );
              })}

              <Pressable
                style={styles.addCardButton}
                onPress={() => {
                  setSheetOpen(false);
                  router.push("/(app)/payment-cards");
                }}
              >
                <Text style={styles.addCardButtonText}>Manage saved cards</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
}

function SummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, strong ? styles.summaryStrong : null]}>{label}</Text>
      <Text style={[styles.summaryValue, strong ? styles.summaryStrong : null]}>{value}</Text>
    </View>
  );
}

function formatPickupRange(start?: string | null, end?: string | null) {
  if (!start && !end) return "Pickup time to be confirmed";

  const locale = "en";
  const format = (value: string) =>
    new Date(value).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });

  if (start && end) return `${format(start)} - ${format(end)}`;
  if (start) return format(start);
  return format(end as string);
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFDF8" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  container: { paddingHorizontal: 22 },
  backButton: { width: 44, height: 44, justifyContent: "center" },
  errorText: { color: "#A44338", fontWeight: "700", fontSize: 16, textAlign: "center" },
  brandDot: {
    alignSelf: "center",
    width: 38,
    height: 10,
    borderRadius: 999,
    backgroundColor: "#D6E1DE",
    marginTop: 24,
    marginBottom: 18,
  },
  title: {
    fontSize: 28,
    lineHeight: 38,
    fontWeight: "900",
    color: "#1F2C2B",
    textAlign: "center",
  },
  pickupRow: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  pickupPill: {
    backgroundColor: "#F3F2EE",
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  pickupPillText: { fontWeight: "800", color: "#26312F", fontSize: 15 },
  pickupTime: { fontSize: 18, fontWeight: "700", color: "#26312F" },
  panel: {
    marginTop: 28,
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "#DFE7E3",
    padding: 22,
  },
  panelLabel: {
    textTransform: "uppercase",
    fontSize: 14,
    letterSpacing: 0.8,
    fontWeight: "900",
    color: "#26312F",
  },
  panelHint: {
    marginTop: 10,
    color: "#72817F",
    fontWeight: "600",
    lineHeight: 22,
  },
  methodRow: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  methodLeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
  methodIconBox: {
    width: 62,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D7E0DC",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  methodTitle: { fontSize: 18, fontWeight: "800", color: "#26312F" },
  methodSubtitle: { marginTop: 4, color: "#72817F", fontWeight: "600" },
  changeText: { color: "#0C766F", fontSize: 16, fontWeight: "800" },
  summaryCard: {
    marginTop: 18,
    backgroundColor: "#F4F5F3",
    borderRadius: 26,
    paddingHorizontal: 22,
    paddingVertical: 18,
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  summaryLabel: { fontSize: 17, color: "#677572" },
  summaryValue: { fontSize: 17, color: "#677572" },
  summaryStrong: { fontSize: 20, fontWeight: "900", color: "#1F2C2B" },
  termsText: {
    marginTop: 24,
    paddingHorizontal: 18,
    textAlign: "center",
    color: "#657370",
    fontSize: 16,
    lineHeight: 28,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFDF8",
    paddingHorizontal: 22,
    paddingTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  qtyWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#EEF2F1",
    borderRadius: 26,
    width: 116,
    height: 68,
    paddingHorizontal: 14,
  },
  qtyButton: { padding: 4 },
  qtyValue: { fontSize: 24, fontWeight: "700", color: "#677572" },
  payButton: {
    flex: 1,
    height: 68,
    borderRadius: 28,
    backgroundColor: "#0C766F",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  payButtonDisabled: { opacity: 0.7 },
  payButtonText: { color: "#FFFFFF", fontSize: 18, fontWeight: "900" },
  sheetOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.22)", justifyContent: "flex-end" },
  sheetBackdrop: { flex: 1 },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 20,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sheetTitle: { fontSize: 22, fontWeight: "900", color: "#111918" },
  sheetOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 16,
  },
  sheetOptionText: { flex: 1 },
  sheetOptionTitle: { fontSize: 18, fontWeight: "800", color: "#1F2C2B" },
  sheetOptionSubtitle: { marginTop: 4, color: "#6F7D7A", fontWeight: "600" },
  addCardButton: {
    marginTop: 12,
    backgroundColor: "#F2F8F6",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
  },
  addCardButtonText: { color: "#0C766F", fontWeight: "800", fontSize: 16 },
});
