import { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  Platform,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";
import * as Location from "expo-location";
import { Stack } from "expo-router";

import { getListings, type Listing } from "@/src/features/listings/listings.api";

type ViewMode = "list" | "map";

type ListingWithCoords = Listing & {
  latitude?: number | null;
  longitude?: number | null;
  rating?: number | null;
  pickupWindow?: string | null;
  originalPriceDzd?: number | null;

  // Optional future fields (won't break if missing)
  storeName?: string | null;
  address?: string | null;
  logoUrl?: string | null;
};

function haversineKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number }
) {
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

  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
}

function formatDistance(km: number) {
  if (!Number.isFinite(km)) return "";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

function safeCoords(item: any) {
  const lat = Number(item.latitude ?? item.lat ?? item.location?.lat);
  const lon = Number(item.longitude ?? item.lng ?? item.lon ?? item.location?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon };
}

export default function BrowseScreen() {
  const [mode, setMode] = useState<ViewMode>("list");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<ListingWithCoords[]>([]);
  const [selected, setSelected] = useState<ListingWithCoords | null>(null);
  const [userLoc, setUserLoc] = useState<{ lat: number; lon: number } | null>(null);

  // Track selected marker to:
  // 1) keep sheet open on double-tap of same marker
  // 2) force “shrink” reset when dismissing on iOS
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [markerRefreshKey, setMarkerRefreshKey] = useState(0);

  const mapRef = useRef<MapView | null>(null);

  function clearSelection() {
    setSelected(null);
    setSelectedId(null);
    setMarkerRefreshKey((k) => k + 1);
  }

  useEffect(() => {
    (async () => {
      const res = await getListings();
      setItems(res as ListingWithCoords[]);
    })();
  }, []);

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;

    return items.filter((x) => {
      const title = (x.title ?? "").toLowerCase();
      const city = (x.city ?? "").toLowerCase();
      const wilaya = (x.wilaya ?? "").toLowerCase();
      const storeName = ((x as any).storeName ?? "").toLowerCase();
      return (
        title.includes(q) ||
        city.includes(q) ||
        wilaya.includes(q) ||
        storeName.includes(q)
      );
    });
  }, [items, query]);

  const enriched = useMemo(() => {
    if (!userLoc) return filtered;

    return filtered
      .map((x) => {
        const c = safeCoords(x);
        const km = c
          ? haversineKm(userLoc, { lat: c.lat, lon: c.lon })
          : Number.POSITIVE_INFINITY;
        return { ...x, _distanceKm: km } as ListingWithCoords & { _distanceKm: number };
      })
      .sort((a, b) => (a._distanceKm ?? 0) - (b._distanceKm ?? 0));
  }, [filtered, userLoc]);

  const defaultRegion: Region = useMemo(() => {
    const lat = userLoc?.lat ?? 36.7538; // fallback Algiers
    const lon = userLoc?.lon ?? 3.0588;
    return {
      latitude: lat,
      longitude: lon,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    };
  }, [userLoc]);

  function onSelectListing(item: ListingWithCoords) {
    setSelected(item);
    setSelectedId(item.id);
    const c = safeCoords(item);
    if (c && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: c.lat,
          longitude: c.lon,
          latitudeDelta: 0.03,
          longitudeDelta: 0.03,
        },
        250
      );
    }
  }

  const markers = useMemo(() => {
    return enriched
      .map((x) => ({ item: x, coords: safeCoords(x) }))
      .filter((x) => x.coords !== null) as {
      item: ListingWithCoords;
      coords: { lat: number; lon: number };
    }[];
  }, [enriched]);

  const selectedMeta = useMemo(() => {
    if (!selected) return { distText: "", addr: "" };

    const c = safeCoords(selected);
    const km = userLoc && c ? haversineKm(userLoc, { lat: c.lat, lon: c.lon }) : null;

    const distText = km == null ? "" : formatDistance(km);
    const addr =
      (selected.address ??
        ((selected.city ?? "") + (selected.wilaya ? `, ${selected.wilaya}` : "")).trim()) ||
      "";

    return { distText, addr };
  }, [selected, userLoc]);

  return (
    <>
      <Stack.Screen options={{ title: "Browse" }} />

      <View style={styles.container}>
        {/* Top controls */}
        <View style={styles.topBar}>
          <View style={styles.searchWrap}>
            <Text style={styles.searchIcon}>⌕</Text>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search"
              placeholderTextColor="#8C8C8C"
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <Pressable style={styles.iconButton} onPress={() => {}}>
            <Text style={styles.iconButtonText}>⌖</Text>
          </Pressable>

          <Pressable style={styles.iconButton} onPress={() => {}}>
            <Text style={styles.iconButtonText}>≡</Text>
          </Pressable>
        </View>

        {/* Segmented control */}
        <View style={styles.segment}>
          <Pressable
            onPress={() => {
              clearSelection();
              setMode("list");
            }}
            style={[styles.segmentBtn, mode === "list" ? styles.segmentActive : null]}
          >
            <Text style={[styles.segmentText, mode === "list" ? styles.segmentTextActive : null]}>
              List
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setMode("map")}
            style={[styles.segmentBtn, mode === "map" ? styles.segmentActive : null]}
          >
            <Text style={[styles.segmentText, mode === "map" ? styles.segmentTextActive : null]}>
              Map
            </Text>
          </Pressable>
        </View>

        {/* Content */}
        {mode === "list" ? (
          <FlatList
            data={enriched}
            keyExtractor={(x: any) => String(x.id)}
            contentContainerStyle={{ paddingBottom: 24 }}
            renderItem={({ item }: any) => {
              const c = safeCoords(item);
              const km = userLoc && c ? haversineKm(userLoc, { lat: c.lat, lon: c.lon }) : null;

              return (
                <Pressable
                  onPress={() => {
                    setMode("map");
                    onSelectListing(item);
                  }}
                  style={styles.card}
                >
                  <View style={styles.cardImagePlaceholder}>
                    <Text style={styles.cardImageText}>IMG</Text>
                  </View>

                  <View style={styles.cardBody}>
                    <View style={styles.cardTopRow}>
                      <Text numberOfLines={1} style={styles.cardTitle}>
                        {item.title ?? "Listing"}
                      </Text>

                      <Pressable onPress={() => {}} style={styles.heartBtn}>
                        <Text style={styles.heartText}>♡</Text>
                      </Pressable>
                    </View>

                    <Text style={styles.cardSub}>
                      {(item.city ?? "City") + (item.wilaya ? `, ${item.wilaya}` : "")}
                    </Text>

                    <View style={styles.cardMetaRow}>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                          ★ {Number(item.rating ?? 4.5).toFixed(1)}
                        </Text>
                      </View>

                      {km !== null ? <Text style={styles.metaText}>{formatDistance(km)}</Text> : null}
                    </View>

                    <View style={styles.priceRow}>
                      {item.originalPriceDzd ? (
                        <Text style={styles.oldPrice}>{item.originalPriceDzd} DZD</Text>
                      ) : null}
                      <Text style={styles.price}>{item.priceDzd ?? 0} DZD</Text>
                    </View>
                  </View>
                </Pressable>
              );
            }}
            ListEmptyComponent={<Text style={{ padding: 16 }}>No listings found.</Text>}
          />
        ) : (
          <View style={styles.mapWrap}>
            <MapView
              ref={mapRef}
              style={StyleSheet.absoluteFill}
              provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
              initialRegion={defaultRegion}
              showsUserLocation
            >
              {markers.map(({ item, coords }) => (
                <Marker
                  key={`${item.id}-${markerRefreshKey}`}
                  coordinate={{ latitude: coords.lat, longitude: coords.lon }}
                  onPress={() => {
                    // Tap same pin again: keep the card open (do nothing)
                    if (selectedId === item.id) return;

                    setSelected(item);
                    setSelectedId(item.id);

                    if (mapRef.current) {
                      mapRef.current.animateToRegion(
                        {
                          latitude: coords.lat,
                          longitude: coords.lon,
                          latitudeDelta: 0.03,
                          longitudeDelta: 0.03,
                        },
                        250
                      );
                    }
                  }}
                />
              ))}
            </MapView>

            {/* Cross-platform: tap anywhere on the map to dismiss */}
            {selected ? (
              <Pressable style={styles.mapDismissOverlay} onPress={clearSelection} />
            ) : null}

            {/* Bottom sheet */}
            {selected ? (
              <View style={styles.bottomSheet}>
                <View style={styles.bottomHandle} />

                <View style={styles.bottomHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bottomStoreName} numberOfLines={1}>
                      {selected.storeName ?? selected.title ?? "Store"}
                    </Text>

                    <Text style={styles.bottomMeta} numberOfLines={1}>
                      {[selectedMeta.distText, selectedMeta.addr].filter(Boolean).join(" • ")}
                    </Text>
                  </View>

                  <Pressable onPress={clearSelection} style={styles.bottomCloseBtn}>
                    <Text style={styles.bottomCloseText}>✕</Text>
                  </Pressable>
                </View>

                <Pressable
                  onPress={() => {
                    // Later: details screen
                    // router.push(`/(app)/listing/${selected.id}`);
                  }}
                  style={styles.bottomListingRow}
                >
                  <View style={styles.bottomLogoPlaceholder}>
                    <Text style={styles.bottomLogoText}>LOGO</Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.bottomListingTitle} numberOfLines={1}>
                      {selected.title ?? "Listing"}
                    </Text>

                    <View style={styles.bottomRowMeta}>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                          ★ {Number(selected.rating ?? 4.5).toFixed(1)}
                        </Text>
                      </View>

                      <Text style={styles.bottomPickup} numberOfLines={1}>
                        {selected.pickupWindow ?? "Pickup time TBD"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.bottomRight}>
                    <Text style={styles.bottomPrice}>{selected.priceDzd ?? 0} DZD</Text>

                    <Pressable onPress={() => {}} style={styles.bottomButton}>
                      <Text style={styles.bottomButtonText}>View</Text>
                    </Pressable>
                  </View>
                </Pressable>
              </View>
            ) : null}
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  topBar: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    alignItems: "center",
  },

  searchWrap: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E6E6E6",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    backgroundColor: "#fff",
  },
  searchIcon: { fontSize: 18, color: "#6D6D6D", marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16, color: "#111" },

  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E6E6E6",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  iconButtonText: { fontSize: 18, color: "#111" },

  segment: {
    flexDirection: "row",
    marginHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "#F2F2F2",
    overflow: "hidden",
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentActive: { backgroundColor: "#0B6E69" },
  segmentText: { fontSize: 16, fontWeight: "700", color: "#0B6E69" },
  segmentTextActive: { color: "#fff" },

  card: {
    flexDirection: "row",
    marginHorizontal: 14,
    marginTop: 12,
    borderRadius: 18,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ECECEC",
    overflow: "hidden",
  },
  cardImagePlaceholder: {
    width: 130,
    height: 110,
    backgroundColor: "#EFEFEF",
    alignItems: "center",
    justifyContent: "center",
  },
  cardImageText: { fontWeight: "800", color: "#999" },

  cardBody: { flex: 1, padding: 12 },
  cardTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontSize: 18, fontWeight: "800", color: "#111", flex: 1, paddingRight: 10 },
  heartBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  heartText: { fontSize: 18, color: "#111" },

  cardSub: { marginTop: 4, color: "#666" },
  cardMetaRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#E8F4F3",
  },
  badgeText: { color: "#0B6E69", fontWeight: "800" },
  metaText: { color: "#444", fontWeight: "700" },

  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 10, marginTop: 10 },
  oldPrice: { color: "#999", textDecorationLine: "line-through", fontWeight: "700" },
  price: { color: "#0B6E69", fontWeight: "900", fontSize: 18 },

  mapWrap: { flex: 1, marginTop: 10 },

  mapDismissOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },

  bottomSheet: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    zIndex: 2,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#ECECEC",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  bottomHandle: {
    alignSelf: "center",
    width: 44,
    height: 4,
    borderRadius: 99,
    backgroundColor: "#E6E6E6",
    marginBottom: 10,
  },
  bottomHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 10,
  },
  bottomStoreName: { fontSize: 18, fontWeight: "900", color: "#111" },
  bottomMeta: { marginTop: 6, color: "#666" },
  bottomCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ECECEC",
    backgroundColor: "#fff",
  },
  bottomCloseText: { fontSize: 16, color: "#444", fontWeight: "900" },

  bottomListingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#ECECEC",
    borderRadius: 16,
    padding: 12,
  },
  bottomLogoPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#EFEFEF",
    alignItems: "center",
    justifyContent: "center",
  },
  bottomLogoText: { fontWeight: "900", color: "#999" },

  bottomListingTitle: { fontSize: 16, fontWeight: "900", color: "#111" },
  bottomRowMeta: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 },
  bottomPickup: { color: "#666", fontWeight: "700", flex: 1 },

  bottomRight: { alignItems: "flex-end", justifyContent: "center" },
  bottomPrice: { fontSize: 16, fontWeight: "900", color: "#0B6E69", marginBottom: 8 },
  bottomButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#0B6E69",
  },
  bottomButtonText: { color: "#fff", fontWeight: "900" },
});
