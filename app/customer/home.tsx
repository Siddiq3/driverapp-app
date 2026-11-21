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
import { firstName, STATUS_LABEL } from "@/lib/format";
import { useForegroundInterval } from "@/lib/hooks";
import { getCurrentPosition, LocationError } from "@/lib/location";
import type { LatLng, ServiceType, Trip } from "@/lib/types";
import { colors, font, radius, shadow, space } from "@/theme";

export default function CustomerHome() {
  const { profile } = useAuth();
  const [here, setHere] = useState<LatLng | null>(null);
  const [locError, setLocError] = useState<string | null>(null);
  const [active, setActive] = useState<Trip | null>(null);
  const [nearby, setNearby] = useState<api.NearbyDriver[] | null>(null);

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

  // Drivers go free and busy all the time: refresh every 30 seconds.
  useForegroundInterval(() => loadNearby(here), 30_000, !!here && !active);

  const cars = nearby?.filter((d) => d.has_car).length ?? 0;
  const drivers = nearby?.length ?? 0;

  const locate = useCallback(async () => {
    try {
      setLocError(null);
      setHere(await getCurrentPosition());
    } catch (err) {
      setLocError(err instanceof LocationError ? err.message : "Could not find your location.");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      locate();
      api.getMyActiveTrip("customer").then(setActive).catch(() => setActive(null));
    }, [locate]),
  );

  const book = (service: ServiceType) => router.push(`/book?service=${service}`);

  return (
    <View style={{ flex: 1 }}>
      <Map center={here} bottomInset={330} nearby={active ? undefined : nearby ?? undefined} />

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
            <Text style={font.heading}>What do you need?</Text>
            <NearbyLine count={nearby == null ? null : drivers} />
            <View style={styles.tiles}>
              <Tile
                icon="car-sport"
                title="Car + driver"
                text="We send a car with a driver"
                badge={nearby == null ? undefined : cars > 0 ? `${cars} free nearby` : "None free now"}
                ok={cars > 0}
                onPress={() => book("car_with_driver")}
              />
              <Tile
                icon="person"
                title="Driver only"
                text="A driver for your own car"
                badge={nearby == null ? undefined : drivers > 0 ? `${drivers} free nearby` : "None free now"}
                ok={drivers > 0}
                onPress={() => book("driver_only")}
              />
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

function NearbyLine({ count }: { count: number | null }) {
  if (count == null) {
    return <Text style={[font.small, styles.nearbyLine]}>Checking for drivers near you…</Text>;
  }
  return (
    <View style={[styles.nearbyLine, { flexDirection: "row", alignItems: "center", gap: space.sm }]}>
      <View style={[styles.liveDot, { backgroundColor: count > 0 ? colors.green : colors.textFaint }]} />
      <Text style={font.small}>
        {count > 0
          ? `${count} driver${count > 1 ? "s" : ""} free within 5 km`
          : "No free drivers close by right now. You can still book — we search up to 20 km."}
      </Text>
    </View>
  );
}

function Tile({
  icon,
  title,
  text,
  badge,
  ok,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
  badge?: string;
  ok?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && { backgroundColor: colors.surfacePressed }]}
    >
      <View style={styles.tileIcon}>
        <Ionicons name={icon} size={34} color={colors.black} />
      </View>
      <Text style={styles.tileTitle}>{title}</Text>
      <Text style={styles.tileText}>{text}</Text>
      {badge && (
        <View style={[styles.badge, { backgroundColor: ok ? colors.greenSoft : colors.white }]}>
          <Text style={[styles.badgeText, { color: ok ? colors.green : colors.textMuted }]}>{badge}</Text>
        </View>
      )}
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
  tiles: { flexDirection: "row", gap: space.md },
  nearbyLine: { marginTop: space.xs, marginBottom: space.lg },
  liveDot: { width: 10, height: 10, borderRadius: 5 },
  badge: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginTop: space.md },
  badgeText: { fontSize: 13, fontWeight: "700" },
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    minHeight: 160,
  },
  tileIcon: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.md,
  },
  tileTitle: { fontSize: 19, fontWeight: "800", color: colors.text },
  tileText: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
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
