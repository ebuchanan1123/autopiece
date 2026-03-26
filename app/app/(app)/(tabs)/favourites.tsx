import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { Stack, router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useLang } from "@/src/features/i18n/lang.context";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { getMyFavourites } from "@/src/features/favourites/favourites.api";
import { getListings, type Listing } from "@/src/features/listings/listings.api";
import {
  useFavouritesStore,
  useHydrateFavourites,
  refreshFavourites as refreshFavouritesStore,
  toggleFavourite,
} from "@/src/features/favourites/favourites.store";
import { ListingCard } from "@/src/components/listing-card";

function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) *
      Math.sin(dLon / 2) *
      Math.cos(lat1) *
      Math.cos(lat2);

  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export default function FavouritesScreen() {
  useHydrateFavourites();
  const { t } = useLang();
  const insets = useSafeAreaInsets();
  const refreshOffset = insets.top + 24;
  const { ids, hydrated } = useFavouritesStore();

  const [cache, setCache] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [userLoc, setUserLoc] = useState<{ lat: number; lon: number } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [favs, allListings] = await Promise.all([getMyFavourites(), getListings()]);
      const merged = new Map<number, Listing>();

      for (const listing of allListings) {
        merged.set(Number(listing.id), listing);
      }

      for (const listing of favs) {
        merged.set(Number(listing.id), listing);
      }

      setCache(Array.from(merged.values()));
      // Ensure the ids set matches server truth too
      await refreshFavouritesStore();
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load once (after hydration)
  useEffect(() => {
    if (!hydrated) return;
    load();
  }, [hydrated, load]);

  // Refresh on focus (optional). This will not affect instant UI updates,
  // because UI is derived from ids, not from this network call.
  useFocusEffect(
    useCallback(() => {
      if (!hydrated) return;
      load();
    }, [hydrated, load])
  );

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
        const pos = await Location.getCurrentPositionAsync({});
        setUserLoc({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      } catch {
        // ignore
      }
    })();
  }, []);

  // Instant UI: filter cache by current ids
  const items = useMemo(() => {
    const favs = cache.filter((l) => ids.has(Number(l.id)));
    return favs.sort((a, b) => {
      const aSoldOut = a.status === "sold_out" || Number(a.quantityAvailable ?? 0) <= 0;
      const bSoldOut = b.status === "sold_out" || Number(b.quantityAvailable ?? 0) <= 0;
      if (aSoldOut === bSoldOut) return 0;
      return aSoldOut ? 1 : -1;
    });
  }, [cache, ids]);

  return (
    <>
      <Stack.Screen options={{ title: t("tabs.favourites") }} />
      <View style={styles.container}>
        <FlatList
          data={items}
          keyExtractor={(x) => String(x.id)}
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
          automaticallyAdjustsScrollIndicatorInsets={false}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={load}
              progressViewOffset={refreshOffset}
              tintColor="#0B6E69"
              colors={["#0B6E69"]}
            />
          }
          contentContainerStyle={styles.content}
          ListHeaderComponentStyle={{ paddingTop: insets.top + 12 }}
          ItemSeparatorComponent={() => <View style={styles.cardSpacer} />}
          ListHeaderComponent={
            <View style={styles.header}>
              <Text style={styles.screenTitle}>{t("favourites.title")}</Text>
              <Text style={styles.screenSubtitle}>{t("favourites.subtitle")}</Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const isSoldOut = item.status === "sold_out" || Number(item.quantityAvailable ?? 0) <= 0;
            const prev = index > 0 ? items[index - 1] : null;
            const prevSoldOut = prev
              ? prev.status === "sold_out" || Number(prev.quantityAvailable ?? 0) <= 0
              : false;

            return (
              <View>
                {isSoldOut && !prevSoldOut ? (
                  <View style={styles.sectionBreak}>
                    <View style={styles.sectionLine} />
                    <Text style={styles.sectionLabel}>{t("favourites.soldOutSection")}</Text>
                  </View>
                ) : null}
                <ListingCard
                  item={item}
                  onPress={() =>
                    router.push({
                      pathname: "/(app)/listing/[id]",
                      params: { id: String(item.id) },
                    })
                  }
                  isFavourite={ids.has(Number(item.id))}
                  onToggleFavourite={() => toggleFavourite(item.id)}
                  distanceKm={
                    userLoc && item.lat != null && item.lng != null
                      ? haversineKm(userLoc, { lat: item.lat, lon: item.lng })
                      : null
                  }
                  showAlertIcon
                />
              </View>
            );
          }}
          ListEmptyComponent={<Text style={styles.empty}>{t("favourites.empty")}</Text>}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFDF8" },
  content: { paddingHorizontal: 18, paddingBottom: 24 },
  cardSpacer: { height: 16 },
  header: { paddingBottom: 12 },
  sectionBreak: { marginTop: 8, marginBottom: 16 },
  sectionLine: { height: 1, backgroundColor: "#DCE6E3", marginBottom: 12 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#72817F",
  },
  screenTitle: { fontSize: 34, lineHeight: 40, fontWeight: "800", color: "#1F2C2B" },
  screenSubtitle: { marginTop: 6, fontSize: 15, lineHeight: 22, color: "#70807E", maxWidth: 280 },
  empty: { paddingTop: 12, color: "#70807E", fontWeight: "600" },
});
