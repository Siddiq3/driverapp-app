// =============================================================================
// The ONLY file that talks to the backend.
// Screens call these functions; they never call Supabase directly.
// If the backend moves (e.g. to AWS), only this file and supabase.ts change.
// =============================================================================

import { supabase } from "./supabase";
import type {
  Driver,
  DriverPublic,
  DriverStatus,
  Place,
  Profile,
  ServiceType,
  Trip,
  TripPerson,
  TripStatus,
  TripType,
  UserRole,
  VehicleType,
} from "./types";
import { ACTIVE_STATUSES } from "./types";

export class ApiError extends Error {}

function fail(error: { message?: string } | null | undefined, fallback = "Something went wrong. Please try again."): never {
  throw new ApiError(friendlyMessage(error?.message) ?? fallback);
}

/** Turn technical errors into short, plain messages. */
function friendlyMessage(message?: string): string | undefined {
  if (!message) return undefined;
  if (/network|fetch|timed? ?out/i.test(message)) return "No internet connection. Please check and try again.";
  if (/JWT|session|not signed in/i.test(message)) return "Please sign in again.";
  return message;
}

/** Calls the "trip" Edge Function (actions that also send notifications). */
async function tripAction<T>(action: string, params: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("trip", { body: { action, ...params } });
  if (error) {
    // The function returns { error: "..." } with a 400 for rule violations
    let message: string | undefined;
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === "function") message = (await ctx.json())?.error;
    } catch {
      /* ignore */
    }
    fail({ message: message ?? error.message });
  }
  return data as T;
}

async function myId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new ApiError("Please sign in again.");
  return id;
}

// ---------------------------------------------------------------------------
// Profile & driver account
// ---------------------------------------------------------------------------

export async function getMyProfile(): Promise<Profile | null> {
  const id = await myId();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  if (error) fail(error);
  return data as Profile | null;
}

export async function updateMyProfile(fields: Partial<Pick<Profile, "full_name" | "phone" | "role" | "push_token">>) {
  const id = await myId();
  const { error } = await supabase.from("profiles").update(fields).eq("id", id);
  if (error) {
    if (/phone/i.test(error.message)) throw new ApiError("Please enter a valid 10-digit phone number.");
    fail(error);
  }
}

export async function setMode(role: UserRole) {
  await updateMyProfile({ role });
}

export async function getMyDriver(): Promise<Driver | null> {
  const id = await myId();
  const { data, error } = await supabase.from("drivers").select("*").eq("id", id).maybeSingle();
  if (error) fail(error);
  return data as Driver | null;
}

export async function registerDriver(input: {
  hasCar: boolean;
  vehicleType: VehicleType | null;
  vehicleModel: string;
  vehicleNumber: string;
  licenceNumber: string;
}): Promise<Driver> {
  const { data, error } = await supabase.rpc("register_driver", {
    p_has_car: input.hasCar,
    p_vehicle_type: input.vehicleType,
    p_vehicle_model: input.vehicleModel,
    p_vehicle_number: input.vehicleNumber,
    p_licence_number: input.licenceNumber,
  });
  if (error) fail(error);
  return data as Driver;
}

export async function setAvailability(available: boolean, position?: { lat: number; lng: number }): Promise<Driver> {
  const { data, error } = await supabase.rpc("set_driver_availability", {
    p_available: available,
    p_lat: position?.lat ?? null,
    p_lng: position?.lng ?? null,
  });
  if (error) fail(error);
  return data as Driver;
}

export async function updateLocation(lat: number, lng: number) {
  const { error } = await supabase.rpc("update_driver_location", { p_lat: lat, p_lng: lng });
  if (error) fail(error);
}

// ---------------------------------------------------------------------------
// Fares
// ---------------------------------------------------------------------------

export async function estimateFare(args: {
  service: ServiceType;
  tripType: TripType;
  vehicle: VehicleType | null;
  distanceKm: number | null;
  hours: number | null;
}): Promise<number> {
  const { data, error } = await supabase.rpc("estimate_fare", {
    p_service: args.service,
    p_trip_type: args.tripType,
    p_vehicle: args.vehicle,
    p_distance_km: args.distanceKm,
    p_hours: args.hours,
  });
  if (error) fail(error);
  return data as number;
}

// ---------------------------------------------------------------------------
// Customer: booking
// ---------------------------------------------------------------------------

export async function requestTrip(args: {
  service: ServiceType;
  tripType: TripType;
  vehicle: VehicleType | null;
  pickup: Place;
  drop: Place | null;
  hours: number | null;
  note: string;
}): Promise<{ trip_id: string; drivers_notified: number }> {
  return tripAction("request", {
    service: args.service,
    trip_type: args.tripType,
    vehicle: args.vehicle,
    pickup_address: args.pickup.address,
    pickup_lat: args.pickup.lat,
    pickup_lng: args.pickup.lng,
    drop_address: args.drop?.address ?? null,
    drop_lat: args.drop?.lat ?? null,
    drop_lng: args.drop?.lng ?? null,
    hours: args.hours,
    note: args.note,
  });
}

export async function widenSearch(tripId: string): Promise<{ status: TripStatus; search_radius_km: number; drivers_notified: number }> {
  return tripAction("widen", { trip_id: tripId });
}

export async function cancelTrip(tripId: string, reason?: string): Promise<void> {
  await tripAction("cancel", { trip_id: tripId, reason: reason ?? null });
}

