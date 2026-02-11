import { View, Text, StyleSheet } from "react-native";

export default function HelpScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Help with an order</Text>
      <Text style={styles.text}>Coming soon: FAQ + contact support.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 24 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 12 },
  text: { color: "#444" },
});
