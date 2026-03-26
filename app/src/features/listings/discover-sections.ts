import type { Listing } from "./listings.api";

export type CategoryKey =
  | "all"
  | "meals"
  | "bread"
  | "groceries"
  | "personalCare"
  | "flowers"
  | "other";

export type DiscoverSectionKey = "topPicks" | "newBags" | "meals";

export const CATEGORIES: CategoryKey[] = [
  "all",
  "meals",
  "bread",
  "groceries",
  "personalCare",
  "flowers",
  "other",
];

export function guessCategory(listing: Listing): CategoryKey {
  const text = `${listing.title} ${listing.description}`.toLowerCase();

  if (/(meal|dish|dinner|lunch|sandwich|pizza|pasta|chicken|burger)/i.test(text)) return "meals";
  if (/(bread|pastr|bakery|cake|croissant|donut|cookie|muffin)/i.test(text)) return "bread";
  if (/(grocery|supermarket|market|fruit|vegetable|milk|cheese)/i.test(text)) return "groceries";
  if (/(soap|shampoo|skincare|cream|cosmetic|beauty)/i.test(text)) return "personalCare";
  if (/(flower|plant|bouquet)/i.test(text)) return "flowers";
  return "other";
}

export function filterDiscoverListings(items: Listing[], category: CategoryKey) {
  if (category === "all") return items;
  return items.filter((x) => guessCategory(x) === category);
}

export function getDiscoverSectionItems(
  items: Listing[],
  category: CategoryKey,
  section: DiscoverSectionKey
) {
  const filtered = filterDiscoverListings(items, category);

  if (section === "topPicks") return filtered.slice(0, 10);
  if (section === "newBags") return filtered.slice(10, 20);
  return filtered.filter((x) => guessCategory(x) === "meals").slice(0, 10);
}