// ---------------------------------------------------------------------------
// Driver: offers and trip progress
// ---------------------------------------------------------------------------

export async function acceptTrip(tripId: string): Promise<boolean> {
  const res = await tripAction<{ accepted: boolean }>("accept", { trip_id: tripId });
  return res.accepted;
}

export async function skipTrip(tripId: string): Promise<void> {
  const { error } = await supabase.rpc("skip_trip", { p_trip: tripId });
  if (error) fail(error);
}

export async function updateTripStatus(tripId: string, status: "arrived" | "started" | "completed"): Promise<void> {
  await tripAction("update", { trip_id: tripId, status });
}

/** Offers waiting for this driver, with their trip details. */
export async function getPendingOffers(): Promise<Array<{ trip: Trip; distance_km: number | null }>> {
  const id = await myId();
  const { data, error } = await supabase
    .from("trip_offers")
    .select("distance_km, trip:trips(*)")
    .eq("driver_id", id)
    .eq("response", "pending")
    .order("sent_at", { ascending: false });
  if (error) fail(error);
  return ((data ?? []) as unknown as Array<{ distance_km: number | null; trip: Trip | null }>)
    .filter((o): o is { distance_km: number | null; trip: Trip } => !!o.trip && o.trip.status === "searching");
}

// ---------------------------------------------------------------------------
// Trips: reading
// ---------------------------------------------------------------------------

export async function getTrip(tripId: string): Promise<Trip | null> {
  const { data, error } = await supabase.from("trips").select("*").eq("id", tripId).maybeSingle();
  if (error) fail(error);
  return data as Trip | null;
}

export async function getMyActiveTrip(as: UserRole): Promise<Trip | null> {
  const id = await myId();
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .eq(as === "driver" ? "driver_id" : "customer_id", id)
    .in("status", as === "driver" ? ACTIVE_STATUSES.filter((s) => s !== "searching") : ACTIVE_STATUSES)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) fail(error);
  return data as Trip | null;
}

export async function getMyTrips(as: UserRole, limit = 50): Promise<Trip[]> {
  const id = await myId();
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .eq(as === "driver" ? "driver_id" : "customer_id", id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) fail(error);
  return (data ?? []) as Trip[];
}

export async function getTripDriver(driverId: string): Promise<DriverPublic | null> {
  const { data, error } = await supabase
    .from("drivers")
    .select("id, has_car, vehicle_type, vehicle_model, vehicle_number, rating_avg, rating_count, profile:profiles!drivers_id_fkey(full_name, phone, avatar_url)")
    .eq("id", driverId)
    .maybeSingle();
  if (error) fail(error);
  if (!data) return null;
  const d = data as unknown as Omit<DriverPublic, "full_name" | "phone" | "avatar_url"> & {
    profile: { full_name: string | null; phone: string | null; avatar_url: string | null } | null;
  };
  return {
    id: d.id,
    has_car: d.has_car,
    vehicle_type: d.vehicle_type,
    vehicle_model: d.vehicle_model,
    vehicle_number: d.vehicle_number,
    rating_avg: Number(d.rating_avg),
    rating_count: d.rating_count,
    full_name: d.profile?.full_name ?? null,
    phone: d.profile?.phone ?? null,
    avatar_url: d.profile?.avatar_url ?? null,
  };
}

export async function getPerson(userId: string): Promise<TripPerson | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone, avatar_url")
    .eq("id", userId)
    .maybeSingle();
  if (error) fail(error);
  return data as TripPerson | null;
}

export async function hasRated(tripId: string): Promise<boolean> {
  const id = await myId();
  const { count, error } = await supabase
    .from("ratings")
    .select("id", { count: "exact", head: true })
    .eq("trip_id", tripId)
    .eq("from_user", id);
  if (error) fail(error);
  return (count ?? 0) > 0;
}

export async function rateTrip(tripId: string, stars: number, comment?: string) {
  const { error } = await supabase.rpc("rate_trip", { p_trip: tripId, p_stars: stars, p_comment: comment ?? null });
  if (error) fail(error);
}

export async function triggerSos(tripId: string | null, position?: { lat: number; lng: number }) {
  const { error } = await supabase.rpc("trigger_sos", {
    p_trip: tripId,
    p_lat: position?.lat ?? null,
    p_lng: position?.lng ?? null,
  });
  if (error) fail(error);
}

// ---------------------------------------------------------------------------
// Live updates
// ---------------------------------------------------------------------------

/** Calls onChange whenever this trip row changes. Returns an unsubscribe function. */
export function watchTrip(tripId: string, onChange: (trip: Trip) => void): () => void {
  const channel = supabase
    .channel(`trip-${tripId}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "trips", filter: `id=eq.${tripId}` },
      (payload) => onChange(payload.new as Trip),
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

/** Calls onChange when this driver's offers are added or change. */
export function watchMyOffers(driverId: string, onChange: () => void): () => void {
  const channel = supabase
    .channel(`offers-${driverId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "trip_offers", filter: `driver_id=eq.${driverId}` },
      () => onChange(),
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function signInWithGoogleIdToken(idToken: string) {
  const { error } = await supabase.auth.signInWithIdToken({ provider: "google", token: idToken });
  if (error) fail(error, "Google sign-in failed. Please try again.");
}

export async function signOut() {
  try {
    await updateMyProfile({ push_token: null });
  } catch {
    /* still sign out */
  }
  await supabase.auth.signOut();
}

export type { DriverStatus };
