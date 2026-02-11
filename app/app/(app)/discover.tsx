import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  Pressable,
} from "react-native";
import { Stack } from "expo-router";
import { getListings, type Listing } from "@/src/features/listings/listings.api";

type CategoryKey =
  | "All"
  | "Meals"
  | "Bread & pastries"
  | "Groceries"
  | "Personal care"
  | "Flowers & plants"
  | "Other";

const CATEGORIES: CategoryKey[] = [
  "All",
  "Meals",
  "Bread & pastries",
  "Groceries",
  "Personal care",
  "Flowers & plants",
  "Other",
];

function guessCategory(listing: Listing): CategoryKey {
  const text = `${listing.title} ${listing.description}`.toLowerCase();

  if (/(meal|dish|dinner|lunch|sandwich|pizza|pasta|chicken|burger)/i.test(text)) {
    return "Meals";
  }
  if (/(bread|pastr|bakery|cake|croissant|donut|cookie|muffin)/i.test(text)) {
    return "Bread & pastries";
  }
  if (/(grocery|supermarket|market|fruit|vegetable|milk|cheese)/i.test(text)) {
    return "Groceries";
  }
  if (/(soap|shampoo|skincare|cream|cosmetic|beauty)/i.test(text)) {
    return "Personal care";
  }
  if (/(flower|plant|bouquet)/i.test(text)) {
    return "Flowers & plants";
  }
  return "Other";
}

function ListingCard({ item }: { item: Listing }) {
  return (
    <Pressable style={styles.card} onPress={() => {}}>
      <View style={styles.cardTopRow}>
        <Text numberOfLines={1} style={styles.cardTitle}>
          {item.title}
        </Text>
        <View style={styles.heart}>
          <Text style={styles.heartText}>♡</Text>
        </View>
      </View>

      <Text style={styles.cardMeta}>
        {item.city}, {item.wilaya}
      </Text>

      <Text numberOfLines={2} style={styles.cardDesc}>
        {item.description}
      </Text>

      <View style={styles.cardBottomRow}>
        <Text style={styles.price}>{item.priceDzd} DZD</Text>
        <View style={styles.reserveBtn}>
          <Text style={styles.reserveBtnText}>Reserve</Text>
        </View>
      </View>
    </Pressable>
  );
}

function Section({
  title,
  actionText,
  items,
}: {
  title: string;
  actionText?: string;
  items: Listing[];
}) {
  if (items.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {actionText ? (
          <Pressable onPress={() => {}}>
            <Text style={styles.sectionAction}>{actionText}</Text>
          </Pressable>
        ) : null}
      </View>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={items}
        keyExtractor={(x) => String(x.id)}
        renderItem={({ item }) => <ListingCard item={item} />}
        contentContainerStyle={styles.horizontalListContent}
      />
    </View>
  );
}

export default function ListingsScreen() {
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<CategoryKey>("All");

  async function load() {
    setLoading(true);
    try {
      const res = await getListings();
      setItems(res);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (category === "All") return items;
    return items.filter((x) => guessCategory(x) === category);
  }, [items, category]);

  const topPicks = useMemo(() => filtered.slice(0, 10), [filtered]);
  const newSurpriseBags = useMemo(() => filtered.slice(10, 20), [filtered]);
  const meals = useMemo(
    () => filtered.filter((x) => guessCategory(x) === "Meals").slice(0, 10),
    [filtered]
  );

  return (
    <>
      <Stack.Screen options={{ title: "Discover" }} />

      <FlatList
        data={[]}
        keyExtractor={() => "noop"}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ListHeaderComponent={
          <View style={styles.container}>
            <View style={styles.locationRow}>
              <View style={styles.locationIcon}>
                <Text style={styles.locationIconText}>◎</Text>
              </View>
              <Text style={styles.locationLabel}>Chosen location</Text>
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
                    style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
                  >
                    <Text style={[styles.chipText, active ? styles.chipTextActive : styles.chipTextInactive]}>
                      {item}
                    </Text>
                  </Pressable>
                );
              }}
            />

            {filtered.length === 0 ? (
              <Text style={styles.emptyText}>No listings yet.</Text>
            ) : (
              <>
                <Section title="Top picks near you" actionText="See all" items={topPicks} />
                <Section title="New Surprise Bags" actionText="See all" items={newSurpriseBags} />
                {meals.length > 0 ? (
                  <Section title="Meals" actionText="See all" items={meals} />
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
  container: { flex: 1, padding: 16, paddingTop: 10 },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    marginBottom: 10,
  },
  locationIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#e9f5f2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  locationIconText: { fontSize: 16, fontWeight: "700" },
  locationLabel: { fontSize: 16, fontWeight: "700", marginRight: 10 },
  locationValue: { fontSize: 16, color: "#777", flex: 1 },
  locationCaret: { fontSize: 18, color: "#444" },

  chipsRow: { paddingVertical: 10, gap: 10 },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  chipActive: { backgroundColor: "#0f6b5a", borderColor: "#0f6b5a" },
  chipInactive: { backgroundColor: "#fbf6f2", borderColor: "#fbf6f2" },
  chipText: { fontSize: 16, fontWeight: "700" },
  chipTextActive: { color: "white" },
  chipTextInactive: { color: "#0f6b5a" },

  section: { marginTop: 12 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 26, fontWeight: "800" },
  sectionAction: { fontSize: 16, fontWeight: "700", color: "#0f6b5a" },

  horizontalListContent: { paddingVertical: 6, gap: 12 },

  card: {
    width: 290,
    borderWidth: 1,
    borderColor: "#eee",
    backgroundColor: "white",
    padding: 14,
    borderRadius: 16,
  },
  cardTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontSize: 18, fontWeight: "800", flex: 1, marginRight: 12 },
  heart: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#eee",
    alignItems: "center",
    justifyContent: "center",
  },
  heartText: { fontSize: 18, marginTop: -2 },

  cardMeta: { color: "#666", marginTop: 6, marginBottom: 8 },
  cardDesc: { color: "#222", marginBottom: 12 },

  cardBottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  price: { fontSize: 22, fontWeight: "900" },
  reserveBtn: {
    backgroundColor: "#0f6b5a",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
  },
  reserveBtnText: { color: "white", fontWeight: "800", fontSize: 16 },

  emptyText: { marginTop: 20, color: "#444" },
});
