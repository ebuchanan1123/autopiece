import { useEffect, useSyncExternalStore } from "react";
import { favouriteAdd, favouriteRemove, getMyFavourites } from "./favourites.api";

type State = {
  ids: Set<number>;
  version: number; // increments on every change so listeners can react
  hydrated: boolean;
};

let state: State = {
  ids: new Set<number>(),
  version: 0,
  hydrated: false,
};

const listeners = new Set<() => void>();

function setIds(next: Set<number>) {
  state = { ...state, ids: next, hydrated: true, version: state.version + 1 };
  listeners.forEach((l) => l());
}

export function getFavouriteIdsSnapshot() {
  return state;
}

export function subscribeFavouriteIds(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Hook: returns the store state and re-renders on any change.
 */
export function useFavouritesStore() {
  return useSyncExternalStore(subscribeFavouriteIds, getFavouriteIdsSnapshot, getFavouriteIdsSnapshot);
}

/**
 * One-time hydration (safe to call multiple times).
 */
export async function hydrateFavourites() {
  if (state.hydrated) return;
  try {
    const favs = await getMyFavourites();
    setIds(new Set(favs.map((l) => Number(l.id))));
  } catch {
    // If not logged in as client, etc., we still mark as hydrated to avoid retry loops
    state = { ...state, hydrated: true, version: state.version + 1 };
    listeners.forEach((l) => l());
  }
}

/**
 * Optional: force a refresh from server.
 */
export async function refreshFavourites() {
  try {
    const favs = await getMyFavourites();
    setIds(new Set(favs.map((l) => Number(l.id))));
  } catch {
    // ignore
  }
}

/**
 * Optimistic toggle + server sync.
 */
export async function toggleFavourite(listingId: number) {
  const prev = new Set(state.ids);           // snapshot BEFORE optimistic update
  const wasFav = prev.has(listingId);

  // optimistic update
  const next = new Set(prev);
  if (wasFav) next.delete(listingId);
  else next.add(listingId);
  setIds(next);

  try {
    if (wasFav) await favouriteRemove(listingId);
    else await favouriteAdd(listingId);
  } catch (err) {
    console.log("toggleFavourite failed:", err);
    setIds(prev); // true revert
  }
}


/**
 * Convenience hook to auto-hydrate once when a screen mounts.
 */
export function useHydrateFavourites() {
  useEffect(() => {
    hydrateFavourites();
  }, []);
}
