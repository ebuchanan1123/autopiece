import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, Stack } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle, Defs, LinearGradient, Line, Path, Rect, Stop } from "react-native-svg";
import { clearToken } from "@/src/lib/token";
import { unregisterStoredPushTokenFromServer } from "@/src/features/notifications/push";
import { ScreenBody } from "@/src/components/screen-body";
import {
  getSellerOrders,
  markSellerOrderItemPickedUp,
  type SellerOrderItem,
} from "@/src/features/sellers/seller-dashboard.api";
import { getMySellerProfile, type SellerProfile } from "@/src/features/sellers/sellers.api";
import { getMyListings, type Listing } from "@/src/features/listings/listings.api";
import { getMyProfile } from "@/src/features/profile/profile.api";
import { getProfileSettings } from "@/src/features/profile/profile.store";

type Timeframe = "24h" | "3d" | "7d" | "1m" | "3m" | "1yr" | "Max";

type SellerMenuSection = {
  title: string;
  items: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress: () => void;
  }[];
};

const TIMEFRAMES: Timeframe[] = ["24h", "3d", "7d", "1m", "3m", "1yr", "Max"];

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
        <Ionicons name={icon} size={22} color="#2C3735" />
        <Text style={styles.menuRowText}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#8B9794" />
    </Pressable>
  );
}

function formatPeriod(date: Date, timeframe: Timeframe) {
  if (timeframe === "24h") {
    return date.toLocaleTimeString("en-CA", { hour: "numeric" });
  }
  if (timeframe === "3d" || timeframe === "7d") {
    return date.toLocaleDateString("en-CA", { weekday: "short" });
  }
  if (timeframe === "1m" || timeframe === "3m") {
    return date.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
  }
  if (timeframe === "1yr") {
    return date.toLocaleDateString("en-CA", { month: "short" });
  }
  return date.toLocaleDateString("en-CA", { month: "short", year: "2-digit" });
}

function getCutoff(timeframe: Timeframe) {
  if (timeframe === "Max") return null;
  const now = new Date();
  const cutoff = new Date(now);
  if (timeframe === "24h") cutoff.setHours(cutoff.getHours() - 24);
  if (timeframe === "3d") cutoff.setDate(cutoff.getDate() - 3);
  if (timeframe === "7d") cutoff.setDate(cutoff.getDate() - 7);
  if (timeframe === "1m") cutoff.setMonth(cutoff.getMonth() - 1);
  if (timeframe === "3m") cutoff.setMonth(cutoff.getMonth() - 3);
  if (timeframe === "1yr") cutoff.setFullYear(cutoff.getFullYear() - 1);
  return cutoff;
}

