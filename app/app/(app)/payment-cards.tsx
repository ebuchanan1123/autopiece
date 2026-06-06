import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ScreenBody } from "@/src/components/screen-body";
import { ScreenHeader } from "@/src/components/screen-header";
import {
  getProfileSettings,
  saveProfileSettings,
  type PaymentCard,
  type PaymentCardType,
  type ProfileSettings,
} from "@/src/features/profile/profile.store";

const CARD_TYPES: PaymentCardType[] = [
  "Carte Edahabia",
  "Carte Bancaire Nationale",
  "Visa",
  "Mastercard",
];

export default function PaymentCardsScreen() {
  const [profile, setProfile] = useState<ProfileSettings | null>(null);

  useEffect(() => {
    getProfileSettings().then(setProfile);
  }, []);

  const cards = useMemo(() => profile?.paymentCards ?? [], [profile]);

  if (!profile) {
    return (
      <>
        <ScreenHeader title="Payment cards" showBack />
        <ScreenBody>
          <View style={styles.center}>
            <Text style={styles.loading}>Loading...</Text>
          </View>
        </ScreenBody>
      </>
    );
  }

  async function persist(nextCards: PaymentCard[]) {
    if (!profile) return;
    const next = { ...profile, paymentCards: nextCards };
    setProfile(next);
    await saveProfileSettings(next);
  }

  return (
    <>
      <ScreenHeader title="Payment cards" showBack />
      <ScreenBody>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Accepted payment methods in Algeria</Text>
          <Text style={styles.securityNote}>
            Saved cards will be enabled only through provider tokenization. The
            app must never store full card numbers or security codes.
          </Text>

          <View style={styles.acceptedWrap}>
            {CARD_TYPES.map((type) => (
              <View key={type} style={styles.acceptedChip}>
                <Text style={styles.acceptedChipText}>{type}</Text>
              </View>
            ))}
          </View>

          {cards.map((card) => (
            <View key={card.id} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.cardType}>{card.cardType}</Text>
                <Pressable
                  onPress={() =>
                    persist(cards.filter((item) => item.id !== card.id))
                  }
                >
                  <Ionicons name="trash-outline" size={20} color="#95A3A0" />
                </Pressable>
              </View>
              <Text style={styles.cardNumber}>Display only •••• {card.last4}</Text>
              <View style={styles.cardMetaRow}>
                <Text style={styles.cardMeta}>{card.holderName}</Text>
                <Text style={styles.cardMeta}>{card.expiry}</Text>
              </View>
            </View>
          ))}

          {cards.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Saved cards unavailable</Text>
              <Text style={styles.emptyText}>
                We are waiting for the payment provider to confirm tokenized
                saved-card support.
              </Text>
            </View>
          ) : null}

          <Pressable style={[styles.addBtn, styles.addBtnDisabled]} disabled>
            <Text style={styles.addBtnText}>Tokenized saved cards pending</Text>
          </Pressable>
        </ScrollView>
      </ScreenBody>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 18, paddingBottom: 36, backgroundColor: "#FFFDF8" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  loading: { color: "#72817F", fontWeight: "700" },
  title: {
    fontSize: 20,
    fontWeight: "900",
    color: "#1F2C2B",
    marginBottom: 12,
  },
  acceptedWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 18,
  },
  acceptedChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "#EDF7F3",
  },
  acceptedChipText: { color: "#116B62", fontWeight: "700" },
  card: {
    borderWidth: 1,
    borderColor: "#E1EAE6",
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    padding: 18,
    marginBottom: 14,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardType: { fontSize: 16, fontWeight: "800", color: "#1F2C2B" },
  cardNumber: {
    marginTop: 18,
    fontSize: 22,
    fontWeight: "900",
    color: "#116B62",
  },
  cardMetaRow: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardMeta: { color: "#72817F", fontWeight: "700" },
  emptyCard: {
    borderWidth: 1,
    borderColor: "#E1EAE6",
    borderRadius: 22,
    padding: 18,
    backgroundColor: "#FFFFFF",
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#1F2C2B" },
  emptyText: { marginTop: 8, color: "#72817F", lineHeight: 22, fontWeight: "600" },
  addBtn: {
    backgroundColor: "#116B62",
    borderRadius: 18,
    alignItems: "center",
    paddingVertical: 16,
  },
  addBtnDisabled: { opacity: 0.65 },
  addBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 16 },
  securityNote: {
    marginBottom: 14,
    color: "#72817F",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "600",
  },
});
