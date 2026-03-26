import { View, Text, StyleSheet, Pressable } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function ScreenHeader({
  title,
  showBack = false,
  onBack,
  right,
}: {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 10 }]}>
      <View style={styles.row}>
        <View style={styles.left}>
          {showBack ? (
            <Pressable
              onPress={onBack ?? (() => router.back())}
              hitSlop={10}
              style={styles.backBtn}
            >
              <Text style={styles.backText}>‹</Text>
            </Pressable>
          ) : (
            <View style={styles.backBtnPlaceholder} />
          )}
        </View>

        <View style={styles.center}>
          {title ? <Text style={styles.title} numberOfLines={1}>{title}</Text> : null}
        </View>

        <View style={styles.right}>{right ?? <View style={styles.rightPlaceholder} />}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: "#FFFCF6",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E1EAE6",
  },
  row: { flexDirection: "row", alignItems: "center" },
  left: { width: 44, alignItems: "flex-start" },
  center: { flex: 1, alignItems: "center" },
  right: { width: 44, alignItems: "flex-end" },

  title: { fontSize: 18, fontWeight: "800", color: "#1F2C2B" },

  backBtn: {
    width: 40,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F8F5",
  },
  backText: { fontSize: 30, fontWeight: "700", color: "#116B62", marginTop: -4 },

  backBtnPlaceholder: { width: 40, height: 36 },
  rightPlaceholder: { width: 40, height: 36 },
});
