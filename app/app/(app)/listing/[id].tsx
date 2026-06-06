import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Image,
  Linking,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { getListing, type Listing } from "@/src/features/listings/listings.api";
import { translateListing } from "@/src/features/listings/listings.translate.api";
import { useLang } from "@/src/features/i18n/lang.context";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function pctSaved(price: number, original: number) {
  if (!original || original <= 0) return null;
  if (!price || price <= 0) return null;
  if (original <= price) return 0;
  return Math.round(((original - price) / original) * 100);
}

const translationCache = new Map<string, { title: string; description: string }>();

type ListingExtras = {
  imageUrl?: string | null;
  categoryLabel?: string | null;
  reviewCount?: number | null;
  ratingAvg?: number | null;
  address?: string | null;
  pickupInstructions?: string | null;
  packaging?: { label: string; status: string }[] | null;
  packagingNote?: string | null;
  ingredientsAndAllergens?: string | null;
};

export default function ListingDetailsScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();
  const idNum = Number(params.id);
  const isValidId = Number.isFinite(idNum) && idNum > 0;

  const { lang, ready: langReady, t } = useLang();

  const [item, setItem] = useState<(Listing & ListingExtras) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [translateLoading, setTranslateLoading] = useState(false);
  const [translated, setTranslated] = useState<{ title: string; description: string } | null>(null);
  const [allergensOpen, setAllergensOpen] = useState(false);

  const savings = useMemo(() => {
    if (!item) return null;
    return pctSaved(Number(item.priceDzd), Number(item.originalValueDzd));
  }, [item]);

  const displayTitle = translated?.title ?? item?.title ?? "";
  const displayDesc = translated?.description ?? item?.description ?? "";
  const reviewCount = Number((item as any)?.reviewCount ?? (item as any)?.ratingCount ?? 0);
  const ratingAvg = Number((item as any)?.ratingAvg ?? 0);
  const pickupRatingAvg = Number((item as any)?.pickupRatingAvg ?? 0);
  const qualityRatingAvg = Number((item as any)?.qualityRatingAvg ?? 0);
  const varietyRatingAvg = Number((item as any)?.varietyRatingAvg ?? 0);
  const quantityRatingAvg = Number((item as any)?.quantityRatingAvg ?? 0);
  const qtyLeft = Number(item?.quantityAvailable ?? 0);

  const addressText =
    (item as any)?.address ??
    (((item?.city ?? "") + (item?.wilaya ? `, ${item.wilaya}` : "")).trim() || "");

  const pickupInstructions =
    (item as any)?.pickupInstructions ?? t("listing.defaultPickupInstructions");

  const packaging =
    (item as any)?.packaging ??
    [
      { label: t("listing.container"), status: t("listing.provided") },
      { label: t("listing.carrierBag"), status: t("listing.provided") },
    ];

  const packagingNote = (item as any)?.packagingNote ?? t("listing.packagingNoteDefault");
  const ingredientsAndAllergens =
    (item as any)?.ingredientsAndAllergens ?? t("listing.defaultAllergens");

  function fmtPickupRange(start?: string | null, end?: string | null) {
    if (!start && !end) return t("listing.pickupTbd");

    const s = start ? new Date(start) : null;
    const e = end ? new Date(end) : null;
    const locale = lang === "fr" ? "fr-CA" : lang === "ar" ? "ar-DZ" : "en";
    const fmtTime = (d: Date) => d.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });

    if (s && e) return `${fmtTime(s)} - ${fmtTime(e)}`;
    if (s) return fmtTime(s);
    return fmtTime(e as Date);
  }

  function dayPill(start?: string | null) {
    if (!start) return "";
    const d = new Date(start);
    const now = new Date();

    const isTomorrow =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate() + 1;

    if (isTomorrow) return t("listing.tomorrow");
    const locale = lang === "fr" ? "fr-CA" : lang === "ar" ? "ar-DZ" : "en";
    return d.toLocaleDateString(locale, { weekday: "short" });
  }

  function openDirections() {
    const lat = Number((item as any)?.lat ?? (item as any)?.latitude);
    const lng = Number((item as any)?.lng ?? (item as any)?.longitude);
    const region =
      Number.isFinite(lat) && Number.isFinite(lng)
        ? {
            latitude: lat,
            longitude: lng,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }
        : null;
    const query = encodeURIComponent(addressText || displayTitle || "Destination");

    if (region) {
      const { latitude, longitude } = region;
      const url =
        Platform.OS === "ios"
          ? `http://maps.apple.com/?daddr=${latitude},${longitude}`
          : `geo:${latitude},${longitude}?q=${latitude},${longitude}(${query})`;
      Linking.openURL(url).catch(() => {});
      return;
    }

    const url =
      Platform.OS === "ios"
        ? `http://maps.apple.com/?q=${query}`
        : `geo:0,0?q=${query}`;
    Linking.openURL(url).catch(() => {});
  }

  useEffect(() => {
    if (!isValidId) {
      setLoading(false);
      setItem(null);
      setError(t("common.invalidId"));
      return;
    }

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getListing(idNum);
        setItem(res as any);
      } catch (e: any) {
        setError(e?.message ?? t("common.loadFail"));
      } finally {
        setLoading(false);
      }
    })();
  }, [idNum, isValidId, t]);

  useEffect(() => {
    if (!langReady || !item) return;

    if (lang === "en") {
      setTranslated(null);
      return;
    }

    const key = `${item.id}:${lang}`;
    const cached = translationCache.get(key);
    if (cached) {
      setTranslated(cached);
      return;
    }

    let cancelled = false;

    (async () => {
      setTranslateLoading(true);
      try {
        const tr = await translateListing(item.id, lang);
        const val = { title: tr.title, description: tr.description };
        translationCache.set(key, val);
        if (!cancelled) setTranslated(val);
      } catch {
        if (!cancelled) setTranslated(null);
      } finally {
        if (!cancelled) setTranslateLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [lang, langReady, item]);

  function onReserve(listingId: number) {
    router.push({
      pathname: "/(app)/checkout/[id]",
      params: { id: String(listingId) },
    });
  }

  const region = useMemo(() => {
    const lat = Number((item as any)?.lat ?? (item as any)?.latitude);
    const lng = Number((item as any)?.lng ?? (item as any)?.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    return {
      latitude: lat,
      longitude: lng,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
  }, [item]);

  const heroUrl = (item as any)?.imageUrl ?? "https://picsum.photos/900/500";
  const categoryLabel = (item as any)?.categoryLabel ?? item?.category ?? t("listing.category");
  const pickupTime = fmtPickupRange(item?.pickupStartAt ?? null, item?.pickupEndAt ?? null);
  const pickupDay = dayPill(item?.pickupStartAt ?? null);

  function toggleAllergens() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setAllergensOpen((v) => !v);
  }

  return (
    <>
      <Stack.Screen options={{ title: "" }} />

      <View style={styles.root}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#116B62" />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.error}>{error}</Text>
          </View>
        ) : !item ? (
          <View style={styles.center}>
            <Text style={styles.error}>{t("common.notFound")}</Text>
          </View>
        ) : (
          <>
            <ScrollView contentContainerStyle={{ paddingBottom: 132 }} showsVerticalScrollIndicator={false}>
              <View style={styles.heroWrap}>
                <Image source={{ uri: heroUrl }} style={styles.heroImg} />
                <View style={styles.heroShade} />

                <View style={[styles.heroTopRow, { top: insets.top + 14 }]}>
                  <Pressable onPress={() => router.back()} style={styles.heroIconBtn}>
                    <Ionicons name="chevron-back" size={24} color="#1F2C2B" />
                  </Pressable>

                  <View style={styles.heroTopActions}>
                    <Pressable onPress={() => {}} style={styles.heroIconBtn}>
                      <Ionicons name="share-outline" size={20} color="#1F2C2B" />
                    </Pressable>
                    <Pressable onPress={() => {}} style={styles.heroIconBtn}>
                      <Ionicons name="heart-outline" size={20} color="#1F2C2B" />
                    </Pressable>
                  </View>
                </View>

                <View style={[styles.heroBadges, { top: insets.top + 84 }]}>
                  <View style={[styles.heroPill, qtyLeft <= 0 ? styles.heroPillMuted : styles.heroPillWarm]}>
                    <Text style={[styles.heroPillText, qtyLeft <= 0 ? styles.heroPillTextMuted : null]}>
                      {qtyLeft > 0 ? `${qtyLeft} ${t("listing.left")}` : t("listing.soldOut")}
                    </Text>
                  </View>

                  <View style={styles.heroPill}>
                    <Ionicons name="star" size={14} color="#2F9C74" />
                    <Text style={styles.heroPillText}>
                      {ratingAvg > 0 ? ratingAvg.toFixed(1) : "4.6"}
                    </Text>
                  </View>
                </View>

                <View style={styles.heroTitleBlock}>
                  <Text style={styles.heroEyebrow}>{categoryLabel}</Text>
                  <Text numberOfLines={2} style={styles.heroTitleText}>
                    {displayTitle}
                  </Text>
                </View>
              </View>

              <View style={styles.content}>
                {translateLoading ? (
                  <View style={styles.translatePill}>
                    <Text style={styles.translatePillText}>{t("listing.translating")}</Text>
                  </View>
                ) : null}

                <View style={styles.summaryCard}>
                  <View style={styles.summaryItem}>
                    <Ionicons name="bag-handle-outline" size={18} color="#116B62" />
                    <Text style={styles.summaryText}>{categoryLabel}</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Ionicons name="time-outline" size={18} color="#116B62" />
                    <Text style={styles.summaryText}>{pickupTime}</Text>
                    {pickupDay ? (
                      <View style={styles.dayPill}>
                        <Text style={styles.dayPillText}>{pickupDay}</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.summaryItem}>
                    <Ionicons name="chatbubble-ellipses-outline" size={18} color="#116B62" />
                    <Text style={styles.summaryText}>
                      {reviewCount > 0 ? `${reviewCount} reviews` : "Fresh pick-up window"}
                    </Text>
                  </View>
                </View>

                <Text style={styles.sectionTitle}>{t("listing.about")}</Text>
                <Text style={styles.sectionBody}>{displayDesc || t("listing.defaultAbout")}</Text>

                <View style={styles.experienceHeader}>
                  <View style={styles.experienceText}>
                    <Text style={styles.sectionTitle}>Overall experience</Text>
                    <Text style={styles.experienceSubtext}>
                      {reviewCount > 0 ? `Based on ${reviewCount} recent reviews` : "Be the first to rate this bag"}
                    </Text>
                  </View>
                  <View style={styles.experienceScore}>
                    <Ionicons name="star" size={20} color="#19B37A" />
                    <Text style={styles.experienceScoreText}>{ratingAvg > 0 ? ratingAvg.toFixed(1) : "New"}</Text>
                  </View>
                </View>

                {[
                  ["Pickup", pickupRatingAvg],
                  ["Quality", qualityRatingAvg],
                  ["Variety", varietyRatingAvg],
                  ["Quantity", quantityRatingAvg],
                ].map(([label, value]) => {
                  const amount = Number(value);
                  const pct = Math.max(0, Math.min(100, (amount / 5) * 100));
                  return (
                    <View key={String(label)} style={styles.metricBlock}>
                      <Text style={styles.metricLabel}>
                        {label} <Text style={styles.metricValue}>{amount > 0 ? amount.toFixed(1) : "0.0"}</Text>
                      </Text>
                      <View style={styles.metricTrack}>
                        <View style={[styles.metricFill, { width: `${pct}%` }]} />
                      </View>
                    </View>
                  );
                })}

                <Text style={styles.sectionTitle}>{t("listing.directions")}</Text>
                <Text style={styles.addressText}>{addressText || t("listing.addressTbd")}</Text>

                <View style={styles.mapCard}>
                  {region ? (
                    <MapView
                      style={StyleSheet.absoluteFill}
                      provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
                      initialRegion={region}
                      pointerEvents="none"
                    >
                      <Marker coordinate={{ latitude: region.latitude, longitude: region.longitude }} />
                    </MapView>
                  ) : (
                    <View style={styles.mapFallback}>
                      <Text style={styles.mapFallbackText}>{t("listing.mapUnavailable")}</Text>
                    </View>
                  )}
                </View>

                <Pressable onPress={openDirections} style={styles.directionsBtn}>
                  <Text style={styles.directionsBtnText}>{t("listing.getDirections")}</Text>
                </Pressable>

                <Text style={styles.sectionTitle}>{t("listing.pickupInstructionsTitle")}</Text>
                <View style={styles.textCard}>
                  <Text style={styles.sectionBodyCompact}>{pickupInstructions}</Text>
                </View>

                <Text style={styles.sectionTitle}>{t("listing.packaging")}</Text>
                <View style={styles.packRow}>
                  {packaging?.slice(0, 2).map((p: any, idx: number) => (
                    <View key={`${p.label}-${idx}`} style={styles.packCard}>
                      <View style={styles.packIcon}>
                        <Ionicons
                          name={idx === 0 ? "albums-outline" : "bag-handle-outline"}
                          size={20}
                          color="#116B62"
                        />
                      </View>
                      <Text style={styles.packLabel}>{p.label}</Text>
                      <Text style={styles.packStatus}>{p.status}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.noteRow}>
                  <View style={styles.noteIconWrap}>
                    <Ionicons name="information-outline" size={16} color="#fff" />
                  </View>
                  <Text style={styles.noteText}>{packagingNote}</Text>
                </View>

                <Pressable onPress={toggleAllergens} style={styles.accordionHeader}>
                  <Text style={styles.accordionTitle}>{t("listing.ingredientsAllergens")}</Text>
                  <Text style={styles.accordionChevron}>{allergensOpen ? "Hide" : "See more"}</Text>
                </Pressable>

                {allergensOpen ? (
                  <View style={styles.accordionBody}>
                    <Text style={styles.sectionBodyCompact}>{ingredientsAndAllergens}</Text>
                  </View>
                ) : null}
              </View>
            </ScrollView>

            <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
              <View style={styles.bottomPriceBlock}>
                {savings !== null ? (
                  <View style={styles.saveBadge}>
                    <Text style={styles.saveBadgeText}>
                      {t("listing.save")} {savings}%
                    </Text>
                  </View>
                ) : null}

                {item.originalValueDzd ? <Text style={styles.oldPrice}>{item.originalValueDzd} DZD</Text> : null}
                <Text style={styles.price}>{item.priceDzd ?? 0} DZD</Text>
              </View>

              <Pressable
                style={styles.reserveBtn}
                onPress={() => onReserve(item.id)}
                disabled={qtyLeft <= 0}
              >
                <Text style={styles.reserveBtnText}>
                  {qtyLeft <= 0 ? t("listing.soldOut") : t("listing.reserve")}
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFDF8" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  error: { color: "#C05343", fontWeight: "800" },

  heroWrap: { height: 332, backgroundColor: "#E8E5DD", position: "relative" },
  heroImg: { width: "100%", height: "100%" },
  heroShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(25, 33, 32, 0.28)",
  },
  heroTopRow: {
    position: "absolute",
    left: 18,
    right: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroTopActions: { flexDirection: "row", gap: 10 },
  heroIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.90)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroBadges: {
    position: "absolute",
    left: 18,
    right: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.95)",
  },
  heroPillWarm: { backgroundColor: "#FFF1B6" },
  heroPillMuted: { backgroundColor: "rgba(244,247,246,0.96)" },
  heroPillText: { fontWeight: "800", color: "#1F2C2B" },
  heroPillTextMuted: { color: "#6A7775" },
  heroTitleBlock: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 20,
  },
  heroEyebrow: {
    color: "#D9F1EA",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  heroTitleText: {
    color: "#fff",
    fontSize: 31,
    lineHeight: 36,
    fontWeight: "800",
    textShadowColor: "rgba(0,0,0,0.28)",
    textShadowRadius: 8,
  },

  content: { padding: 18 },
  translatePill: {
    alignSelf: "flex-start",
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#EDF7F3",
    borderWidth: 1,
    borderColor: "#DDEBE5",
  },
  translatePillText: { fontWeight: "800", color: "#116B62" },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E1EAE6",
    borderRadius: 22,
    padding: 16,
    gap: 12,
    shadowColor: "#23413C",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  summaryItem: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  summaryText: { color: "#223130", fontSize: 15, fontWeight: "700", flexShrink: 1 },
  dayPill: {
    marginLeft: "auto",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#116B62",
  },
  dayPillText: { color: "#fff", fontWeight: "800" },
  sectionTitle: { marginTop: 24, fontSize: 22, fontWeight: "800", color: "#1F2C2B" },
  sectionBody: { marginTop: 10, color: "#42514F", fontWeight: "600", lineHeight: 24, fontSize: 16 },
  sectionBodyCompact: { color: "#42514F", fontWeight: "600", lineHeight: 23, fontSize: 15 },
  experienceHeader: {
    marginTop: 4,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 14,
  },
  experienceText: { flex: 1 },
  experienceSubtext: { marginTop: 2, fontSize: 14, color: "#72817F", fontWeight: "700" },
  experienceScore: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#DCE6E2",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
  },
  experienceScoreText: { fontSize: 18, color: "#1F2C2B", fontWeight: "900" },
  metricBlock: { marginBottom: 18 },
  metricLabel: { fontSize: 16, color: "#1F2C2B", fontWeight: "500", marginBottom: 10 },
  metricValue: { fontWeight: "900" },
  metricTrack: {
    height: 14,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "#BEE8DD",
  },
  metricFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#19B37A",
  },
  addressText: { marginTop: 10, color: "#116B62", fontWeight: "800", fontSize: 17 },
  mapCard: {
    marginTop: 14,
    height: 154,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E1EAE6",
    backgroundColor: "#F4F6F6",
  },
  mapFallback: { flex: 1, alignItems: "center", justifyContent: "center" },
  mapFallbackText: { color: "#7B8886", fontWeight: "700" },
  directionsBtn: {
    marginTop: 14,
    borderWidth: 1.5,
    borderColor: "#116B62",
    borderRadius: 999,
    paddingVertical: 15,
    alignItems: "center",
    backgroundColor: "#F7FCFA",
  },
  directionsBtnText: { color: "#116B62", fontWeight: "800", fontSize: 16 },
  textCard: {
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E1EAE6",
    borderRadius: 20,
    padding: 14,
  },
  packRow: { flexDirection: "row", gap: 12, marginTop: 14 },
  packCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E1EAE6",
    borderRadius: 20,
    padding: 14,
    backgroundColor: "#fff",
    alignItems: "center",
    gap: 6,
  },
  packIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#EDF7F3",
    alignItems: "center",
    justifyContent: "center",
  },
  packLabel: { marginTop: 6, fontWeight: "800", color: "#1F2C2B" },
  packStatus: { fontWeight: "700", color: "#72817F" },
  noteRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F3F8F5",
    borderRadius: 18,
    padding: 13,
  },
  noteIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#116B62",
    alignItems: "center",
    justifyContent: "center",
  },
  noteText: { flex: 1, color: "#223130", fontWeight: "700" },
  accordionHeader: {
    marginTop: 18,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  accordionTitle: { fontSize: 18, fontWeight: "800", color: "#1F2C2B" },
  accordionChevron: { fontSize: 13, fontWeight: "700", color: "#72817F" },
  accordionBody: {
    borderTopWidth: 1,
    borderTopColor: "#E1EAE6",
    paddingTop: 12,
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E1EAE6",
    backgroundColor: "#FFFDF8",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  bottomPriceBlock: { flex: 1 },
  oldPrice: { color: "#8A9794", textDecorationLine: "line-through", fontWeight: "600", marginTop: 4 },
  price: { fontSize: 28, fontWeight: "800", color: "#1F2C2B", marginTop: 2 },
  saveBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#EDF7F3",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  saveBadgeText: { fontWeight: "800", color: "#116B62" },
  reserveBtn: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 999,
    backgroundColor: "#116B62",
    minWidth: 154,
    alignItems: "center",
    justifyContent: "center",
  },
  reserveBtnDisabled: { opacity: 0.6 },
  reserveBtnText: { color: "#fff", fontWeight: "900", fontSize: 16 },
});
