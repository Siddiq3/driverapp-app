import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";
import type { FreeDriver, Place } from "./types";

// =============================================================================
// The booking in progress (pickup + drop), shared by Search → Map pin → Ride.
// =============================================================================

type Draft = { pickup: Place | null; drop: Place | null };

let draft: Draft = { pickup: null, drop: null };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export const bookingDraft = {
  get: () => draft,
  setPickup(pickup: Place | null) {
    draft = { ...draft, pickup };
    emit();
  },
  setDrop(drop: Place | null) {
    draft = { ...draft, drop };
    emit();
  },
  reset() {
    draft = { pickup: draft.pickup, drop: null };
    emit();
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};

export function useBookingDraft(): Draft {
  return useSyncExternalStore(bookingDraft.subscribe, bookingDraft.get, bookingDraft.get);
}

// =============================================================================
// Recent places (saved on the phone only)
// =============================================================================

const RECENTS_KEY = "recent-places-v1";
const MAX_RECENTS = 8;

export async function getRecentPlaces(): Promise<Place[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENTS_KEY);
    return raw ? (JSON.parse(raw) as Place[]) : [];
  } catch {
    return [];
  }
}

export async function saveRecentPlace(place: Place): Promise<void> {
  try {
    const list = await getRecentPlaces();
    const near = (a: Place, b: Place) => Math.abs(a.lat - b.lat) < 0.0005 && Math.abs(a.lng - b.lng) < 0.0005;
    const next = [place, ...list.filter((p) => !near(p, place) && p.address !== place.address)].slice(0, MAX_RECENTS);
    await AsyncStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    /* not important */
  }
}

// =============================================================================
// The driver a customer tapped in the "free near me" list
// =============================================================================


let chosenDriver: FreeDriver | null = null;
export const chosen = {
  set: (d: FreeDriver | null) => {
    chosenDriver = d;
  },
  get: () => chosenDriver,
};
