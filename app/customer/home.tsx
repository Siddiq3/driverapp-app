import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconButton } from "@/components/Button";
import { Map } from "@/components/Map";
import { BottomSheet } from "@/components/Sheet";
import * as api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { bookingDraft, getRecentPlaces } from "@/lib/draft";
import { firstName, STATUS_LABEL } from "@/lib/format";
import { useForegroundInterval } from "@/lib/hooks";
import { addressFor, getCurrentPosition, LocationError } from "@/lib/location";
import type { LatLng, Place, Trip } from "@/lib/types";
import { colors, font, radius, shadow, space } from "@/theme";

/**
 * Customer home, like Uber / Rapido:
 * map with free drivers · "Where to?" · recent places · Ride / Rental / Driver.
 */
export default function CustomerHome() {
  const { profile } = useAuth();
  const [here, setHere] = useState<LatLng | null>(null);
  const [locError, setLocError] = useState<string | null>(null);
  const [active, setActive] = useState<Trip | null>(null);
  const [nearby, setNearby] = useState<api.NearbyDriver[] | null>(null);
  const [recents, setRecents] = useState<Place[]>([]);

  const locate = useCallback(async () => {
    try {
      setLocError(null);
      const pos = await getCurrentPosition();
      setHere(pos);
      // Pickup defaults to where the customer is now
      const address = await addressFor(pos);
      bookingDraft.setPickup({ ...pos, address });
    } catch (err) {
      setLocError(err instanceof LocationError ? err.message : "Could not find your location.");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      locate();
      bookingDraft.reset();
      getRecentPlaces().then((r) => setRecents(r.slice(0, 3)));
      api.getMyActiveTrip("customer").then(setActive).catch(() => setActive(null));
    }, [locate]),
  );

  const loadNearby = useCallback(async (pos: LatLng | null) => {
    if (!pos) return;
    try {
      setNearby(await api.getNearbyDrivers(pos.lat, pos.lng, 5));
    } catch {
      /* keep the last list */
    }
  }, []);

  useEffect(() => {
    loadNearby(here);
  }, [here, loadNearby]);
  useForegroundInterval(() => loadNearby(here), 30_000, !!here && !active);

  const goTo = (place: Place) => {
    bookingDraft.setDrop(place);
    router.push("/ride");
  };

  const free = nearby?.length ?? 0;

  return (
    <View style={{ flex: 1 }}>
      <Map center={here} bottomInset={420} nearby={active ? undefined : nearby ?? undefined} />

      <SafeAreaView edges={["top"]} style={styles.top} pointerEvents="box-none">
        <View style={styles.hello}>
          <Text style={styles.helloText}>Hi {firstName(profile?.full_name)} 👋</Text>
        </View>
        <IconButton icon="locate" label="Show my location" onPress={locate} background={colors.white} />
      </SafeAreaView>

      <BottomSheet>
        {active ? (
          <Pressable style={styles.active} onPress={() => router.push(`/trip/${active.id}`)} accessibilityRole="button">
            <View style={styles.activeDot} />
            <View style={{ flex: 1 }}>
              <Text style={[font.bodyStrong, { color: colors.white }]}>{STATUS_LABEL[active.status]}</Text>
              <Text style={{ color: "#CFCFCF", fontSize: 15 }}>Tap to see your trip</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.white} />
          </Pressable>
        ) : (
          <>
            {/* Where to? */}
            <Pressable
              accessibilityRole="search"
              accessibilityLabel="Where are you going?"
              onPress={() => router.push("/search")}
              style={({ pressed }) => [styles.whereTo, pressed && { backgroundColor: colors.surfacePressed }]}
            >
              <Ionicons name="search" size={24} color={colors.black} />
              <Text style={styles.whereText}>Where are you going?</Text>
              <View style={styles.nowPill}>
                <Ionicons name="time" size={14} color={colors.black} />
                <Text style={styles.nowText}>Now</Text>
              </View>
            </Pressable>

            {/* Recent places */}
            {recents.map((p) => (
              <Pressable
                key={`${p.lat},${p.lng}`}
                onPress={() => goTo(p)}
                accessibilityRole="button"
                style={({ pressed }) => [styles.recent, pressed && { backgroundColor: colors.surface }]}
              >
                <View style={styles.recentIcon}>
                  <Ionicons name="time-outline" size={20} color={colors.black} />
                </View>
                <Text style={styles.recentText} numberOfLines={1}>
                  {p.address}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
              </Pressable>
            ))}

            {/* Services */}
            <View style={styles.services}>
              <Service icon="car-sport" label="Ride" onPress={() => router.push("/search")} />
              <Service icon="hourglass" label="Rental" hint="By hours" onPress={() => router.push("/rental")} />
              <Service
                icon="person"
                label="Driver"
                hint="For my car"
                onPress={() => router.push("/search?service=driver_only")}
              />
            </View>

            <View style={styles.nearbyRow}>
              <View style={[styles.liveDot, { backgroundColor: free > 0 ? colors.green : colors.textFaint }]} />
              <Text style={font.small}>
                {nearby == null
                  ? "Checking for drivers near you…"
                  : free > 0
                    ? `${free} driver${free > 1 ? "s" : ""} free near you`
                    : "No free drivers close by now. You can still book."}
              </Text>
            </View>
          </>
        )}

        {locError && (
          <Pressable onPress={locate} style={styles.warn} accessibilityRole="button">
            <Ionicons name="location" size={20} color={colors.amber} />
            <Text style={styles.warnText}>{locError} Tap to try again.</Text>
          </Pressable>
        )}
      </BottomSheet>
    </View>
  );
}

function Service({
  icon,
  label,
  hint,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={hint ? `${label}, ${hint}` : label}
      onPress={onPress}
      style={({ pressed }) => [styles.service, pressed && { backgroundColor: colors.surfacePressed }]}
    >
      <Ionicons name={icon} size={30} color={colors.black} />
      <Text style={styles.serviceLabel}>{label}</Text>
      {hint && <Text style={styles.serviceHint}>{hint}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  top: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
  },
  hello: {
    backgroundColor: colors.white,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.pill,
    ...shadow,
  },
  helloText: { fontSize: 17, fontWeight: "700", color: colors.text },
  whereTo: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    minHeight: 60,
    marginBottom: space.sm,
  },
  whereText: { flex: 1, fontSize: 19, fontWeight: "700", color: colors.text },
  nowPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 6,
  },
  nowText: { fontSize: 14, fontWeight: "700", color: colors.text },
  recent: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    minHeight: 52,
    borderRadius: radius.sm,
    paddingHorizontal: 4,
  },
  recentIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  recentText: { flex: 1, fontSize: 16, color: colors.text },
  services: { flexDirection: "row", gap: space.sm, marginTop: space.md },
  service: {
    flex: 1,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: space.md,
    minHeight: 92,
    justifyContent: "center",
  },
  serviceLabel: { fontSize: 16, fontWeight: "700", color: colors.text, marginTop: 6 },
  serviceHint: { fontSize: 12, color: colors.textMuted },
  nearbyRow: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: space.lg },
  liveDot: { width: 10, height: 10, borderRadius: 5 },
  active: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: colors.black,
    borderRadius: radius.md,
    padding: space.lg,
  },
  activeDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.green },
  warn: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: colors.amberSoft,
    padding: space.md,
    borderRadius: radius.sm,
    marginTop: space.md,
  },
  warnText: { flex: 1, color: colors.amber, fontSize: 14, fontWeight: "600" },
});
