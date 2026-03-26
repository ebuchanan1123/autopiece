import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenBody } from "@/src/components/screen-body";
import { ScreenHeader } from "@/src/components/screen-header";
import { ListingCard } from "@/src/components/listing-card";
import {
  useFavouritesStore,
  useHydrateFavourites,
  toggleFavourite,
} from "@/src/features/favourites/favourites.store";
import { useLang } from "@/src/features/i18n/lang.context";
import {
  getDiscoverSectionItems,
  type CategoryKey,
  type DiscoverSectionKey,
} from "@/src/features/listings/discover-sections";
import { getListings, type Listing } from "@/src/features/listings/listings.api";

function isCategoryKey(value: string): value is CategoryKey {
  return [
    "all",
    "meals",
    "bread",
    "groceries",
    "personalCare",
    "flowers",
    "other",
  ].includes(value);
}

function isDiscoverSectionKey(value: string): value is DiscoverSectionKey {
  return ["topPicks", "newBags", "meals"].includes(value);
}

export default function DiscoverSectionScreen() {
  const { t } = useLang();
  const insets = useSafeAreaInsets();
  const refreshOffset = insets.top + 24;
  const params = useLocalSearchParams<{ section?: string; category?: string }>();
  const section = isDiscoverSectionKey(params.section ?? "") ? params.section : "topPicks";
  const category = isCategoryKey(params.category ?? "") ? params.category : "all";

  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);

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

  const visibleItems = useMemo(
    () => getDiscoverSectionItems(items, category, section),
    [items, category, section]
  );

  const title =
    section === "topPicks"
      ? t("discover.topPicks")
      : section === "newBags"
        ? t("discover.newBags")
        : t("discover.categories.meals");

  const appliedFilter =
    category === "all" ? null : `${t("discover.categoryFilterLabel")}: ${t(`discover.categories.${category}`)}`;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title={title} showBack onBack={() => router.back()} />
      <ScreenBody>
        <FlatList
          data={visibleItems}
          keyExtractor={(item) => String(item.id)}
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
          ItemSeparatorComponent={() => <View style={styles.spacer} />}
          ListHeaderComponent={
            appliedFilter ? <Text style={styles.appliedFilter}>{appliedFilter}</Text> : null
          }
          renderItem={({ item }) => (
            <ListingCard
              item={item}
              onPress={() =>
                router.push({ pathname: "/(app)/listing/[id]", params: { id: String(item.id) } })
              }
              isFavourite={favouriteIds.has(item.id)}
              onToggleFavourite={() => toggleFavourite(item.id)}
            />
          )}
          ListEmptyComponent={<Text style={styles.empty}>{t("discover.noListings")}</Text>}
        />
      </ScreenBody>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 24,
  },
  spacer: { height: 16 },
  appliedFilter: {
    marginBottom: 18,
    fontSize: 16,
    lineHeight: 24,
    color: "#70807E",
    fontWeight: "600",
  },
  empty: {
    paddingTop: 12,
    color: "#70807E",
    fontWeight: "600",
  },
});
