import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  Platform,
  Modal,
  Switch,
  Keyboard,
  RefreshControl,
  TouchableOpacity,
  Image,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, Region, Circle } from "react-native-maps";
import * as Location from "expo-location";
import Slider from "@react-native-community/slider";
import { Stack, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  useFavouritesStore,
  useHydrateFavourites,
  toggleFavourite,
} from "@/src/features/favourites/favourites.store";
import { getListings, type Listing } from "@/src/features/listings/listings.api";
import { useLang } from "@/src/features/i18n/lang.context";
import { ListingCard } from "@/src/components/listing-card";
type ViewMode = "list" | "map";

type ListingWithCoords = Listing & {
  latitude?: number | null;
  longitude?: number | null;

  rating?: number | null;
  pickupWindow?: string | null;
  originalPriceDzd?: number | null;

  storeName?: string | null;
  address?: string | null;
  sellerLogoUrl?: string | null;
};

type PickupDay = "any" | "today" | "tomorrow";

async function geocodeAddress(address: string) {
  const q = address.trim();
  if (!q) return null;
  const results = await Location.geocodeAsync(q);
  if (!results?.length) return null;
  return { lat: results[0].latitude, lon: results[0].longitude };
}

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

function getInitials(value?: string | null) {
  return (value || "")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function startOfTodayLocal() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameLocalDate(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

type Cluster =
  | { type: "cluster"; id: string; lat: number; lon: number; count: number }
  | { type: "single"; id: string; lat: number; lon: number; item: ListingWithCoords };

function makeClusters(
  items: { item: ListingWithCoords; coords: { lat: number; lon: number } }[],
  region: Region
): Cluster[] {
  // bigger delta = zoomed out -> more clustering
  const cellSize = Math.max(region.longitudeDelta, region.latitudeDelta) / 10;
  if (!Number.isFinite(cellSize) || cellSize <= 0) {
    return items.map((x) => ({
      type: "single",
      id: `s:${x.item.id}`,
      lat: x.coords.lat,
      lon: x.coords.lon,
      item: x.item,
    }));
  }

  const buckets = new Map<
    string,
    { latSum: number; lonSum: number; items: ListingWithCoords[]; coords: { lat: number; lon: number }[] }
  >();

  for (const it of items) {
    const { lat, lon } = it.coords;
    const gx = Math.floor(lon / cellSize);
    const gy = Math.floor(lat / cellSize);
    const key = `${gx}:${gy}`;

    const b = buckets.get(key);
    if (!b) {
      buckets.set(key, { latSum: lat, lonSum: lon, items: [it.item], coords: [it.coords] });
    } else {
      b.latSum += lat;
      b.lonSum += lon;
      b.items.push(it.item);
      b.coords.push(it.coords);
    }
  }

  const out: Cluster[] = [];
  for (const [key, b] of buckets) {
    if (b.items.length === 1) {
      const one = b.items[0];
      const c = b.coords[0];
      out.push({ type: "single", id: `s:${one.id}`, lat: c.lat, lon: c.lon, item: one });
    } else {
      out.push({
        type: "cluster",
        id: `c:${key}`,
        lat: b.latSum / b.items.length,
        lon: b.lonSum / b.items.length,
        count: b.items.length,
      });
    }
  }

  return out;
}

export default function BrowseScreen() {
  const { lang } = useLang();
  const insets = useSafeAreaInsets();
  const refreshOffset = insets.top + 24;

  const STR = useMemo(() => {
    const dict = {
      en: {
        browse: "Browse",
        search: "Search",
        list: "List",
        map: "Map",
        noListings: "No listings found.",
        radiusTitle: "Choose a location to see what's available",
        radiusSubtitle: "Select a distance",
        radiusApply: "Show results",
        radiusUseCurrent: "Use my current location",
        radiusKm: "km",
        radiusAddressPlaceholder: "Search an address",
        radiusAddressSet: "Set",
        radiusAddressNotFound: "Address not found",
        filtersTitle: "Filters",
        filtersClear: "Clear all",
        filtersApply: "Apply",
        showSoldOut: "Show sold out",
        pickupDay: "Pickup day",
        today: "Today",
        tomorrow: "Tomorrow",
        any: "Any",
        foodTypes: "Food types",
        view: "View",
        pickupTbd: "Pickup time TBD",
        listingFallback: "Listing",
        cityFallback: "City",
        storeFallback: "Store",
      },
      fr: {
        browse: "Explorer",
        search: "Rechercher",
        list: "Liste",
        map: "Carte",
        noListings: "Aucune annonce trouvée.",
        radiusTitle: "Choisis un endroit pour voir ce qui est disponible",
        radiusSubtitle: "Choisis une distance",
        radiusApply: "Afficher les résultats",
        radiusUseCurrent: "Utiliser ma position",
        radiusKm: "km",
        radiusAddressPlaceholder: "Rechercher une adresse",
        radiusAddressSet: "OK",
        radiusAddressNotFound: "Adresse introuvable",
        filtersTitle: "Filtres",
        filtersClear: "Tout effacer",
        filtersApply: "Appliquer",
        showSoldOut: "Afficher épuisés",
        pickupDay: "Jour de collecte",
        today: "Aujourd'hui",
        tomorrow: "Demain",
        any: "Peu importe",
        foodTypes: "Types",
        view: "Voir",
        pickupTbd: "Heure de retrait à confirmer",
        listingFallback: "Annonce",
        cityFallback: "Ville",
        storeFallback: "Magasin",
      },
      ar: {
        browse: "تصفّح",
        search: "بحث",
        list: "قائمة",
        map: "خريطة",
        noListings: "لا توجد عروض.",
        radiusTitle: "اختر موقعًا لرؤية المتاح",
        radiusSubtitle: "اختر المسافة",
        radiusApply: "عرض النتائج",
        radiusUseCurrent: "استخدام موقعي",
        radiusKm: "كم",
        radiusAddressPlaceholder: "ابحث عن عنوان",
        radiusAddressSet: "تأكيد",
        radiusAddressNotFound: "لم يتم العثور على العنوان",
        filtersTitle: "فلاتر",
        filtersClear: "مسح الكل",
        filtersApply: "تطبيق",
        showSoldOut: "إظهار المنفد",
        pickupDay: "يوم الاستلام",
        today: "اليوم",
        tomorrow: "غدًا",
        any: "أي",
        foodTypes: "الأنواع",
        view: "عرض",
        pickupTbd: "وقت الاستلام غير محدد",
        listingFallback: "عرض",
        cityFallback: "مدينة",
        storeFallback: "متجر",
      },
    } as const;

    return dict[lang] ?? dict.en;
  }, [lang]);

  const [mode, setMode] = useState<ViewMode>("list");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<ListingWithCoords[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<ListingWithCoords | null>(null);
  const [userLoc, setUserLoc] = useState<{ lat: number; lon: number } | null>(null);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [markerRefreshKey, setMarkerRefreshKey] = useState(0);

  const mapRef = useRef<MapView | null>(null);

  // Live map region (for clustering + "circle stays centered")
  const [mapRegion, setMapRegion] = useState<Region>({
    latitude: 36.7538,
    longitude: 3.0588,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  });

  // Radius modal state
  const [radiusOpen, setRadiusOpen] = useState(false);
  const [appliedRadiusKm, setAppliedRadiusKm] = useState<number | null>(null);
  const [appliedRadiusCenter, setAppliedRadiusCenter] = useState<{ lat: number; lon: number } | null>(null);
  const [draftRadiusKm, setDraftRadiusKm] = useState<number>(3);
  const [draftRadiusCenter, setDraftRadiusCenter] = useState<{ lat: number; lon: number } | null>(null);
  const [radiusAddress, setRadiusAddress] = useState("");
  const [radiusAddressErr, setRadiusAddressErr] = useState<string | null>(null);

  // Filters modal state
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showSoldOut, setShowSoldOut] = useState(false);
  const [pickupDay, setPickupDay] = useState<PickupDay>("any");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  useHydrateFavourites();
  const { ids: favouriteIds } = useFavouritesStore();

  function clearSelection() {
    setSelected(null);
    setSelectedId(null);
    setMarkerRefreshKey((k) => k + 1);
  }

  function goToDetails(id: number) {
    router.push({
      pathname: "/(app)/listing/[id]",
      params: { id: String(id) },
    });
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getListings();
      setItems(res as ListingWithCoords[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;

        const pos = await Location.getCurrentPositionAsync({});
        const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setUserLoc(loc);

        // default draft radius center
        setDraftRadiusCenter((prev) => prev ?? loc);

        // set initial map region near user
        setMapRegion((prev) => ({
          ...prev,
          latitude: loc.lat,
          longitude: loc.lon,
        }));
      } catch {
        // ignore
      }
    })();
  }, []);

  const filteredByText = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;

    return items.filter((x) => {
      const title = (x.title ?? "").toLowerCase();
      const city = (x.city ?? "").toLowerCase();
      const wilaya = (x.wilaya ?? "").toLowerCase();
      const storeName = ((x as any).storeName ?? "").toLowerCase();
      return title.includes(q) || city.includes(q) || wilaya.includes(q) || storeName.includes(q);
    });
  }, [items, query]);

  const filteredByFilters = useMemo(() => {
    const today = startOfTodayLocal();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return filteredByText.filter((x) => {
      const status = (x as any).status;

      if (!showSoldOut && status === "sold_out") return false;

      if (categoryFilter && String((x as any).category ?? "") !== categoryFilter) return false;

      if (pickupDay !== "any") {
        const ps = (x as any).pickupStartAt ? new Date((x as any).pickupStartAt) : null;
        const pe = (x as any).pickupEndAt ? new Date((x as any).pickupEndAt) : null;
        const ref = pickupDay === "today" ? today : tomorrow;

        if (!ps && !pe) return false;

        const ok = (ps && isSameLocalDate(ps, ref)) || (pe && isSameLocalDate(pe, ref));
        if (!ok) return false;
      }

      return true;
    });
  }, [filteredByText, showSoldOut, pickupDay, categoryFilter]);

  const filteredByRadius = useMemo(() => {
    if (!appliedRadiusCenter || !appliedRadiusKm) return filteredByFilters;
    const center = appliedRadiusCenter;

    return filteredByFilters.filter((x) => {
      const c = safeCoords(x);
      if (!c) return true; // keep items without coords in list mode
      const km = haversineKm(center, { lat: c.lat, lon: c.lon });
      return km <= appliedRadiusKm;
    });
  }, [filteredByFilters, appliedRadiusCenter, appliedRadiusKm]);

  const enriched = useMemo(() => {
    if (!userLoc) return filteredByRadius;

    return filteredByRadius
      .map((x) => {
        const c = safeCoords(x);
        const km = c ? haversineKm(userLoc, { lat: c.lat, lon: c.lon }) : Number.POSITIVE_INFINITY;
        return { ...x, _distanceKm: km } as ListingWithCoords & { _distanceKm: number };
      })
      .sort((a, b) => (a._distanceKm ?? 0) - (b._distanceKm ?? 0));
  }, [filteredByRadius, userLoc]);

  const defaultRegion: Region = useMemo(() => {
    const lat = (appliedRadiusCenter?.lat ?? userLoc?.lat) ?? 36.7538;
    const lon = (appliedRadiusCenter?.lon ?? userLoc?.lon) ?? 3.0588;
    return {
      latitude: lat,
      longitude: lon,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    };
  }, [userLoc, appliedRadiusCenter]);

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

  const pinSource = useMemo(() => {
    // only items with coords become pins
    return filteredByRadius
      .map((x) => ({ item: x, coords: safeCoords(x) }))
      .filter((x) => x.coords !== null) as {
      item: ListingWithCoords;
      coords: { lat: number; lon: number };
    }[];
  }, [filteredByRadius]);

  const clusters = useMemo(() => makeClusters(pinSource, mapRegion), [pinSource, mapRegion]);

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

  const allCategories = useMemo(() => {
    const set = new Set<string>();
    for (const x of items) {
      const c = (x as any).category;
      if (c) set.add(String(c));
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  // When radius modal is open, circle center follows map center
  function onRadiusModalRegionChange(r: Region) {
    setDraftRadiusCenter({ lat: r.latitude, lon: r.longitude });
  }

  async function applyAddressToRadiusCenter() {
    Keyboard.dismiss();
    setRadiusAddressErr(null);
    const result = await geocodeAddress(radiusAddress);
    if (!result) {
      setRadiusAddressErr(STR.radiusAddressNotFound);
      return;
    }

    setDraftRadiusCenter(result);
    // snap modal map to the address
    radiusModalMapRef.current?.animateToRegion(
      {
        latitude: result.lat,
        longitude: result.lon,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      },
      250
    );
  }

  const radiusModalMapRef = useRef<MapView | null>(null);

  function recenterToUser() {
    if (!userLoc || !mapRef.current) return;
    mapRef.current.animateToRegion(
      {
        latitude: userLoc.lat,
        longitude: userLoc.lon,
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      },
      250
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: STR.browse }} />

      <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
        {/* Top controls */}
        <View style={styles.topBar}>
          <View style={styles.searchWrap}>
            <Text style={styles.searchIcon}>⌕</Text>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={STR.search}
              placeholderTextColor="#6F7D7B"
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Radius */}
          <Pressable
            style={styles.iconButton}
            onPress={() => {
              setRadiusAddressErr(null);
              setDraftRadiusKm(appliedRadiusKm ?? draftRadiusKm);
              setDraftRadiusCenter(
                appliedRadiusCenter ??
                  draftRadiusCenter ??
                  userLoc ?? {
                    lat: mapRegion.latitude,
                    lon: mapRegion.longitude,
                  }
              );
              setRadiusOpen(true);
            }}
          >
            <Ionicons name="location-outline" size={22} color="#1F2C2B" />
          </Pressable>

          {/* Filters */}
          <Pressable style={styles.iconButton} onPress={() => setFiltersOpen(true)}>
            <Ionicons name="options-outline" size={22} color="#1F2C2B" />
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
              {STR.list}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              clearSelection();
              setMode("map");
            }}
            style={[styles.segmentBtn, mode === "map" ? styles.segmentActive : null]}
          >
            <Text style={[styles.segmentText, mode === "map" ? styles.segmentTextActive : null]}>
              {STR.map}
            </Text>
          </Pressable>
        </View>

        {/* Content */}
        {mode === "list" ? (
          <FlatList
            data={enriched}
            keyExtractor={(x: any) => String(x.id)}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.listSpacer} />}
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={load}
                progressViewOffset={refreshOffset}
                tintColor="#0B6E69"
                colors={["#0B6E69"]}
              />
            }
            renderItem={({ item }: any) => {
              const c = safeCoords(item);
              const km = userLoc && c ? haversineKm(userLoc, { lat: c.lat, lon: c.lon }) : null;
              const isFav = favouriteIds.has(item.id);

              return (
                <ListingCard
                  item={item}
                  onPress={() => goToDetails(item.id)}
                  isFavourite={isFav}
                  onToggleFavourite={() => toggleFavourite(item.id)}
                  distanceKm={km}
                />
              );
            }}
            ListEmptyComponent={<Text style={styles.listEmpty}>{STR.noListings}</Text>}
          />
        ) : (
          <View style={styles.mapWrap}>
            <MapView
              ref={mapRef}
              style={StyleSheet.absoluteFill}
              provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
              initialRegion={defaultRegion}
              onRegionChangeComplete={(r) => {
                setMapRegion(r);
              }}
              showsUserLocation
            >
              {/* Custom markers + clusters */}
              {clusters.map((c) => {
                if (c.type === "cluster") {
                  return (
                    <Marker
                      key={`${c.id}-${markerRefreshKey}`}
                      coordinate={{ latitude: c.lat, longitude: c.lon }}
                      onPress={() => {
                        mapRef.current?.animateToRegion(
                          {
                            latitude: c.lat,
                            longitude: c.lon,
                            latitudeDelta: mapRegion.latitudeDelta * 0.6,
                            longitudeDelta: mapRegion.longitudeDelta * 0.6,
                          },
                          250
                        );
                      }}
                    >
                      <View style={styles.clusterMarker}>
                        <Text style={styles.clusterText}>{c.count}</Text>
                      </View>
                    </Marker>
                  );
                }

                return (
                  <Marker
                    key={`${c.id}-${markerRefreshKey}`}
                    coordinate={{ latitude: c.lat, longitude: c.lon }}
                    onPress={() => {
                      if (selectedId === c.item.id) return;
                      onSelectListing(c.item);
                    }}
                  >
                    <View style={styles.logoMarker}>
                      {c.item.sellerLogoUrl ? (
                        <Image source={{ uri: c.item.sellerLogoUrl }} style={styles.logoMarkerImage} />
                      ) : (
                        <Text style={styles.logoMarkerText}>{getInitials(c.item.storeName ?? c.item.title) || "SB"}</Text>
                      )}
                    </View>
                  </Marker>
                );
              })}
            </MapView>

            {/* tap anywhere on the map to dismiss */}
            {selected ? <Pressable style={styles.mapDismissOverlay} onPress={clearSelection} /> : null}

            {/* Bottom sheet */}
            {selected ? (
              <View style={styles.bottomSheet}>
                <View style={styles.bottomHandle} />

                <View style={styles.bottomHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bottomStoreName} numberOfLines={1}>
                      {selected.storeName ?? selected.title ?? STR.storeFallback}
                    </Text>

                    <Text style={styles.bottomMeta} numberOfLines={1}>
                      {[selectedMeta.distText, selectedMeta.addr].filter(Boolean).join(" • ")}
                    </Text>
                  </View>

                  <Pressable onPress={() => toggleFavourite(selected.id)} hitSlop={10} style={styles.sheetHeartBtn}>
                    <Text style={styles.heartText}>
                      {favouriteIds.has(selected.id) ? "♥" : "♡"}
                    </Text>
                  </Pressable>

                  <Pressable onPress={clearSelection} style={styles.bottomCloseBtn}>
                    <Text style={styles.bottomCloseText}>✕</Text>
                  </Pressable>
                </View>

                <Pressable onPress={() => goToDetails(selected.id)} style={styles.bottomListingRow}>
                  <View style={styles.bottomLogoPlaceholder}>
                    {selected.sellerLogoUrl ? (
                      <Image source={{ uri: selected.sellerLogoUrl }} style={styles.bottomLogoImage} />
                    ) : (
                      <Text style={styles.bottomLogoText}>{getInitials(selected.storeName ?? selected.title) || "SB"}</Text>
                    )}
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.bottomListingTitle} numberOfLines={1}>
                      {selected.title ?? STR.listingFallback}
                    </Text>

                    <View style={styles.bottomRowMeta}>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                          ★ {Number((selected as any).ratingAvg ?? selected.rating ?? 0).toFixed(1)}
                        </Text>
                      </View>

                      <Text style={styles.bottomPickup} numberOfLines={1}>
                        {selected.pickupWindow ?? STR.pickupTbd}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.bottomRight}>
                    <Text style={styles.bottomPrice}>{selected.priceDzd ?? 0} DZD</Text>

                    <Pressable onPress={() => goToDetails(selected.id)} style={styles.bottomButton}>
                      <Text style={styles.bottomButtonText}>{STR.view}</Text>
                    </Pressable>
                  </View>
                </Pressable>
              </View>
            ) : null}

            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.floatingLocateBtn, { bottom: insets.bottom + 9 }]}
              onPress={recenterToUser}
            >
              <Ionicons name="navigate-outline" size={26} color="#116B62" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Radius Modal */}
      <Modal
        visible={radiusOpen}
        animationType="slide"
        onRequestClose={() => setRadiusOpen(false)}
      >
        <View style={styles.modalTopBar}>
          <Text style={styles.modalTitle}>{STR.radiusTitle}</Text>
          <Pressable onPress={() => setRadiusOpen(false)} style={styles.modalClose}>
            <Text style={styles.modalCloseText}>✕</Text>
          </Pressable>
        </View>

        <View style={styles.modalMapWrap}>
          <MapView
            ref={radiusModalMapRef}
            style={StyleSheet.absoluteFill}
            provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
            initialRegion={defaultRegion}
            onRegionChangeComplete={(r) => onRadiusModalRegionChange(r)}
          >
            {draftRadiusCenter ? (
              <Circle
                center={{ latitude: draftRadiusCenter.lat, longitude: draftRadiusCenter.lon }}
                radius={draftRadiusKm * 1000}
                strokeWidth={2}
                strokeColor="rgba(120,120,120,0.75)"
                fillColor="rgba(120,120,120,0.15)"
              />
            ) : null}
          </MapView>

          {/* fixed crosshair in modal too */}
          <View pointerEvents="none" style={styles.centerCrosshairWrap}>
            <View style={styles.centerCrosshair} />
          </View>
        </View>

        <View style={styles.modalBottom}>
          <Text style={styles.modalSectionTitle}>{STR.radiusSubtitle}</Text>

          <View style={styles.sliderRow}>
            <Text style={styles.sliderValue}>
              {Math.round(draftRadiusKm)} {STR.radiusKm}
            </Text>

            <Slider
              value={draftRadiusKm}
              onValueChange={setDraftRadiusKm}
              minimumValue={1}
              maximumValue={20}
              step={1}
              minimumTrackTintColor="#0B6E69"
              maximumTrackTintColor="#D9D9D9"
              thumbTintColor="#0B6E69"
            />
          </View>

          <View style={styles.addressRow}>
            <TextInput
              value={radiusAddress}
              onChangeText={(v) => {
                setRadiusAddress(v);
                setRadiusAddressErr(null);
              }}
              placeholder={STR.radiusAddressPlaceholder}
              placeholderTextColor="#6F7D7B"
              style={styles.addressInput}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={applyAddressToRadiusCenter}
            />
            <Pressable onPress={applyAddressToRadiusCenter} style={styles.addressBtn}>
              <Text style={styles.addressBtnText}>{STR.radiusAddressSet}</Text>
            </Pressable>
          </View>

          {radiusAddressErr ? <Text style={styles.addressErr}>{radiusAddressErr}</Text> : null}

          <Pressable
            onPress={() => {
              if (userLoc) {
                setDraftRadiusCenter(userLoc);
                radiusModalMapRef.current?.animateToRegion(
                  {
                    latitude: userLoc.lat,
                    longitude: userLoc.lon,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                  },
                  250
                );
              }
            }}
            style={styles.useCurrentBtn}
          >
            <Text style={styles.useCurrentText}>{STR.radiusUseCurrent}</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              setAppliedRadiusCenter(draftRadiusCenter);
              setAppliedRadiusKm(draftRadiusKm);
              setRadiusOpen(false);
              setMode("map");
              clearSelection();
              if (draftRadiusCenter && mapRef.current) {
                mapRef.current.animateToRegion(
                  {
                    latitude: draftRadiusCenter.lat,
                    longitude: draftRadiusCenter.lon,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                  },
                  250
                );
              }
            }}
            style={styles.applyBtn}
          >
            <Text style={styles.applyBtnText}>{STR.radiusApply}</Text>
          </Pressable>
        </View>
      </Modal>

      {/* Filters Modal */}
      <Modal visible={filtersOpen} animationType="slide" onRequestClose={() => setFiltersOpen(false)}>
        <View style={styles.modalTopBarCenter}>
          <Pressable onPress={() => setFiltersOpen(false)} style={styles.modalCloseRight}>
            <Text style={styles.modalCloseText}>✕</Text>
          </Pressable>
          <Text style={styles.modalTitleCenter}>{STR.filtersTitle}</Text>
        </View>

        <View style={styles.filtersBody}>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>{STR.showSoldOut}</Text>
            <Switch value={showSoldOut} onValueChange={setShowSoldOut} />
          </View>

          <Text style={styles.filterSectionTitle}>{STR.pickupDay}</Text>
          <View style={styles.pickupDayRow}>
            {(["any", "today", "tomorrow"] as PickupDay[]).map((k) => {
              const label = k === "any" ? STR.any : k === "today" ? STR.today : STR.tomorrow;
              const active = pickupDay === k;
              return (
                <Pressable
                  key={k}
                  onPress={() => setPickupDay(k)}
                  style={[styles.dayBtn, active ? styles.dayBtnActive : styles.dayBtnInactive]}
                >
                  <Text style={[styles.dayBtnText, active ? styles.dayBtnTextActive : styles.dayBtnTextInactive]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.filterSectionTitle}>{STR.foodTypes}</Text>
          <View style={styles.categoryWrap}>
            <Pressable
              onPress={() => setCategoryFilter(null)}
              style={[styles.catChip, categoryFilter === null ? styles.catChipActive : styles.catChipInactive]}
            >
              <Text style={[styles.catChipText, categoryFilter === null ? styles.catChipTextActive : styles.catChipTextInactive]}>
                {STR.any}
              </Text>
            </Pressable>

            {allCategories.map((c) => {
              const active = categoryFilter === c;
              return (
                <Pressable
                  key={c}
                  onPress={() => setCategoryFilter(c)}
                  style={[styles.catChip, active ? styles.catChipActive : styles.catChipInactive]}
                >
                  <Text style={[styles.catChipText, active ? styles.catChipTextActive : styles.catChipTextInactive]}>
                    {c}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.filtersFooter}>
          <Pressable
            onPress={() => {
              setShowSoldOut(false);
              setPickupDay("any");
              setCategoryFilter(null);
            }}
            style={styles.clearBtn}
          >
            <Text style={styles.clearBtnText}>{STR.filtersClear}</Text>
          </Pressable>

          <Pressable onPress={() => setFiltersOpen(false)} style={styles.applyBtnFooter}>
            <Text style={styles.applyBtnText}>{STR.filtersApply}</Text>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFDF8" },
  listContent: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 24 },
  listSpacer: { height: 16 },
  listEmpty: { paddingHorizontal: 18, paddingTop: 16, color: "#70807E", fontWeight: "600" },

  topBar: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 10,
    alignItems: "center",
  },

  searchWrap: {
    flex: 1,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E1EAE6",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
  },
  searchIcon: { fontSize: 18, color: "#7A8A87", marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16, color: "#1F2C2B" },

  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E1EAE6",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  iconButtonText: { fontSize: 18, color: "#1F2C2B" },

  segment: {
    flexDirection: "row",
    marginHorizontal: 18,
    borderRadius: 18,
    backgroundColor: "#EEF3F0",
    overflow: "hidden",
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentActive: { backgroundColor: "#116B62" },
  segmentText: { fontSize: 16, fontWeight: "800", color: "#116B62" },
  segmentTextActive: { color: "#fff" },

  sheetHeartBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E1EAE6",
    backgroundColor: "#fff",
  },
  heartText: { color: "#0C766F", fontSize: 18, fontWeight: "900" },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#EDF7F3",
  },
  badgeText: { color: "#116B62", fontWeight: "800" },
  mapWrap: { flex: 1, marginTop: 12 },

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
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E1EAE6",
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
    backgroundColor: "#D8E5E0",
    marginBottom: 10,
  },
  bottomHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 10,
  },
  bottomStoreName: { fontSize: 18, fontWeight: "800", color: "#1F2C2B" },
  bottomMeta: { marginTop: 6, color: "#72817F", fontWeight: "700" },
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
  bottomCloseText: { fontSize: 16, color: "#444", fontWeight: "700" },

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
    overflow: "hidden",
  },
  bottomLogoImage: { width: "100%", height: "100%" },
  bottomLogoText: { fontWeight: "700", color: "#999" },

  bottomListingTitle: { fontSize: 16, fontWeight: "700", color: "#111" },
  bottomRowMeta: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 },
  bottomPickup: { color: "#666", fontWeight: "700", flex: 1 },

  bottomRight: { alignItems: "flex-end", justifyContent: "center" },
  bottomPrice: { fontSize: 16, fontWeight: "800", color: "#116B62", marginBottom: 8 },
  bottomButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#116B62",
  },
  bottomButtonText: { color: "#fff", fontWeight: "700" },

  // markers
  clusterMarker: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#116B62",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  clusterText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  logoMarker: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#0B6E69",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoMarkerImage: { width: "100%", height: "100%" },
  logoMarkerText: { fontWeight: "700", color: "#116B62", fontSize: 10 },

  // center crosshair
  centerCrosshairWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
  },
  centerCrosshair: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#0B6E69",
    backgroundColor: "#fff",
  },
  floatingLocateBtn: {
    position: "absolute",
    right: 18,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
    shadowColor: "#23413C",
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
    borderWidth: 1,
    borderColor: "#E1EAE6",
  },

  // Modals
  modalTopBar: {
    paddingTop: 54,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#111", flex: 1, paddingRight: 10 },
  modalClose: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  modalCloseText: { fontSize: 22, fontWeight: "700", color: "#111" },

  modalMapWrap: { flex: 1, backgroundColor: "#fff" },

  modalBottom: {
    backgroundColor: "#fff",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  modalSectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10, color: "#111" },

  sliderRow: { marginBottom: 12 },
  sliderValue: { marginBottom: 8, fontWeight: "700", color: "#111" },

  addressRow: { flexDirection: "row", gap: 10, alignItems: "center", marginBottom: 8 },
  addressInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: "#E6E6E6",
    borderRadius: 12,
    paddingHorizontal: 12,
    color: "#111",
    backgroundColor: "#fff",
    fontWeight: "700",
  },
  addressBtn: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0B6E69",
  },
  addressBtnText: { color: "#fff", fontWeight: "700" },
  addressErr: { color: "#C62828", fontWeight: "700", marginBottom: 8 },

  useCurrentBtn: {
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E6E6E6",
    alignItems: "center",
    marginBottom: 12,
  },
  useCurrentText: { fontWeight: "700", color: "#0B6E69" },

  applyBtn: { backgroundColor: "#0B6E69", paddingVertical: 14, borderRadius: 999, alignItems: "center" },
  applyBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  // Filters modal
  modalTopBarCenter: {
    paddingTop: 54,
    paddingBottom: 14,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitleCenter: { fontSize: 20, fontWeight: "700", color: "#111" },
  modalCloseRight: { position: "absolute", right: 14, top: 52, width: 40, height: 40, alignItems: "center", justifyContent: "center" },

  filtersBody: { flex: 1, padding: 16, backgroundColor: "#fff" },
  filterRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 },
  filterLabel: { fontSize: 16, fontWeight: "700", color: "#111" },

  filterSectionTitle: { marginTop: 18, marginBottom: 10, fontSize: 16, fontWeight: "700", color: "#111" },

  pickupDayRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  dayBtn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1 },
  dayBtnActive: { backgroundColor: "#0B6E69", borderColor: "#0B6E69" },
  dayBtnInactive: { backgroundColor: "#fff", borderColor: "#E6E6E6" },
  dayBtnText: { fontWeight: "700" },
  dayBtnTextActive: { color: "#fff" },
  dayBtnTextInactive: { color: "#0B6E69" },

  categoryWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  catChip: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1 },
  catChipActive: { backgroundColor: "#0B6E69", borderColor: "#0B6E69" },
  catChipInactive: { backgroundColor: "#fff", borderColor: "#E6E6E6" },
  catChipText: { fontWeight: "700" },
  catChipTextActive: { color: "#fff" },
  catChipTextInactive: { color: "#0B6E69" },

  filtersFooter: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  clearBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  clearBtnText: { fontWeight: "700", color: "#111" },

  applyBtnFooter: { flex: 1, backgroundColor: "#0B6E69", paddingVertical: 14, borderRadius: 999, alignItems: "center" },
});
