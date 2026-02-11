import { useLayoutEffect } from "react";
import { View, Text, StyleSheet, Pressable, Alert } from "react-native";
import { router, useNavigation } from "expo-router";
import { Menu, MenuOptions, MenuOption, MenuTrigger } from "react-native-popup-menu";
import { clearToken } from "@/src/lib/token";

function GearButton() {
  return (
    <Menu>
      <MenuTrigger>
        <View style={styles.gearButton}>
          <Text style={styles.gearText}>⚙︎</Text>
        </View>
      </MenuTrigger>

      <MenuOptions customStyles={{ optionsContainer: styles.menuContainer }}>
        <Text style={styles.menuTitle}>Manage account</Text>

        <Text style={styles.menuSection}>SETTINGS</Text>
        <MenuOption onSelect={() => router.push("/(app)/account-details")}>
          <Text style={styles.menuItem}>Account details</Text>
        </MenuOption>
        <MenuOption onSelect={() => router.push("/(app)/notifications")}>
          <Text style={styles.menuItem}>Notifications</Text>
        </MenuOption>

        <Text style={styles.menuSection}>SUPPORT</Text>
        <MenuOption onSelect={() => router.push("/(app)/help")}>
          <Text style={styles.menuItem}>Help with an order</Text>
        </MenuOption>

        <Text style={styles.menuSection}>OTHER</Text>
        <MenuOption onSelect={() => router.push("/(app)/legal")}>
          <Text style={styles.menuItem}>Legal</Text>
        </MenuOption>

        <View style={styles.menuDivider} />

        <MenuOption
          onSelect={() => {
            Alert.alert("Log out", "Are you sure you want to log out?", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Log out",
                style: "destructive",
                onPress: async () => {
                  await clearToken();
                  router.replace("/(auth)/login");
                },
              },
            ]);
          }}
        >
          <Text style={styles.logout}>Log out</Text>
        </MenuOption>
      </MenuOptions>
    </Menu>
  );
}

export default function ProfileScreen() {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => <GearButton />,
    });
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.sub}>MVP: profile info + manage account menu.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 24 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 8 },
  sub: { color: "#444" },

  gearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 6,
    borderRadius: 999,
    backgroundColor: "#f2f2f2",
  },
  gearText: { fontSize: 18 },

  menuContainer: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    width: 240,
  },
  menuTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10 },
  menuSection: { fontSize: 12, letterSpacing: 1, color: "#888", marginTop: 10, marginBottom: 6 },
  menuItem: { fontSize: 15, paddingVertical: 10 },
  menuDivider: { height: 1, backgroundColor: "#eee", marginVertical: 10 },
  logout: { fontSize: 15, paddingVertical: 10, color: "#c62828", fontWeight: "700" },
});
