import { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  RefreshControl,
  Pressable,
  Image,
} from "react-native";
import { Stack, router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenBody } from "@/src/components/screen-body";
import { ScreenHeader } from "@/src/components/screen-header";
import { useLang } from "@/src/features/i18n/lang.context";
import {
  getMyOrderSummaries,
  getTotalBags,
  groupOrdersByMonth,
  type OrderSummary,
} from "@/src/features/orders/order-summary";

export default function OrdersScreen() {
  const { t, lang } = useLang();
  const insets = useSafeAreaInsets();
  const refreshOffset = insets.top + 24;
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMyOrderSummaries(lang);
      setItems(res);
    } catch (e: any) {
      setError(e?.message ?? t("orders.loadError"));
    } finally {
      setLoading(false);
    }
  }, [lang, t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    load();
  }, [load]);

  const sections = useMemo(
    () => groupOrdersByMonth(items).map((section) => ({ ...section, data: section.items })),
    [items]
  );
  const totalBags = useMemo(() => getTotalBags(items), [items]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title={t("orders.title")}
        showBack
        onBack={() => router.replace("/(app)/(tabs)/discover")}
      />
      <ScreenBody>
        <View style={styles.container}>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <SectionList
            sections={sections}
            keyExtractor={(item) => String(item.order.id)}
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={load}
                progressViewOffset={refreshOffset}
                tintColor="#0B6E69"
                colors={["#0B6E69"]}
              />
            }
            contentContainerStyle={sections.length ? styles.content : styles.contentEmpty}
            renderSectionHeader={({ section }) => (
              <View style={styles.monthHeader}>
                <Text style={styles.monthTitle}>{section.title}</Text>
                <Text style={styles.monthCount}>
                  {t("orders.savedCount")}: {section.count}
                </Text>
              </View>
            )}
            renderItem={({ item }) => (
              <Pressable
                style={styles.card}
                onPress={() =>
                  router.push({ pathname: "/(app)/order/[id]", params: { id: String(item.order.id) } })
                }
              >
                <View style={styles.cardLeft}>
                  <View style={styles.logoWrap}>
                    {item.sellerLogoUrl ? (
                      <Image source={{ uri: item.sellerLogoUrl }} style={styles.logoImage} />
                    ) : (
                      <Text style={styles.logoText}>
                        {item.subtitle
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((part) => part[0]?.toUpperCase() ?? "")
                          .join("")}
                      </Text>
                    )}
                    <View style={styles.checkBadge}>
                      <Text style={styles.checkText}>✓</Text>
                    </View>
                  </View>

                  <View style={styles.cardText}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.cardMeta} numberOfLines={1}>
                      {item.subtitle}
                    </Text>
                    <Text style={styles.cardSubMeta}>
                      {new Date(item.order.createdAt).toLocaleDateString()} • {item.order.totalDzd} DZD
                    </Text>
                  </View>
                </View>

                <Text style={styles.cardChevron}>›</Text>
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={styles.cardSpacer} />}
            ListHeaderComponent={
              <View style={styles.summaryCard}>
                <Text style={styles.summaryEyebrow}>{t("orders.totalBagsLabel")}</Text>
                <Text style={styles.summaryValue}>{totalBags}</Text>
              </View>
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>{t("orders.emptyTitle")}</Text>
                <Text style={styles.emptySub}>{t("orders.emptySubtitle")}</Text>

                <Pressable style={styles.cta} onPress={() => router.push("/(app)/(tabs)/browse")}>
                  <Text style={styles.ctaText}>{t("orders.browseListings")}</Text>
                </Pressable>
              </View>
            }
            stickySectionHeadersEnabled={false}
          />
        </View>
      </ScreenBody>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFDF8" },
  content: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 28 },
  contentEmpty: { flexGrow: 1, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 28 },

  error: { color: "#C05343", fontWeight: "800", marginBottom: 12 },
  summaryCard: {
    borderWidth: 1,
    borderColor: "#E1EAE6",
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: "#FFFFFF",
    marginBottom: 22,
    shadowColor: "#23413C",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  summaryEyebrow: {
    fontSize: 13,
    letterSpacing: 0.8,
    color: "#72817F",
    fontWeight: "800",
    textTransform: "uppercase",
  },
  summaryValue: {
    marginTop: 6,
    fontSize: 38,
    fontWeight: "900",
    color: "#116B62",
  },
  monthHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 12,
    marginTop: 6,
  },
  monthTitle: { fontSize: 24, fontWeight: "900", color: "#1F2C2B" },
  monthCount: { fontSize: 18, fontWeight: "900", color: "#1F2C2B" },
  cardSpacer: { height: 14 },

  card: {
    borderWidth: 1,
    borderColor: "#E1EAE6",
    borderRadius: 20,
    padding: 16,
    backgroundColor: "#fff",
    shadowColor: "#23413C",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardLeft: { flexDirection: "row", alignItems: "center", flex: 1, gap: 14 },
  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: "#2F7A6A",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    position: "relative",
  },
  logoText: { fontSize: 22, fontWeight: "900", color: "#116B62" },
  logoImage: { width: "100%", height: "100%", borderRadius: 34 },
  checkBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#2F7A6A",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  checkText: { color: "#FFFFFF", fontWeight: "900", fontSize: 12 },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: "900", color: "#1F2C2B" },
  cardMeta: { marginTop: 6, fontSize: 14, color: "#72817F", fontWeight: "700" },
  cardSubMeta: { marginTop: 8, fontSize: 13, color: "#8A9896", fontWeight: "700" },
  cardChevron: { fontSize: 28, color: "#95A3A0", marginLeft: 12 },

  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#1F2C2B" },
  emptySub: { marginTop: 8, color: "#72817F", fontWeight: "700", textAlign: "center" },

  cta: {
    marginTop: 18,
    backgroundColor: "#116B62",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  ctaText: { color: "#fff", fontWeight: "700" },
});
