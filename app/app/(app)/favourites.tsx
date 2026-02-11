import { View, Text, StyleSheet } from "react-native";

export default function FavouritesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Favourites</Text>
      <Text style={styles.text}>Coming next: saved listings.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 24 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 12 },
  text: { color: "#444" },
});
