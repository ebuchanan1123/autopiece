import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenBody } from "@/src/components/screen-body";
import { ScreenHeader } from "@/src/components/screen-header";

const FAQS = [
  {
    title: "I was late for pickup",
    description: "Pickup windows are set by the business. If you miss the window, contact support and the store as soon as possible.",
  },
  {
    title: "My Surprise Bag was unavailable",
    description: "We’ll use this page later for refunds and issue reporting. For now, keep the order number and contact support.",
  },
  {
    title: "I need help with a reservation",
    description: "Reserved bags should appear in your orders. If something looks wrong, refresh the page and try again.",
  },
];

export default function HelpScreen() {
  return (
    <>
      <ScreenHeader title="Help with an order" showBack />
      <ScreenBody>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <Text style={styles.intro}>
            A lightweight support space for the most common order questions while we build fuller customer support.
          </Text>

          {FAQS.map((item) => (
            <View key={item.title} style={styles.card}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardText}>{item.description}</Text>
            </View>
          ))}

          <Pressable style={styles.contactBtn}>
            <Text style={styles.contactBtnText}>Contact support later</Text>
          </Pressable>
        </ScrollView>
      </ScreenBody>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 18, paddingBottom: 36, backgroundColor: "#FFFDF8" },
  intro: { fontSize: 17, lineHeight: 28, color: "#2F3A38", marginBottom: 18 },
  card: {
    borderWidth: 1,
    borderColor: "#E1EAE6",
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    padding: 18,
    marginBottom: 14,
  },
  cardTitle: { fontSize: 18, fontWeight: "900", color: "#1F2C2B" },
  cardText: { marginTop: 10, color: "#2F3A38", fontSize: 16, lineHeight: 26 },
  contactBtn: {
    marginTop: 8,
    backgroundColor: "#116B62",
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
  },
  contactBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 16 },
});
