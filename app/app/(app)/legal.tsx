import { View, Text, StyleSheet } from "react-native";

export default function LegalScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Legal</Text>
      <Text style={styles.text}>Coming soon: Terms & Privacy Policy.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 24 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 12 },
  text: { color: "#444" },
});
