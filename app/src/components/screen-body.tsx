import { View, StyleSheet } from "react-native";

export function ScreenBody({ children }: { children: React.ReactNode }) {
  return <View style={styles.body}>{children}</View>;
}

const styles = StyleSheet.create({
  body: { flex: 1, backgroundColor: "#FFFDF8" },
});
