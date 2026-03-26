import { Pressable, StyleSheet, Text, View, Image, ImageBackground } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLang, type AppLang } from "@/src/features/i18n/lang.context";
import type { Listing } from "@/src/features/listings/listings.api";

function formatDistance(km: number) {
  if (!Number.isFinite(km)) return "";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

function formatPickupRange(
  item: Listing,
  lang: AppLang,
  t: (key: string) => string
) {
  const start = item.pickupStartAt ? new Date(item.pickupStartAt) : null;
  const end = item.pickupEndAt ? new Date(item.pickupEndAt) : null;

  if (!start && !end) return t("listing.pickupTbd");

  const now = new Date();
  const locale = lang === "fr" ? "fr-CA" : lang === "ar" ? "ar-DZ" : "en-CA";
  const sameDay =
    start &&
    start.getFullYear() === now.getFullYear() &&
    start.getMonth() === now.getMonth() &&
    start.getDate() === now.getDate();
  const tomorrow =
    start &&
    start.getFullYear() === now.getFullYear() &&
    start.getMonth() === now.getMonth() &&
    start.getDate() === now.getDate() + 1;

  const prefix = sameDay
    ? t("favourites.pickupToday")
    : tomorrow
      ? t("favourites.pickupTomorrow")
      : t("listing.pickUp");

  const fmtTime = (d: Date) =>
    d.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });

  if (start && end) return `${prefix} ${fmtTime(start)} - ${fmtTime(end)}`;
  if (start) return `${prefix} ${fmtTime(start)}`;
  return `${prefix} ${fmtTime(end as Date)}`;
}

function getHeroPalette(category: string) {
  const c = category.toLowerCase();
  if (c.includes("bread") || c.includes("pastr")) {
    return { bg: "#EFCB8F", accent: "#A3621B", tint: "#FFF7E7" };
  }
  if (c.includes("groc")) {
    return { bg: "#BBD7C7", accent: "#245A4B", tint: "#EEF7F2" };
  }
  if (c.includes("meal")) {
    return { bg: "#E5B39B", accent: "#7A3C2A", tint: "#FFF3ED" };
  }
  return { bg: "#C7D8D7", accent: "#285C59", tint: "#F3F8F8" };
}

