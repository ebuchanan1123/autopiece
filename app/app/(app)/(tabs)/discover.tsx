import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getListings, type Listing } from "@/src/features/listings/listings.api";
import { Stack, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useFavouritesStore,
  useHydrateFavourites,
  toggleFavourite,
} from "@/src/features/favourites/favourites.store";
import { useLang } from "@/src/features/i18n/lang.context";
import { ListingCard } from "@/src/components/listing-card";
import {
  CATEGORIES,
  filterDiscoverListings,
  getDiscoverSectionItems,
  type CategoryKey,
  type DiscoverSectionKey,
} from "@/src/features/listings/discover-sections";

function Section({
  sectionKey,
  title,
  actionText,
  category,
  items,
  favouriteIds,
  onToggle,
}: {
  sectionKey: DiscoverSectionKey;
  title: string;
  actionText?: string;
  category: CategoryKey;
  items: Listing[];
  favouriteIds: Set<number>;
  onToggle: (id: number) => void;
}) {
  if (items.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {actionText ? (
          <Pressable
            style={styles.sectionActionButton}
            onPress={() =>
              router.push({
                pathname: "/(app)/discover-section",
                params: { section: sectionKey, category },
              })
            }
          >
            <Text style={styles.sectionAction}>{actionText}</Text>
          </Pressable>
        ) : null}
      </View>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={items}
        keyExtractor={(x) => String(x.id)}
        renderItem={({ item }) => (
          <ListingCard
            item={item}
            onPress={() =>
              router.push({ pathname: "/(app)/listing/[id]", params: { id: String(item.id) } })
            }
            isFavourite={favouriteIds.has(item.id)}
            onToggleFavourite={() => onToggle(item.id)}
            width={304}
            compact
          />
        )}
        contentContainerStyle={styles.horizontalListContent}
      />
    </View>
  );
}

function FavouritesSection({
  items,
  favouriteIds,
  onToggle,
  title,
  actionText,
  emptyHint,
}: {
  items: Listing[];
  favouriteIds: Set<number>;
  onToggle: (id: number) => void;
  title: string;
  actionText: string;
  emptyHint: string;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Pressable
          style={styles.sectionActionButton}
          onPress={() => router.push("/(app)/(tabs)/favourites")}
        >
          <Text style={styles.sectionAction}>{actionText}</Text>
        </Pressable>
      </View>

      {items.length > 0 ? (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={items}
          keyExtractor={(x) => String(x.id)}
          renderItem={({ item }) => (
            <ListingCard
              item={item}
              onPress={() =>
                router.push({ pathname: "/(app)/listing/[id]", params: { id: String(item.id) } })
              }
              isFavourite={favouriteIds.has(item.id)}
              onToggleFavourite={() => onToggle(item.id)}
              width={304}
              compact
            />
          )}
          contentContainerStyle={styles.horizontalListContent}
        />
      ) : (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[1, 2]}
          keyExtractor={(item) => String(item)}
          renderItem={() => (
            <View style={styles.placeholderCard}>
              <View style={styles.placeholderHero}>
                <View style={styles.placeholderHeart}>
                  <Ionicons name="heart-outline" size={26} color="#9AA8A5" />
                </View>
                <View style={styles.placeholderLogo} />
              </View>
              <View style={styles.placeholderBody}>
                <Text style={styles.placeholderText}>{emptyHint}</Text>
              </View>
            </View>
          )}
          contentContainerStyle={styles.horizontalListContent}
        />
      )}
    </View>
  );
}

