import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, Alert, ScrollView, Modal, Image } from "react-native";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { clearToken } from "@/src/lib/token";
import { ScreenBody } from "@/src/components/screen-body";
import { useLang } from "@/src/features/i18n/lang.context";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  getMyOrderSummaries,
  getTotalBags,
  getTotalSavedDzd,
  type OrderSummary,
} from "@/src/features/reservations/order-summary";
import { getProfileSettings, type ProfileSettings } from "@/src/features/profile/profile.store";
import { getMyProfile } from "@/src/features/profile/profile.api";

function MenuRow({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.menuRow}>
      <View style={styles.menuRowLeft}>
        <Ionicons name={icon} size={24} color="#2C3735" />
        <Text style={styles.menuRowText}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={22} color="#8B9794" />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { t, lang } = useLang();
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [profile, setProfile] = useState<ProfileSettings | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      const res = await getMyOrderSummaries(lang);
      setOrders(res);
    } catch {
      setOrders([]);
    }
  }, [lang]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    getProfileSettings().then(setProfile);
  }, []);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        await loadOrders();
        getProfileSettings().then(setProfile);
        try {
          await getMyProfile();
          const refreshed = await getProfileSettings();
          setProfile(refreshed);
        } catch {}
      })();
    }, [loadOrders])
  );

  const totalBags = useMemo(() => getTotalBags(orders), [orders]);
  const totalSaved = useMemo(() => getTotalSavedDzd(orders), [orders]);
  const recentOrders = useMemo(
    () =>
      [...orders]
        .sort(
          (a, b) =>
            new Date(b.order.createdAt).getTime() - new Date(a.order.createdAt).getTime()
        )
        .slice(0, 3),
    [orders]
  );

  const menuSections = [
    {
      title: t("profile.settings"),
      items: [
        { icon: "person-circle-outline" as const, label: t("profile.accountDetails"), onPress: () => router.push("/(app)/account-details") },
        { icon: "card-outline" as const, label: t("profile.paymentCards"), onPress: () => router.push("/(app)/payment-cards") },
        { icon: "notifications-outline" as const, label: t("profile.notifications"), onPress: () => router.push("/(app)/notifications") },
        { icon: "settings-outline" as const, label: t("profile.preferences"), onPress: () => router.push("/(app)/preferences") },
      ],
    },
    {
      title: t("profile.support"),
      items: [
        { icon: "headset-outline" as const, label: t("profile.customerSupport"), onPress: () => router.push("/(app)/help") },
      ],
    },
    {
      title: t("profile.other"),
      items: [
        { icon: "hammer-outline" as const, label: t("profile.legal"), onPress: () => router.push("/(app)/legal") },
        { icon: "storefront-outline" as const, label: t("profile.signUpBusiness"), onPress: () => router.push("/(auth)/register-seller") },
      ],
    },
  ];

  return (
    <>
      <ScreenBody>
        <ScrollView
          contentContainerStyle={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 112 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <Text style={styles.nameTitle}>{profile?.username || t("profile.addYourName")}</Text>
              <Text style={styles.nameSubtitle}>
                {totalBags} {t("profile.totalBagsShort")}
              </Text>
            </View>

            <Pressable style={styles.headerIconButton} onPress={() => setMenuOpen(true)}>
              <View style={styles.headerAvatarCircle}>
                <Text style={styles.headerAvatarText}>FS</Text>
              </View>
            </Pressable>
          </View>

          <View style={styles.headerDivider} />

          <View style={styles.statsRow}>
            <View style={styles.totalBagsCard}>
              <Text style={styles.totalBagsLabel}>{t("orders.totalBagsLabel")}</Text>
              <Text style={styles.totalBagsValue}>{totalBags}</Text>
            </View>
            <View style={styles.savingsCard}>
              <Text style={styles.totalBagsLabel}>{t("profile.moneySaved")}</Text>
              <Text style={styles.savingsValue}>{totalSaved} DZD</Text>
            </View>
          </View>

          <View style={styles.ordersSectionHeader}>
            <Text style={styles.ordersSectionTitle}>{t("profile.yourOrders")}</Text>
            <Pressable onPress={() => router.push("/(app)/orders")}>
              <Text style={styles.seeAllText}>{t("discover.seeAll")}</Text>
            </Pressable>
          </View>

          {recentOrders.length > 0 ? (
            recentOrders.map((item) => (
              <Pressable
                key={item.order.id}
                style={styles.orderPreviewCard}
                onPress={() => router.push({ pathname: "/(app)/order/[id]", params: { id: String(item.order.id) } })}
              >
                <View style={styles.orderPreviewLeft}>
                  <View style={styles.orderPreviewLogo}>
                    {item.sellerLogoUrl ? (
                      <Image source={{ uri: item.sellerLogoUrl }} style={styles.orderPreviewLogoImage} />
                    ) : (
                      <Text style={styles.orderPreviewLogoText}>
                        {item.subtitle
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((part) => part[0]?.toUpperCase() ?? "")
                          .join("")}
                      </Text>
                    )}
                  </View>
                  <View style={styles.orderPreviewText}>
                    <Text style={styles.orderPreviewTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.orderPreviewMeta} numberOfLines={1}>
                      {item.subtitle}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={22} color="#95A3A0" />
              </Pressable>
            ))
          ) : (
            <Pressable style={styles.emptyOrdersCard} onPress={() => router.push("/(app)/(tabs)/browse")}>
              <Text style={styles.emptyOrdersTitle}>{t("orders.emptyTitle")}</Text>
              <Text style={styles.emptyOrdersSub}>{t("orders.emptySubtitle")}</Text>
            </Pressable>
          )}
        </ScrollView>

        <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
          <View style={styles.modalOverlay}>
            <Pressable style={styles.modalBackdrop} onPress={() => setMenuOpen(false)} />
            <View style={[styles.sidePanel, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 24 }]}>
              <View style={styles.panelHeader}>
                <Text style={styles.panelTitle}>{t("profile.manageAccount")}</Text>
                <Pressable onPress={() => setMenuOpen(false)} hitSlop={10}>
                  <Ionicons name="close" size={30} color="#2C3735" />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {menuSections.map((section) => (
                  <View key={section.title} style={styles.menuSection}>
                    <Text style={styles.menuSectionTitle}>{section.title}</Text>
                    {section.items.map((item) => (
                      <MenuRow
                        key={item.label}
                        icon={item.icon}
                        label={item.label}
                        onPress={() => {
                          setMenuOpen(false);
                          item.onPress();
                        }}
                      />
                    ))}
                  </View>
                ))}
              </ScrollView>

              <Pressable
                style={styles.logoutBtn}
                onPress={() => {
                  setMenuOpen(false);
                  Alert.alert(t("profile.logoutTitle"), t("profile.logoutConfirm"), [
                    { text: t("profile.cancel"), style: "cancel" },
                    {
                      text: t("profile.logout"),
                      style: "destructive",
                      onPress: async () => {
                        await clearToken();
                        router.replace("/(auth)/login");
                      },
                    },
                  ]);
                }}
              >
                <Text style={styles.logoutText}>{t("profile.logout")}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </ScreenBody>
    </>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 18 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  headerText: { flex: 1, alignItems: "flex-start" },
  nameTitle: { fontSize: 28, fontWeight: "900", color: "#1F2C2B" },
  nameSubtitle: { marginTop: 6, fontSize: 15, fontWeight: "700", color: "#72817F" },
  headerDivider: {
    height: 1,
    backgroundColor: "#DFE7E3",
    marginBottom: 18,
  },
  headerIconButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#DDF2FA",
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarText: { fontSize: 20, fontWeight: "900", color: "#0C766F" },
  ordersSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    marginTop: 8,
  },
  ordersSectionTitle: { fontSize: 20, fontWeight: "900", color: "#1F2C2B" },
  seeAllText: { fontSize: 16, fontWeight: "900", color: "#0C766F", textDecorationLine: "underline" },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  totalBagsCard: {
    borderWidth: 1,
    borderColor: "#E1EAE6",
    borderRadius: 24,
    backgroundColor: "#fff",
    paddingHorizontal: 18,
    paddingVertical: 16,
    flex: 0.95,
    shadowColor: "#23413C",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  savingsCard: {
    flex: 1.05,
    borderWidth: 1,
    borderColor: "#E1EAE6",
    borderRadius: 24,
    backgroundColor: "#fff",
    paddingHorizontal: 18,
    paddingVertical: 16,
    shadowColor: "#23413C",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  totalBagsLabel: { fontSize: 14, fontWeight: "800", color: "#72817F", textTransform: "uppercase" },
  totalBagsValue: { marginTop: 6, fontSize: 34, fontWeight: "900", color: "#0C766F" },
  savingsValue: { marginTop: 10, fontSize: 24, fontWeight: "900", color: "#1F2C2B" },
  orderPreviewCard: {
    borderWidth: 1,
    borderColor: "#E1EAE6",
    borderRadius: 24,
    backgroundColor: "#fff",
    padding: 18,
    marginBottom: 16,
    shadowColor: "#23413C",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  orderPreviewLeft: { flexDirection: "row", alignItems: "center", flex: 1, gap: 14 },
  orderPreviewLogo: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#F2F8F5",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#2F7A6A",
  },
  orderPreviewLogoImage: { width: "100%", height: "100%", borderRadius: 32 },
  orderPreviewLogoText: { fontSize: 22, fontWeight: "900", color: "#0C766F" },
  orderPreviewText: { flex: 1 },
  orderPreviewTitle: { fontSize: 17, fontWeight: "900", color: "#1F2C2B" },
  orderPreviewMeta: { marginTop: 6, fontSize: 14, color: "#72817F", fontWeight: "700" },
  emptyOrdersCard: {
    borderWidth: 1,
    borderColor: "#E1EAE6",
    borderRadius: 24,
    backgroundColor: "#fff",
    padding: 22,
    marginBottom: 16,
  },
  emptyOrdersTitle: { fontSize: 18, fontWeight: "900", color: "#1F2C2B" },
  emptyOrdersSub: { marginTop: 8, fontSize: 15, lineHeight: 22, color: "#72817F", fontWeight: "700" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(19, 27, 27, 0.22)",
    flexDirection: "row",
  },
  modalBackdrop: { flex: 1 },
  sidePanel: {
    width: "86%",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 22,
    borderTopLeftRadius: 28,
    borderBottomLeftRadius: 28,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: -6, height: 0 },
    elevation: 12,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  panelTitle: { fontSize: 24, fontWeight: "900", color: "#1F2C2B" },
  menuSection: { marginBottom: 24 },
  menuSectionTitle: {
    marginBottom: 10,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#6F7E7B",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
  },
  menuRowLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
  menuRowText: { fontSize: 17, fontWeight: "700", color: "#2C3735" },
  logoutBtn: {
    borderWidth: 1,
    borderColor: "#F1D8D3",
    backgroundColor: "#fff",
    paddingVertical: 15,
    borderRadius: 999,
    alignItems: "center",
  },
  logoutText: { color: "#C05343", fontWeight: "800", fontSize: 16 },
});
