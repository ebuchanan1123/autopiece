import { ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenBody } from "@/src/components/screen-body";
import { ScreenHeader } from "@/src/components/screen-header";

const LEGAL_SECTIONS = [
  {
    title: "Privacy policy",
    body: "Too Good To Go DZ collects only the information needed to operate the app, process orders, support pickups, improve reliability, and meet legal obligations. This can include account details, order history, saved preferences, device information, and payment-related metadata needed to confirm transactions.",
  },
  {
    title: "No sale of personal information",
    body: "We do not sell, rent, trade, or distribute users' personal information to advertisers, data brokers, or unrelated third parties. If we ever work with service providers, they may only process data on our instructions and only for operating the service.",
  },
  {
    title: "Payments and card safety",
    body: "For MVP testing, the app may store masked card details such as card type, expiry date, and last 4 digits to help users choose a payment method faster. Full card numbers and CVV/CVC security codes are not stored after payment entry. Payment processing data is used only to complete purchases and maintain transaction records.",
  },
  {
    title: "How your information is used",
    body: "We use account and order information to let users discover food listings, reserve bags, receive order updates, manage settings, prevent abuse, investigate fraud, and improve the product. Sellers receive only the operational details needed to prepare and fulfill a user's order.",
  },
  {
    title: "Data sharing and security",
    body: "Access to personal data is limited to the people, systems, and providers who need it to run the service. We use reasonable technical and organizational safeguards to reduce the risk of unauthorized access, misuse, or disclosure. No system can promise absolute security, but protecting user data is a core product requirement.",
  },
  {
    title: "User rights and account controls",
    body: "Users may review and update their account details inside the app. Requests to delete an account, export data, or correct inaccurate information will be supported as the service matures. The app should never use personal information in ways that are unrelated to food-rescue ordering without a valid legal basis.",
  },
  {
    title: "Children and launch status",
    body: "This app is intended for general consumer use and is being prepared as a polished MVP for launch. Some support and compliance workflows will continue to be refined, but the core privacy position remains the same: user information is collected sparingly, used only for the service, and never commoditized.",
  },
];

export default function LegalScreen() {
  return (
    <>
      <ScreenHeader title="Legal" showBack />
      <ScreenBody>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          {LEGAL_SECTIONS.map((section) => (
            <View key={section.title} style={styles.card}>
              <Text style={styles.cardTitle}>{section.title}</Text>
              <Text style={styles.cardText}>{section.body}</Text>
            </View>
          ))}
        </ScrollView>
      </ScreenBody>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 18, paddingBottom: 36, backgroundColor: "#FFFDF8" },
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
});