function startOfHour(date: Date) {
  const next = new Date(date);
  next.setMinutes(0, 0, 0);
  return next;
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function startOfMonth(date: Date) {
  const next = startOfDay(date);
  next.setDate(1);
  return next;
}

function addHours(date: Date, hours: number) {
  const next = new Date(date);
  next.setHours(next.getHours() + hours);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function getBucketDate(date: Date, timeframe: Timeframe) {
  if (timeframe === "24h") return startOfHour(date);
  if (timeframe === "Max") return startOfMonth(date);
  return startOfDay(date);
}

function getBucketKey(date: Date, timeframe: Timeframe) {
  const bucketDate = getBucketDate(date, timeframe);
  if (timeframe === "24h") {
    return `${bucketDate.getFullYear()}-${bucketDate.getMonth()}-${bucketDate.getDate()}-${bucketDate.getHours()}`;
  }
  if (timeframe === "Max") {
    return `${bucketDate.getFullYear()}-${bucketDate.getMonth()}`;
  }
  return `${bucketDate.getFullYear()}-${bucketDate.getMonth()}-${bucketDate.getDate()}`;
}

function buildBucketDates(orders: SellerOrderItem[], timeframe: Timeframe) {
  const now = new Date();

  if (timeframe === "24h") {
    const end = startOfHour(now);
    return Array.from({ length: 24 }, (_, index) => addHours(end, index - 23));
  }

  if (timeframe === "3d") {
    const end = startOfDay(now);
    return Array.from({ length: 3 }, (_, index) => addDays(end, index - 2));
  }

  if (timeframe === "7d") {
    const end = startOfDay(now);
    return Array.from({ length: 7 }, (_, index) => addDays(end, index - 6));
  }

  if (timeframe === "1m") {
    const end = startOfDay(now);
    return Array.from({ length: 30 }, (_, index) => addDays(end, index - 29));
  }

  if (timeframe === "3m") {
    const end = startOfDay(now);
    return Array.from({ length: 90 }, (_, index) => addDays(end, index - 89));
  }

  if (timeframe === "1yr") {
    const end = startOfDay(now);
    return Array.from({ length: 365 }, (_, index) => addDays(end, index - 364));
  }

  const paidOrders = orders.filter((item) => item.status === "paid" || item.status === "picked_up");
  if (!paidOrders.length) {
    const end = startOfMonth(now);
    return Array.from({ length: 6 }, (_, index) => addMonths(end, index - 5));
  }

  const dates = paidOrders
    .map((item) => new Date(item.createdAt))
    .filter((item) => !Number.isNaN(item.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  const first = startOfMonth(dates[0] ?? now);
  const end = startOfMonth(now);
  const buckets: Date[] = [];
  const cursor = new Date(first);

  while (cursor.getTime() <= end.getTime()) {
    buckets.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return buckets;
}

function buildSeries(orders: SellerOrderItem[], timeframe: Timeframe) {
  const paidOrders = orders.filter((item) => item.status === "paid" || item.status === "picked_up");
  const cutoff = getCutoff(timeframe);
  const filtered = cutoff
    ? paidOrders.filter((item) => new Date(item.createdAt).getTime() >= cutoff.getTime())
    : paidOrders;
  const map = new Map<string, { label: string; revenue: number; sales: number }>();

  for (const bucketDate of buildBucketDates(filtered, timeframe)) {
    map.set(getBucketKey(bucketDate, timeframe), {
      label: formatPeriod(bucketDate, timeframe),
      revenue: 0,
      sales: 0,
    });
  }

  for (const item of filtered) {
    const date = new Date(item.createdAt);
    const key = getBucketKey(date, timeframe);

    const current = map.get(key);
    if (current) {
      current.revenue += Number(item.unitPriceDzd ?? 0) * Number(item.quantity ?? 1);
      current.sales += Number(item.quantity ?? 1);
    } else {
      map.set(key, {
        label: formatPeriod(date, timeframe),
        revenue: Number(item.unitPriceDzd ?? 0) * Number(item.quantity ?? 1),
        sales: Number(item.quantity ?? 1),
      });
    }
  }

  return Array.from(map.values());
}

function GraphCard({
  title,
  subtitle,
  series,
  rangeLabel,
  revenueValue,
  soldValue,
}: {
  title: string;
  subtitle: string;
  series: { label: string; revenue: number }[];
  rangeLabel: string;
  revenueValue: string;
  soldValue: string;
}) {
  const [selectedIndex, setSelectedIndex] = useState(series.length ? series.length - 1 : 0);
  const width = 312;
  const height = 180;
  const chartTop = 14;
  const chartBottom = 142;
  const chartLeft = 10;
  const chartRight = width - 10;
  const values = series.map((item) => item.revenue);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);

  useEffect(() => {
    setSelectedIndex(series.length ? series.length - 1 : 0);
  }, [series]);

  const points = series.map((item, index) => {
    const x =
      series.length === 1
        ? width / 2
        : chartLeft + (index / (series.length - 1)) * (chartRight - chartLeft);
    const y = chartBottom - ((item.revenue - min) / range) * (chartBottom - chartTop);
    return { x, y, label: item.label, value: item.revenue };
  });
  const safeIndex = Math.min(Math.max(selectedIndex, 0), Math.max(points.length - 1, 0));
  const activePoint = points[safeIndex];
  const activeItem = series[safeIndex];

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1]?.x ?? chartRight} ${chartBottom} L ${points[0]?.x ?? chartLeft} ${chartBottom} Z`;
  const guideValues = [0, 0.33, 0.66, 1].map((ratio) => Math.round(min + range * ratio)).reverse();

  return (
    <View style={styles.graphCard}>
      <View style={styles.graphTopRow}>
        <View style={styles.graphTitleWrap}>
          <Text style={styles.graphTitle}>{title}</Text>
          <Text style={styles.graphSubtitle}>{subtitle}</Text>
        </View>
        <View style={styles.graphRangePill}>
          <Text style={styles.graphRangeText}>{rangeLabel}</Text>
        </View>
      </View>

      <View style={styles.graphMetricsRow}>
        <View style={styles.graphMetric}>
          <Text style={styles.graphMetricLabel}>Revenue</Text>
          <Text style={styles.graphMetricValue}>{revenueValue}</Text>
        </View>
        <View style={styles.graphMetricDivider} />
        <View style={styles.graphMetric}>
          <Text style={styles.graphMetricLabel}>Bags sold</Text>
          <Text style={styles.graphMetricValue}>{soldValue}</Text>
        </View>
      </View>

      <View style={styles.chartShell}>
        <View style={styles.yAxis}>
          {guideValues.map((value, index) => (
            <Text key={`${value}-${index}`} style={styles.axisLabel}>
              {value}
            </Text>
          ))}
        </View>

        <View style={styles.chartWrap}>
          {activePoint ? (
            <View
              style={[
                styles.chartTooltip,
                {
                  left: `${((activePoint.x - chartLeft) / Math.max(chartRight - chartLeft, 1)) * 100}%`,
                },
              ]}
            >
              <Text style={styles.chartTooltipLabel}>{activeItem?.label ?? ""}</Text>
              <Text style={styles.chartTooltipValue}>{Math.round(activePoint.value)} DZD</Text>
            </View>
          ) : null}

          <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
            <Defs>
              <LinearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#77C7E8" stopOpacity="0.42" />
                <Stop offset="100%" stopColor="#77C7E8" stopOpacity="0.06" />
              </LinearGradient>
            </Defs>

            {[0, 0.33, 0.66, 1].map((ratio, index) => {
              const y = chartBottom - ratio * (chartBottom - chartTop);
              return (
                <Line
                  key={`guide-${index}`}
                  x1={chartLeft}
                  x2={chartRight}
                  y1={y}
                  y2={y}
                  stroke="#E5ECEA"
                  strokeWidth="1"
                />
              );
            })}

            <Rect
              x={chartLeft}
              y={chartTop}
              width={chartRight - chartLeft}
              height={chartBottom - chartTop}
              rx={18}
              fill="transparent"
            />
            <Path d={areaPath} fill="url(#areaFill)" />
            <Path
              d={linePath}
              fill="none"
              stroke="#4A9FE6"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {activePoint ? (
              <>
                <Line
                  x1={activePoint.x}
                  x2={activePoint.x}
                  y1={chartTop}
                  y2={chartBottom}
                  stroke="#9FD1EF"
                  strokeWidth="2"
                  strokeDasharray="6 6"
                />
                <Circle cx={activePoint.x} cy={activePoint.y} r="7" fill="#FFFFFF" stroke="#4A9FE6" strokeWidth="3" />
                <Circle cx={activePoint.x} cy={activePoint.y} r="3" fill="#4A9FE6" />
              </>
            ) : null}
          </Svg>

          <View style={styles.chartTapOverlay} pointerEvents="box-none">
            {series.map((item, index) => (
              <Pressable
                key={`${item.label}-${index}-hit`}
                onPress={() => setSelectedIndex(index)}
                style={styles.chartTapZone}
              />
            ))}
          </View>

        </View>
      </View>
    </View>
  );
}

function timeFrameLabel(timeframe: Timeframe) {
  switch (timeframe) {
    case "24h":
      return "Last 24 hours";
    case "3d":
      return "Last 3 days";
    case "7d":
      return "Last 7 days";
    case "1m":
      return "Last month";
    case "3m":
      return "Last 3 months";
    case "1yr":
      return "Last year";
    default:
      return "All time";
  }
}

function bagsSoldInSeries(series: { sales: number }[]) {
  return series.reduce((sum, item) => sum + item.sales, 0);
}

function StatCard({
  label,
  value,
  accent = false,
  footnote,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
  footnote?: string;
}) {
  return (
    <View style={[styles.statCard, accent ? styles.statCardAccent : null]}>
      <Text style={[styles.statLabel, accent ? styles.statLabelAccent : null]}>{label}</Text>
      <Text style={[styles.statValue, accent ? styles.statValueAccent : null]}>{value}</Text>
      {footnote ? <Text style={[styles.statFootnote, accent ? styles.statFootnoteAccent : null]}>{footnote}</Text> : null}
    </View>
  );
}

function sellerStatusLabel(status?: string) {
  if (status === "picked_up") return "Picked up";
  if (status === "paid") return "In progress";
  if (status === "expired") return "Expired";
  if (status === "reserved") return "Reserved";
  return status?.replace("_", " ") ?? "Order";
}

export default function SellerDashboardScreen() {
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<SellerOrderItem[]>([]);
  const [profileName, setProfileName] = useState("");
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [timeframe, setTimeframe] = useState<Timeframe>("7d");
  const [pickupTarget, setPickupTarget] = useState<SellerOrderItem | null>(null);
  const [pickupPinInput, setPickupPinInput] = useState("");
  const [pickupSaving, setPickupSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await getMyProfile().catch(() => {});
      const [profile, sellerOrders, seller, sellerListings] = await Promise.all([
        getProfileSettings(),
        getSellerOrders(),
        getMySellerProfile(),
        getMyListings(),
      ]);
      setProfileName(profile.username || seller.storeName || "Seller");
      setOrders(sellerOrders);
      setSellerProfile(seller);
      setListings(sellerListings);
    } catch (e: any) {
      setError(e?.message ?? "Could not load seller dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  const markPickedUp = useCallback(
    async (itemId: number, pickupPin: string) => {
      try {
        await markSellerOrderItemPickedUp(itemId, pickupPin);
        await load();
      } catch (e: any) {
        Alert.alert("Could not update order", e?.message ?? "Please try again.");
      }
    },
    [load]
  );

  const submitPickupConfirmation = useCallback(async () => {
    if (!pickupTarget) return;

    const normalizedPin = pickupPinInput.trim();
    if (!/^\d{4}$/.test(normalizedPin)) {
      Alert.alert("Invalid PIN", "Enter the 4-digit pickup PIN shown on the customer's screen.");
      return;
    }

    try {
      setPickupSaving(true);
      await markPickedUp(pickupTarget.id, normalizedPin);
      setPickupTarget(null);
      setPickupPinInput("");
    } finally {
      setPickupSaving(false);
    }
  }, [markPickedUp, pickupPinInput, pickupTarget]);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const paidOrders = useMemo(
    () => orders.filter((item) => item.status === "paid" || item.status === "picked_up"),
    [orders]
  );
  const reservedCount = useMemo(
    () => orders.filter((item) => item.status === "reserved").length,
    [orders]
  );
  const paidCount = useMemo(
    () => paidOrders.reduce((sum, item) => sum + Number(item.quantity ?? 1), 0),
    [paidOrders]
  );
  const totalRevenue = useMemo(
    () => paidOrders.reduce((sum, item) => sum + Number(item.unitPriceDzd ?? 0) * Number(item.quantity ?? 1), 0),
    [paidOrders]
  );
  const todaysRevenue = useMemo(() => {
    const today = new Date();
    return paidOrders
      .filter((item) => {
        const d = new Date(item.createdAt);
        return (
          d.getFullYear() === today.getFullYear() &&
          d.getMonth() === today.getMonth() &&
          d.getDate() === today.getDate()
        );
      })
      .reduce((sum, item) => sum + Number(item.unitPriceDzd ?? 0) * Number(item.quantity ?? 1), 0);
  }, [paidOrders]);
  const averageOrderValue = useMemo(
    () => (paidOrders.length ? Math.round(totalRevenue / paidOrders.length) : 0),
    [paidOrders.length, totalRevenue]
  );
  const revenueTrend = useMemo(() => buildSeries(orders, timeframe), [orders, timeframe]);
  const trendRevenueTotal = useMemo(
    () => revenueTrend.reduce((sum, item) => sum + item.revenue, 0),
    [revenueTrend]
  );

  const activeListings = useMemo(
    () => listings.filter((item) => item.status === "active").length,
    [listings]
  );
  const soldOutListings = useMemo(
    () => listings.filter((item) => item.status === "sold_out").length,
    [listings]
  );
  const pausedListings = useMemo(
    () => listings.filter((item) => item.status === "hidden").length,
    [listings]
  );
  const liveQuantityRemaining = useMemo(
    () =>
      listings
        .filter((item) => item.status === "active" || item.status === "sold_out")
        .reduce((sum, item) => sum + Number(item.quantityAvailable ?? 0), 0),
    [listings]
  );
  const totalUnitsSold = useMemo(
    () => paidOrders.reduce((sum, item) => sum + Number(item.quantity ?? 1), 0),
    [paidOrders]
  );
  const sellThroughRate = useMemo(() => {
    const totalPool = totalUnitsSold + liveQuantityRemaining;
    return totalPool > 0 ? Math.round((totalUnitsSold / totalPool) * 100) : 0;
  }, [totalUnitsSold, liveQuantityRemaining]);
  const salesTrendPct = useMemo(() => {
    if (revenueTrend.length < 2) return 0;
    const midpoint = Math.ceil(revenueTrend.length / 2);
    const previous = revenueTrend.slice(0, midpoint).reduce((sum, item) => sum + item.revenue, 0);
    const recent = revenueTrend.slice(midpoint).reduce((sum, item) => sum + item.revenue, 0);
    if (previous === 0) return recent > 0 ? 100 : 0;
    return Math.round(((recent - previous) / previous) * 100);
  }, [revenueTrend]);

  const recentOrders = useMemo(
    () =>
      [...orders]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 6),
    [orders]
  );

  const menuSections: SellerMenuSection[] = [
    {
      title: "Business",
      items: [
        { icon: "storefront-outline", label: "Seller settings", onPress: () => router.push("/(app)/seller-settings") },
        { icon: "albums-outline", label: "My listings", onPress: () => router.push("/(app)/seller-listings") },
        { icon: "language-outline", label: "Preferences", onPress: () => router.push("/(app)/preferences") },
      ],
    },
    {
      title: "Support",
      items: [
        { icon: "headset-outline", label: "Customer support", onPress: () => router.push("/(app)/help") },
        { icon: "hammer-outline", label: "Legal", onPress: () => router.push("/(app)/legal") },
      ],
    },
  ];

  const initials =
    sellerProfile?.storeName
      ?.split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "SB";

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenBody>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 30 }]}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={load}
              tintColor="#0B6E69"
              colors={["#0B6E69"]}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <Text style={styles.eyebrow}>Seller dashboard</Text>
              <Text style={styles.title}>{profileName}</Text>
              <Text style={styles.subtitle}>
                Monitor revenue, keep an eye on sell-through, and stay on top of incoming orders.
              </Text>
            </View>

            <Pressable style={styles.headerIconButton} onPress={() => setMenuOpen(true)}>
              <View style={styles.headerAvatarCircle}>
                {sellerProfile?.logoUrl ? (
                  <Image source={{ uri: sellerProfile.logoUrl }} style={styles.headerAvatarImage} />
                ) : (
                  <Text style={styles.headerAvatarText}>{initials}</Text>
                )}
              </View>
            </Pressable>
          </View>

          <View style={styles.headerDivider} />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.statsRow}>
            <StatCard label="Revenue" value={`${totalRevenue} DZD`} accent footnote={`${todaysRevenue} DZD today`} />
            <StatCard label="Sold bags" value={paidCount} footnote={`${reservedCount} reserved`} />
          </View>

          <View style={styles.statsRow}>
            <StatCard label="Sell-through" value={`${sellThroughRate}%`} footnote={`${liveQuantityRemaining} live units left`} />
            <StatCard label="Avg order" value={`${averageOrderValue} DZD`} footnote={`${activeListings} active • ${pausedListings} paused`} />
          </View>

          <View style={styles.insightRow}>
            <View style={styles.insightCard}>
              <Text style={styles.insightLabel}>Sales trend</Text>
              <Text style={[styles.insightValue, salesTrendPct >= 0 ? styles.upText : styles.downText]}>
                {salesTrendPct >= 0 ? "+" : ""}
                {salesTrendPct}%
              </Text>
              <Text style={styles.insightSubtext}>vs earlier in this selected period</Text>
            </View>
            <View style={styles.insightCard}>
              <Text style={styles.insightLabel}>Listings sold out</Text>
              <Text style={styles.insightValue}>{soldOutListings}</Text>
              <Text style={styles.insightSubtext}>{pausedListings} paused separately from stock-outs</Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Sales analytics</Text>
            <Text style={styles.sectionMeta}>{trendRevenueTotal} DZD in range</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterTabs}>
            {TIMEFRAMES.map((item) => {
              const active = timeframe === item;
              return (
                <Pressable
                  key={item}
                  onPress={() => setTimeframe(item)}
                  style={[styles.filterChip, active ? styles.filterChipActive : null]}
                >
                  <Text style={[styles.filterChipText, active ? styles.filterChipTextActive : null]}>{item}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <GraphCard
            title="Revenue over time"
            subtitle="Track total DZD sold across the selected range."
            series={revenueTrend}
            rangeLabel={timeFrameLabel(timeframe)}
            revenueValue={`${trendRevenueTotal} DZD`}
            soldValue={String(bagsSoldInSeries(revenueTrend))}
          />
          

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Incoming orders</Text>
            <Text style={styles.sectionMeta}>{orders.length} total</Text>
          </View>

          {recentOrders.length > 0 ? (
            recentOrders.map((item) => (
              <View key={item.id} style={styles.orderCard}>
                <View style={styles.orderTop}>
                  <Text style={styles.orderNumber}>{item.listing?.title ?? `Bag ${item.saleNumber}`}</Text>
                  <View
                    style={[
                      styles.statusPill,
                      item.status === "paid" || item.status === "picked_up"
                        ? styles.statusPaid
                        : styles.statusReserved,
                    ]}
                  >
                    <Text style={styles.statusText}>{sellerStatusLabel(item.status)}</Text>
                  </View>
                </View>
                <Text style={styles.orderMeta}>
                  {item.order?.orderNumber ?? `Order ${item.orderId}`} • Sale {item.saleNumber}
                </Text>
                <Text style={styles.orderMeta}>Quantity {item.quantity} • {item.unitPriceDzd} DZD</Text>
                <Text style={styles.orderDate}>{new Date(item.createdAt).toLocaleString()}</Text>
                {item.status !== "picked_up" ? (
                  <Pressable
                    style={styles.pickupBtn}
                    onPress={() => {
                      setPickupTarget(item);
                      setPickupPinInput("");
                    }}
                  >
                    <Text style={styles.pickupBtnText}>Set picked up</Text>
                  </Pressable>
                ) : null}
              </View>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No seller orders yet</Text>
              <Text style={styles.emptyText}>
                Once customers reserve and pay for your bags, they&apos;ll show up here.
              </Text>
            </View>
          )}
        </ScrollView>

        <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
          <View style={styles.modalOverlay}>
            <Pressable style={styles.modalBackdrop} onPress={() => setMenuOpen(false)} />
            <View style={[styles.sidePanel, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 24 }]}>
              <View style={styles.panelHeader}>
                <Text style={styles.panelTitle}>Manage seller account</Text>
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
                  Alert.alert("Log out", "Are you sure you want to log out of the seller account?", [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Log out",
                      style: "destructive",
                      onPress: async () => {
                        await unregisterStoredPushTokenFromServer();
                        await clearToken();
                        router.replace("/(auth)/login");
                      },
                    },
                  ]);
                }}
              >
                <Text style={styles.logoutText}>Log out</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <Modal visible={!!pickupTarget} transparent animationType="fade" onRequestClose={() => setPickupTarget(null)}>
          <View style={styles.pickupOverlay}>
            <Pressable style={styles.pickupBackdrop} onPress={() => setPickupTarget(null)} />
            <View style={styles.pickupModalCard}>
              <Text style={styles.pickupModalTitle}>Confirm customer pickup</Text>
              <Text style={styles.pickupModalBody}>
                Ask the customer to show their 4-digit pickup PIN, then enter it here before handing over the bag.
              </Text>
              <TextInput
                style={styles.pickupPinInput}
                value={pickupPinInput}
                onChangeText={setPickupPinInput}
                keyboardType="number-pad"
                maxLength={4}
                placeholder="1234"
                placeholderTextColor="#8B9794"
              />
              <View style={styles.pickupModalActions}>
                <Pressable style={styles.pickupGhostBtn} onPress={() => setPickupTarget(null)}>
                  <Text style={styles.pickupGhostText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.pickupSolidBtn} onPress={submitPickupConfirmation} disabled={pickupSaving}>
                  <Text style={styles.pickupSolidText}>{pickupSaving ? "Checking..." : "Confirm pickup"}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </ScreenBody>
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18 },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  headerText: { flex: 1, paddingRight: 16 },
  eyebrow: {
    color: "#6B7A77",
    fontSize: 14,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  title: { marginTop: 6, fontSize: 30, lineHeight: 36, fontWeight: "900", color: "#1F2C2B" },
  subtitle: { marginTop: 10, fontSize: 16, lineHeight: 26, color: "#596765" },
  headerIconButton: { marginTop: 2 },
  headerAvatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: "#E5F2EE",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D4E7E1",
  },
  headerAvatarImage: { width: "100%", height: "100%" },
  headerAvatarText: { color: "#116B62", fontWeight: "900", fontSize: 20 },
  headerDivider: {
    height: 1,
    backgroundColor: "#E7ECE9",
    marginBottom: 18,
  },
  error: { marginBottom: 12, color: "#B54E41", fontWeight: "800" },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E1EAE6",
    borderRadius: 22,
    padding: 16,
  },
  statCardAccent: { backgroundColor: "#0C766F" },
  statLabel: { color: "#72817F", fontWeight: "800", fontSize: 13, textTransform: "uppercase" },
  statLabelAccent: { color: "#CBE6DF" },
  statValue: { marginTop: 8, fontSize: 22, fontWeight: "900", color: "#1F2C2B" },
  statValueAccent: { color: "#FFFFFF" },
  statFootnote: { marginTop: 6, color: "#7A8784", fontWeight: "700", fontSize: 12 },
  statFootnoteAccent: { color: "#D8F1EA" },
  insightRow: { flexDirection: "row", gap: 12, marginBottom: 18 },
  insightCard: {
    flex: 1,
    backgroundColor: "#F8FBFA",
    borderWidth: 1,
    borderColor: "#E2ECE8",
    borderRadius: 22,
    padding: 16,
  },
  insightLabel: { color: "#72817F", fontWeight: "800", fontSize: 13, textTransform: "uppercase" },
  insightValue: { marginTop: 8, fontSize: 24, fontWeight: "900", color: "#1F2C2B" },
  upText: { color: "#0C766F" },
  downText: { color: "#B54E41" },
  insightSubtext: { marginTop: 6, color: "#6E7C79", fontWeight: "700", lineHeight: 20 },
  sectionHeader: {
    marginTop: 10,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  sectionTitle: { fontSize: 22, fontWeight: "900", color: "#1F2C2B" },
  sectionMeta: { fontSize: 14, color: "#72817F", fontWeight: "800" },
  filterTabs: { gap: 10, paddingBottom: 14 },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#F1F6F4",
    borderWidth: 1,
    borderColor: "#DDE7E3",
  },
  filterChipActive: {
    backgroundColor: "#0C766F",
    borderColor: "#0C766F",
  },
  filterChipText: { color: "#0C766F", fontWeight: "800" },
  filterChipTextActive: { color: "#FFFFFF" },
  graphCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E1EAE6",
    borderRadius: 24,
    padding: 18,
    marginBottom: 20,
  },
  graphTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  graphTitleWrap: { flex: 1 },
  graphTitle: { color: "#1F2C2B", fontWeight: "900", fontSize: 20 },
  graphSubtitle: { marginTop: 6, color: "#6B7A77", fontWeight: "700", lineHeight: 22 },
  graphRangePill: {
    borderRadius: 999,
    backgroundColor: "#F3F7F6",
    borderWidth: 1,
    borderColor: "#E0E9E6",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  graphRangeText: { color: "#5F6D6A", fontWeight: "800", fontSize: 12 },
  graphMetricsRow: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  graphMetric: { flex: 1 },
  graphMetricDivider: { width: 1, height: 42, backgroundColor: "#E7EDEB" },
  graphMetricLabel: { color: "#7A8784", fontWeight: "800", fontSize: 12, textTransform: "uppercase" },
  graphMetricValue: { marginTop: 6, color: "#1F2C2B", fontWeight: "900", fontSize: 22 },
  chartShell: { marginTop: 18, flexDirection: "row", gap: 10 },
  yAxis: {
    width: 40,
    height: 180,
    justifyContent: "space-between",
    paddingTop: 8,
    paddingBottom: 38,
  },
  axisLabel: { color: "#95A2A0", fontSize: 11, fontWeight: "700" },
  chartWrap: { flex: 1, position: "relative" },
  chartTooltip: {
    position: "absolute",
    top: -4,
    zIndex: 2,
    transform: [{ translateX: -42 }],
    minWidth: 84,
    backgroundColor: "#1F2C2B",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  chartTooltipLabel: { color: "#D8E7E4", fontSize: 11, fontWeight: "800", textAlign: "center" },
  chartTooltipValue: { color: "#FFFFFF", fontSize: 13, fontWeight: "900", textAlign: "center", marginTop: 2 },
  chartTapOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: "row",
  },
  chartTapZone: { flex: 1 },
  pickupOverlay: {
    flex: 1,
    backgroundColor: "rgba(27, 37, 35, 0.32)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  pickupBackdrop: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  pickupModalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E1EAE6",
    padding: 20,
  },
  pickupModalTitle: { color: "#1F2C2B", fontSize: 22, fontWeight: "900" },
  pickupModalBody: { marginTop: 10, color: "#5D6A68", fontWeight: "700", lineHeight: 22 },
  pickupPinInput: {
    marginTop: 18,
    borderWidth: 1,
    borderColor: "#D8E4E0",
    borderRadius: 18,
    backgroundColor: "#F8FBFA",
    paddingVertical: 16,
    paddingHorizontal: 16,
    textAlign: "center",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 10,
    color: "#1F2C2B",
  },
  pickupModalActions: { marginTop: 18, flexDirection: "row", gap: 12 },
  pickupGhostBtn: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D8E4E0",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  pickupGhostText: { color: "#1F2C2B", fontWeight: "800" },
  pickupSolidBtn: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: "#0C766F",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  pickupSolidText: { color: "#FFFFFF", fontWeight: "900" },
  orderCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E1EAE6",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  orderTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  orderNumber: { fontSize: 17, fontWeight: "900", color: "#1F2C2B" },
  statusPill: { borderRadius: 999, paddingVertical: 7, paddingHorizontal: 12 },
  statusReserved: { backgroundColor: "#EEF7F3" },
  statusPaid: { backgroundColor: "#E6F4EF" },
  statusText: { color: "#116B62", fontWeight: "800", fontSize: 13, textTransform: "capitalize" },
  orderMeta: { marginTop: 8, color: "#5D6A68", fontWeight: "700" },
  orderDate: { marginTop: 8, color: "#8A9794", fontWeight: "700", fontSize: 13 },
  pickupBtn: {
    marginTop: 14,
    borderRadius: 14,
    backgroundColor: "#0C766F",
    alignItems: "center",
    paddingVertical: 12,
  },
  pickupBtnText: { color: "#FFFFFF", fontWeight: "900", fontSize: 14 },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E1EAE6",
    borderRadius: 20,
    padding: 18,
  },
  emptyTitle: { color: "#1F2C2B", fontSize: 18, fontWeight: "900" },
  emptyText: { marginTop: 8, color: "#72817F", fontWeight: "700", lineHeight: 24 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(27, 37, 35, 0.24)",
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  modalBackdrop: { flex: 1 },
  sidePanel: {
    width: "88%",
    maxWidth: 420,
    backgroundColor: "#FFFDF8",
    paddingHorizontal: 22,
    shadowColor: "#000000",
    shadowOpacity: 0.15,
    shadowRadius: 18,
    shadowOffset: { width: -4, height: 0 },
    elevation: 6,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  panelTitle: { fontSize: 22, fontWeight: "900", color: "#1F2C2B" },
  menuSection: { marginBottom: 20 },
  menuSectionTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#6E7C79",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  menuRow: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E4EBE8",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  menuRowLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  menuRowText: { fontSize: 16, fontWeight: "700", color: "#253230" },
  logoutBtn: {
    marginTop: 10,
    borderWidth: 2,
    borderColor: "#C63D54",
    borderRadius: 999,
    alignItems: "center",
    paddingVertical: 16,
  },
  logoutText: { color: "#C63D54", fontWeight: "900", fontSize: 18 },
});
