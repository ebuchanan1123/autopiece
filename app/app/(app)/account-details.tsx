import { View, Text, StyleSheet } from "react-native";

export default function AccountDetailsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Account details</Text>
      <Text style={styles.text}>Coming soon: name, phone, email, password change.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 24 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 12 },
  text: { color: "#444" },
});
