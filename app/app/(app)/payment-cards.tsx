import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
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
  const [modalOpen, setModalOpen] = useState(false);
  const [holderName, setHolderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cardType, setCardType] = useState<PaymentCardType>("Carte Edahabia");

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
    const next = { ...profile, paymentCards: nextCards };
    setProfile(next);
    await saveProfileSettings(next);
  }

  async function addCard() {
    const digits = cardNumber.replace(/\D/g, "");
    if (holderName.trim().length < 3) {
      Alert.alert("Missing name", "Enter the name shown on the card.");
      return;
    }
    if (digits.length < 12) {
      Alert.alert("Invalid card", "Enter a valid card number.");
      return;
    }
    if (!/^\d{2}\/\d{2}$/.test(expiry.trim())) {
      Alert.alert("Invalid expiry", "Use MM/YY format.");
      return;
    }

    const nextCard: PaymentCard = {
      id: `${Date.now()}`,
      holderName: holderName.trim(),
      last4: digits.slice(-4),
      expiry: expiry.trim(),
      cardType,
    };

    await persist([nextCard, ...cards]);
    setModalOpen(false);
    setHolderName("");
    setCardNumber("");
    setExpiry("");
    setCardType("Carte Edahabia");
  }

  return (
    <>
      <ScreenHeader title="Payment cards" showBack />
      <ScreenBody>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Accepted payment methods in Algeria</Text>
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
                <Pressable onPress={() => persist(cards.filter((item) => item.id !== card.id))}>
                  <Ionicons name="trash-outline" size={20} color="#95A3A0" />
                </Pressable>
              </View>
              <Text style={styles.cardNumber}>•••• {card.last4}</Text>
              <View style={styles.cardMetaRow}>
                <Text style={styles.cardMeta}>{card.holderName}</Text>
                <Text style={styles.cardMeta}>{card.expiry}</Text>
              </View>
            </View>
          ))}

          {cards.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No saved cards yet</Text>
              <Text style={styles.emptyText}>
                Add the cards you want to support later. We only save the last 4 digits and card details for now.
              </Text>
            </View>
          ) : null}

          <Pressable style={styles.addBtn} onPress={() => setModalOpen(true)}>
            <Text style={styles.addBtnText}>Add a card</Text>
          </Pressable>

          <Text style={styles.securityNote}>
            Security code (CVV/CVC) will be requested at payment time and is never stored.
          </Text>
        </ScrollView>

        <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add payment card</Text>
                <Pressable onPress={() => setModalOpen(false)}>
                  <Ionicons name="close" size={28} color="#1F2C2B" />
                </Pressable>
              </View>

              <Text style={styles.fieldLabel}>Card type</Text>
              <View style={styles.typeWrap}>
                {CARD_TYPES.map((type) => {
                  const active = cardType === type;
                  return (
                    <Pressable
                      key={type}
                      style={[styles.typeChip, active ? styles.typeChipActive : styles.typeChipInactive]}
                      onPress={() => setCardType(type)}
                    >
                      <Text style={[styles.typeChipText, active ? styles.typeChipTextActive : styles.typeChipTextInactive]}>
                        {type}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>Name on card</Text>
              <TextInput style={styles.input} value={holderName} onChangeText={setHolderName} placeholder="Full name" placeholderTextColor="#6F7D7B" />

              <Text style={styles.fieldLabel}>Card number</Text>
              <TextInput
                style={styles.input}
                value={cardNumber}
                onChangeText={setCardNumber}
                keyboardType="number-pad"
                placeholder="Only used to get the last 4 digits"
                placeholderTextColor="#6F7D7B"
              />

              <Text style={styles.fieldLabel}>Expiry date</Text>
              <TextInput
                style={styles.input}
                value={expiry}
                onChangeText={setExpiry}
                placeholder="MM/YY"
                placeholderTextColor="#6F7D7B"
                maxLength={5}
              />

              <Pressable style={styles.saveBtn} onPress={addCard}>
                <Text style={styles.saveBtnText}>Save card</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </ScreenBody>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 18, paddingBottom: 36, backgroundColor: "#FFFDF8" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  loading: { color: "#72817F", fontWeight: "700" },
  title: { fontSize: 20, fontWeight: "900", color: "#1F2C2B", marginBottom: 12 },
  acceptedWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 18 },
  acceptedChip: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, backgroundColor: "#EDF7F3" },
  acceptedChipText: { color: "#116B62", fontWeight: "700" },
  card: {
    borderWidth: 1,
    borderColor: "#E1EAE6",
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    padding: 18,
    marginBottom: 14,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardType: { fontSize: 16, fontWeight: "800", color: "#1F2C2B" },
  cardNumber: { marginTop: 18, fontSize: 28, fontWeight: "900", color: "#116B62", letterSpacing: 1 },
  cardMetaRow: { marginTop: 16, flexDirection: "row", justifyContent: "space-between" },
  cardMeta: { color: "#72817F", fontWeight: "700" },
  emptyCard: { borderWidth: 1, borderColor: "#E1EAE6", borderRadius: 22, padding: 18, backgroundColor: "#FFFFFF", marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#1F2C2B" },
  emptyText: { marginTop: 8, color: "#72817F", lineHeight: 22, fontWeight: "600" },
  addBtn: { backgroundColor: "#116B62", borderRadius: 18, alignItems: "center", paddingVertical: 16 },
  addBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 16 },
  securityNote: {
    marginTop: 12,
    color: "#72817F",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "600",
  },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.25)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: "#FFFDF8", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  modalTitle: { fontSize: 22, fontWeight: "900", color: "#1F2C2B" },
  fieldLabel: { marginTop: 10, marginBottom: 8, color: "#43514F", fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderColor: "#DCE6E2",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1F2C2B",
  },
  typeWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 8 },
  typeChip: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1 },
  typeChipActive: { backgroundColor: "#116B62", borderColor: "#116B62" },
  typeChipInactive: { backgroundColor: "#FFFFFF", borderColor: "#E1EAE6" },
  typeChipText: { fontWeight: "700" },
  typeChipTextActive: { color: "#FFFFFF" },
  typeChipTextInactive: { color: "#116B62" },
  saveBtn: { marginTop: 20, backgroundColor: "#116B62", borderRadius: 18, alignItems: "center", paddingVertical: 16 },
  saveBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 16 },
});
