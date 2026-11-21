import * as Location from "expo-location";
import type { LatLng, Place } from "./types";
import { t } from "@/i18n";

export class LocationError extends Error {}

export type LocationAccess = "granted" | "ask" | "blocked";

/** Current permission without showing a popup. "blocked" = user must enable it in Settings. */
export async function locationAccess(): Promise<LocationAccess> {
  const p = await Location.getForegroundPermissionsAsync();
  if (p.granted) return "granted";
  return p.canAskAgain ? "ask" : "blocked";
}

/** Shows the system popup. */
export async function askLocation(): Promise<LocationAccess> {
  const p = await Location.requestForegroundPermissionsAsync();
  if (p.granted) return "granted";
  return p.canAskAgain ? "ask" : "blocked";
}

/** Asks for permission (once) and returns the phone's current position. */
export async function getCurrentPosition(): Promise<LatLng> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    throw new LocationError(t("Please allow location so we can find drivers near you."));
  }
  const servicesOn = await Location.hasServicesEnabledAsync();
  if (!servicesOn) {
    throw new LocationError(t("Please turn on Location (GPS) in your phone settings."));
  }

  // Use a recent cached fix first for speed, then a fresh one.
  const last = await Location.getLastKnownPositionAsync({ maxAge: 60_000, requiredAccuracy: 200 });
  if (last) return { lat: last.coords.latitude, lng: last.coords.longitude };

  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return { lat: pos.coords.latitude, lng: pos.coords.longitude };
}

/** Short readable address for a position, using the phone's free built-in geocoder. */
export async function addressFor(pos: LatLng): Promise<string> {
  try {
    const [r] = await Location.reverseGeocodeAsync({ latitude: pos.lat, longitude: pos.lng });
    if (!r) return t("Current location");
    const parts = [r.name !== r.street ? r.name : null, r.street, r.district ?? r.subregion, r.city]
      .filter((p): p is string => !!p && p.trim().length > 0 && !/^\d+$/.test(p));
    const unique = parts.filter((p, i) => parts.indexOf(p) === i);
    return unique.slice(0, 3).join(", ") || t("Current location");
  } catch {
    return t("Current location");
  }
}

/** Finds a typed place (e.g. "Bus stand, Guntur"). Uses the phone's free geocoder. */
export async function searchPlace(query: string, near?: LatLng): Promise<Place | null> {
  const q = query.trim();
  if (q.length < 3) return null;

  // Adding the user's city helps the geocoder find small local places.
  let city = "";
  if (near) {
    try {
      const [r] = await Location.reverseGeocodeAsync({ latitude: near.lat, longitude: near.lng });
      city = r?.city ?? r?.subregion ?? "";
    } catch {
      /* ignore */
    }
  }

  const tries = city && !q.toLowerCase().includes(city.toLowerCase()) ? [`${q}, ${city}`, q] : [q];
  for (const attempt of tries) {
    try {
      const results = await Location.geocodeAsync(attempt);
      if (results.length > 0) {
        const best = near ? closest(results.map((r) => ({ lat: r.latitude, lng: r.longitude })), near) : {
          lat: results[0].latitude,
          lng: results[0].longitude,
        };
        return { ...best, address: q };
      }
    } catch {
      /* try next */
    }
  }
  return null;
}

export type Suggestion = Place & { title: string; subtitle: string; km: number | null };

/**
 * "Search as you type" using the phone's free geocoder.
 * Returns up to 3 matches, nearest first, with a readable area name under each.
 */
export async function suggestPlaces(query: string, near?: LatLng | null): Promise<Suggestion[]> {
  const q = query.trim();
  if (q.length < 3) return [];

  let city = "";
  if (near) {
    try {
      const [r] = await Location.reverseGeocodeAsync({ latitude: near.lat, longitude: near.lng });
      city = r?.city ?? r?.subregion ?? "";
    } catch {
      /* ignore */
    }
  }

  const queries = city && !q.toLowerCase().includes(city.toLowerCase()) ? [`${q}, ${city}`, q] : [q];
  const found: LatLng[] = [];
  for (const attempt of queries) {
    try {
      const results = await Location.geocodeAsync(attempt);
      for (const r of results) {
        const p = { lat: r.latitude, lng: r.longitude };
        if (!found.some((f) => distanceKm(f, p) < 0.3)) found.push(p);
      }
    } catch {
      /* try next */
    }
    if (found.length >= 3) break;
  }

  const sorted = near ? [...found].sort((a, b) => distanceKm(a, near) - distanceKm(b, near)) : found;
  const top = sorted.slice(0, 3);

  return Promise.all(
    top.map(async (p) => {
      const area = await addressFor(p);
      return {
        ...p,
        title: q,
        subtitle: area,
        address: `${q}, ${area}`.slice(0, 200),
        km: near ? Math.round(distanceKm(p, near) * 10) / 10 : null,
      };
    }),
  );
}

function closest(points: LatLng[], to: LatLng): LatLng {
  return points.reduce((best, p) => (distanceKm(p, to) < distanceKm(best, to) ? p : best), points[0]);
}

/** Straight-line distance in km. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/** Approx road distance, matching the backend (straight line x 1.3). */
export function roadKm(a: LatLng, b: LatLng): number {
  return Math.round(distanceKm(a, b) * 1.3 * 10) / 10;
}