function getStoreInitials(title: string) {
  return title
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

type ListingCardProps = {
  item: Listing;
  onPress: () => void;
  isFavourite: boolean;
  onToggleFavourite: () => void;
  distanceKm?: number | null;
  width?: number | string;
  compact?: boolean;
  showAlertIcon?: boolean;
};

export function ListingCard({
  item,
  onPress,
  isFavourite,
  onToggleFavourite,
  distanceKm,
  width = "100%",
  compact = false,
  showAlertIcon = false,
}: ListingCardProps) {
  const { t, lang } = useLang();
  const isSoldOut = item.status === "sold_out" || Number(item.quantityAvailable ?? 0) <= 0;
  const palette = getHeroPalette(item.category ?? "");
  const pickupText = formatPickupRange(item, lang, t);
  const distance = distanceKm != null ? formatDistance(distanceKm) : "";
  const priceNow = `${Number(item.priceDzd ?? 0)} DZD`;
  const priceBefore =
    Number(item.originalValueDzd ?? 0) > 0 ? `${Number(item.originalValueDzd)} DZD` : null;
  const logoInitials = getStoreInitials(item.storeName || item.title);

  return (
    <Pressable
      style={[
        styles.card,
        compact ? styles.cardCompact : null,
        { width },
        isSoldOut ? styles.cardSoldOut : null,
      ]}
      onPress={onPress}
    >
      <View style={[styles.heroWrap, compact ? styles.heroWrapCompact : null]}>
        {item.imageUrl ? (
          <ImageBackground
            source={{ uri: item.imageUrl }}
            style={styles.heroImage}
            imageStyle={styles.heroImageStyle}
          >
            <View style={[styles.heroShade, isSoldOut ? styles.heroShadeSoldOut : null]} />
          </ImageBackground>
        ) : (
          <View style={[styles.heroFallback, { backgroundColor: palette.bg }]}>
            <View style={styles.heroPatternOrbA} />
            <View style={styles.heroPatternOrbB} />
            <Text style={[styles.heroFallbackLabel, { color: palette.accent }]}>
              {item.category || "Surprise Bag"}
            </Text>
          </View>
        )}

        {isSoldOut ? (
          <View style={[styles.badge, styles.badgeMuted, styles.badgeLeft]}>
            <Text style={styles.badgeTextMuted}>{t("favourites.soldOut")}</Text>
          </View>
        ) : (
          <View style={[styles.badge, styles.badgeWarm, styles.badgeLeft]}>
            <Text style={styles.badgeTextWarm}>
              {Math.max(Number(item.quantityAvailable ?? 1), 1)} {t("listing.left")}
            </Text>
          </View>
        )}

        <View style={[styles.badge, styles.badgeRight]}>
          <Ionicons name="star" size={15} color="#2F9C74" />
          <Text style={styles.ratingText}>
            {Number(item.ratingAvg ?? 0) > 0 ? Number(item.ratingAvg).toFixed(1) : "4.6"}
          </Text>
        </View>

        <View
          style={[
            styles.logoWrap,
            compact ? styles.logoWrapCompact : null,
            { backgroundColor: palette.tint },
          ]}
        >
          {item.sellerLogoUrl ? (
            <Image source={{ uri: item.sellerLogoUrl }} style={styles.logoImage} />
          ) : (
            <Text style={[styles.logoText, compact ? styles.logoTextCompact : null, { color: palette.accent }]}>
              {logoInitials}
            </Text>
          )}
        </View>
      </View>

      <View style={[styles.body, compact ? styles.bodyCompact : null]}>
        <View style={styles.titleRow}>
          <View style={styles.titleBlock}>
            <Text style={[styles.title, isSoldOut ? styles.textMuted : null]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text
              style={[styles.subtitle, compact ? styles.subtitleCompact : null, isSoldOut ? styles.textMutedSoft : null]}
              numberOfLines={1}
            >
              {item.description}
            </Text>
          </View>

          <View style={styles.actions}>
            {showAlertIcon ? (
              <Pressable
                style={styles.iconButton}
                onPress={(e) => {
                  e.stopPropagation?.();
                }}
              >
                <Ionicons
                  name="notifications-outline"
                  size={22}
                  color={isSoldOut ? "#90A19F" : "#116B62"}
                />
              </Pressable>
            ) : null}
            <Pressable
              style={styles.iconButton}
              onPress={(e) => {
                e.stopPropagation?.();
                onToggleFavourite();
              }}
            >
              <Ionicons name={isFavourite ? "heart" : "heart-outline"} size={26} color="#116B62" />
            </Pressable>
          </View>
        </View>

        <Text style={[styles.metaLine, isSoldOut ? styles.textMutedSoft : null]} numberOfLines={1}>
          {[pickupText, distance].filter(Boolean).join("   |   ")}
        </Text>

        <View style={[styles.divider, compact ? styles.dividerCompact : null]} />

        <View style={styles.footer}>
          <View style={[styles.statusChip, isSoldOut ? styles.statusChipMuted : styles.statusChipLive]}>
            <Ionicons
              name={isSoldOut ? "moon-outline" : "sparkles-outline"}
              size={15}
              color={isSoldOut ? "#6C7A79" : "#116B62"}
            />
            <Text
              style={[
                styles.statusChipText,
                isSoldOut ? styles.statusChipTextMuted : styles.statusChipTextLive,
              ]}
            >
              {isSoldOut ? t("favourites.alert") : t("favourites.availableNow")}
            </Text>
          </View>

          <View style={styles.priceWrap}>
            {priceBefore ? <Text style={styles.oldPrice}>{priceBefore}</Text> : null}
            <Text style={[styles.price, isSoldOut ? styles.textMuted : null]}>{priceNow}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 26,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E4EBE8",
    backgroundColor: "#fff",
    shadowColor: "#23413C",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  cardCompact: {
    borderRadius: 24,
  },
  cardSoldOut: { backgroundColor: "#FBFBF9" },
  heroWrap: { height: 136, position: "relative", backgroundColor: "#D9E6E3" },
  heroWrapCompact: { height: 125 },
  heroImage: { flex: 1 },
  heroImageStyle: { borderTopLeftRadius: 25, borderTopRightRadius: 25 },
  heroShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(20, 32, 30, 0.10)",
  },
  heroShadeSoldOut: {
    backgroundColor: "rgba(247, 245, 239, 0.62)",
  },
  heroFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  heroPatternOrbA: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.20)",
    top: -30,
    right: -20,
  },
  heroPatternOrbB: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.18)",
    bottom: -20,
    left: -10,
  },
  heroFallbackLabel: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 0.4,
    paddingHorizontal: 24,
    textAlign: "center",
  },
  badge: {
    position: "absolute",
    top: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#fff",
  },
  badgeLeft: { left: 14 },
  badgeRight: { right: 14 },
  badgeWarm: { backgroundColor: "#FFF1B6" },
  badgeMuted: { backgroundColor: "#F0F3F2" },
  badgeTextWarm: { color: "#384442", fontWeight: "800", fontSize: 13 },
  badgeTextMuted: { color: "#5F6C6A", fontWeight: "800", fontSize: 13 },
  ratingText: { color: "#2A3433", fontWeight: "800", fontSize: 13 },
  logoWrap: {
    position: "absolute",
    left: 16,
    bottom: 12,
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 4,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoWrapCompact: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  logoImage: { width: "100%", height: "100%" },
  logoText: { fontSize: 20, fontWeight: "800" },
  logoTextCompact: { fontSize: 18 },
  body: { paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11 },
  bodyCompact: { paddingHorizontal: 15, paddingTop: 10, paddingBottom: 10 },
  titleRow: { flexDirection: "row", gap: 12 },
  titleBlock: { flex: 1 },
  title: { fontSize: 17, fontWeight: "800", color: "#223130" },
  subtitle: { marginTop: 3, fontSize: 13, lineHeight: 18, color: "#4D5C5A" },
  subtitleCompact: { fontSize: 12.5, lineHeight: 17 },
  actions: { flexDirection: "row", alignItems: "flex-start", gap: 2 },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  metaLine: { marginTop: 6, fontSize: 12.5, lineHeight: 17, color: "#61716F" },
  divider: {
    marginTop: 10,
    marginBottom: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#DCE6E3",
    borderStyle: "dashed",
  },
  dividerCompact: {
    marginTop: 9,
    marginBottom: 9,
  },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  statusChipLive: { backgroundColor: "#EDF8F4" },
  statusChipMuted: { backgroundColor: "#F1F3F2" },
  statusChipText: { fontWeight: "700", fontSize: 12.5 },
  statusChipTextLive: { color: "#116B62" },
  statusChipTextMuted: { color: "#6C7A79" },
  priceWrap: { alignItems: "flex-end" },
  oldPrice: {
    fontSize: 12,
    color: "#7F8C8B",
    textDecorationLine: "line-through",
    marginBottom: 1,
    fontWeight: "600",
  },
  price: { fontSize: 16, color: "#1F2C2B", fontWeight: "800" },
  textMuted: { color: "#687775" },
  textMutedSoft: { color: "#8A9896" },
});