export default function DiscoverScreen() {
  const { t } = useLang();
  const insets = useSafeAreaInsets();
  const refreshOffset = insets.top + 24;

  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<CategoryKey>("all");

  useHydrateFavourites();
  const { ids: favouriteIds } = useFavouritesStore();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getListings();
      setItems(res);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    return filterDiscoverListings(items, category);
  }, [items, category]);
  const favouriteItems = useMemo(
    () => items.filter((item) => favouriteIds.has(Number(item.id))).slice(0, 8),
    [items, favouriteIds]
  );

  const topPicks = useMemo(() => getDiscoverSectionItems(items, category, "topPicks"), [items, category]);
  const newSurpriseBags = useMemo(() => getDiscoverSectionItems(items, category, "newBags"), [items, category]);
  const meals = useMemo(() => getDiscoverSectionItems(items, category, "meals"), [items, category]);

  const categoryLabel = (k: CategoryKey) => t(`discover.categories.${k}`);

  return (
    <>
      <Stack.Screen options={{ title: t("tabs.discover") }} />

      <FlatList
        data={[]}
        keyExtractor={() => "noop"}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={load}
            progressViewOffset={refreshOffset}
            tintColor="#0B6E69"
            colors={["#0B6E69"]}
          />
        }
        ListHeaderComponent={
          <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
            <View style={styles.locationRow}>
              <View style={styles.locationIcon}>
                <Text style={styles.locationIconText}>◎</Text>
              </View>
              <Text style={styles.locationLabel}>{t("discover.chosenLocation")}</Text>
              <Text style={styles.locationValue}>Sandy Hill, Ottawa</Text>
              <Text style={styles.locationCaret}>▾</Text>
            </View>

            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={CATEGORIES}
              keyExtractor={(x) => x}
              contentContainerStyle={styles.chipsRow}
              renderItem={({ item }) => {
                const active = item === category;
                return (
                  <Pressable
                    onPress={() => setCategory(item)}
                    style={[
                      styles.chip,
                      active ? styles.chipActive : styles.chipInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        active ? styles.chipTextActive : styles.chipTextInactive,
                      ]}
                    >
                      {categoryLabel(item)}
                    </Text>
                  </Pressable>
                );
              }}
            />

            {filtered.length === 0 ? (
              <>
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconWrap}>
                    <View style={styles.emptyIconBlob} />
                    <Ionicons name="sad-outline" size={64} color="#0C766F" />
                  </View>
                  <Text style={styles.emptyTitle}>{t("discover.noMatchTitle")}</Text>
                  <Text style={styles.emptyDescription}>{t("discover.noMatchBody")}</Text>
                  {category !== "all" ? (
                    <Pressable onPress={() => setCategory("all")}>
                      <Text style={styles.emptyAction}>{t("discover.removeAllFilters")}</Text>
                    </Pressable>
                  ) : null}
                </View>

                <FavouritesSection
                  items={favouriteItems}
                  favouriteIds={favouriteIds}
                  onToggle={toggleFavourite}
                  title={t("discover.yourFavourites")}
                  actionText={t("discover.seeAll")}
                  emptyHint={t("discover.favouritesHint")}
                />
              </>
            ) : (
              <>
                <Section
                  sectionKey="topPicks"
                  title={t("discover.topPicks")}
                  actionText={t("discover.seeAll")}
                  category={category}
                  items={topPicks}
                  favouriteIds={favouriteIds}
                  onToggle={toggleFavourite}
                />
                <Section
                  sectionKey="newBags"
                  title={t("discover.newBags")}
                  actionText={t("discover.seeAll")}
                  category={category}
                  items={newSurpriseBags}
                  favouriteIds={favouriteIds}
                  onToggle={toggleFavourite}
                />
                {meals.length > 0 ? (
                  <Section
                    sectionKey="meals"
                    title={t("discover.categories.meals")}
                    actionText={t("discover.seeAll")}
                    category={category}
                    items={meals}
                    favouriteIds={favouriteIds}
                    onToggle={toggleFavourite}
                  />
                ) : null}
              </>
            )}
          </View>
        }
        renderItem={null as any}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 18, backgroundColor: "#FFFDF8" },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#E6EFEB",
    borderWidth: 1,
    borderColor: "#E1EAE6",
    marginBottom: 12,
  },
  locationIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#EDF7F3",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  locationIconText: { fontSize: 16, fontWeight: "700" },
  locationLabel: { fontSize: 16, fontWeight: "800", marginRight: 10, color: "#223130" },
  locationValue: { fontSize: 16, color: "#72817F", flex: 1 },
  locationCaret: { fontSize: 18, color: "#72817F" },

  chipsRow: { paddingVertical: 10, gap: 10 },
  chip: {
    minHeight: 56,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
  },
  chipActive: { backgroundColor: "#116B62", borderColor: "#116B62" },
  chipInactive: { backgroundColor: "#F4F7F4", borderColor: "#E2EBE7" },
  chipText: { fontSize: 15, fontWeight: "800" },
  chipTextActive: { color: "white" },
  chipTextInactive: { color: "#116B62" },

  section: { marginTop: 16 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 22, fontWeight: "800", color: "#1F2C2B" },
  sectionActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#F1F7F4",
    borderWidth: 1,
    borderColor: "#DDE9E4",
  },
  sectionAction: { fontSize: 15, fontWeight: "800", color: "#116B62" },

  horizontalListContent: { paddingVertical: 6, gap: 14, paddingRight: 18 },

  emptyState: {
    alignItems: "center",
    paddingTop: 28,
    paddingBottom: 10,
  },
  emptyIconWrap: {
    width: 170,
    height: 150,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIconBlob: {
    position: "absolute",
    width: 120,
    height: 90,
    borderRadius: 36,
    backgroundColor: "#F6EFE9",
    transform: [{ rotate: "18deg" }],
  },
  emptyTitle: {
    marginTop: 8,
    fontSize: 22,
    lineHeight: 30,
    fontWeight: "900",
    color: "#1F2C2B",
    textAlign: "center",
  },
  emptyDescription: {
    marginTop: 14,
    maxWidth: 320,
    fontSize: 17,
    lineHeight: 28,
    color: "#374240",
    textAlign: "center",
  },
  emptyAction: {
    marginTop: 18,
    fontSize: 17,
    fontWeight: "800",
    color: "#116B62",
    textDecorationLine: "underline",
  },
  placeholderCard: {
    width: 304,
    borderRadius: 26,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E4EBE8",
    backgroundColor: "#fff",
  },
  placeholderHero: {
    height: 125,
    backgroundColor: "#C7D1D1",
    position: "relative",
  },
  placeholderHeart: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderLogo: {
    position: "absolute",
    left: 16,
    bottom: 18,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
  },
  placeholderBody: {
    minHeight: 102,
    paddingHorizontal: 18,
    paddingVertical: 16,
    justifyContent: "center",
  },
  placeholderText: {
    fontSize: 15,
    lineHeight: 24,
    color: "#6F7D7A",
    fontWeight: "600",
  },
});
