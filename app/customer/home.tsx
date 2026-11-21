import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AdBanner } from "@/components/AdBanner";
import { IconButton } from "@/components/Button";
import { Segmented } from "@/components/Choice";
import { FreeDriverCard } from "@/components/FreeDriverCard";
import { Map } from "@/components/Map";
import { BottomSheet } from "@/components/Sheet";
import * as api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { bookingDraft, chosen } from "@/lib/draft";
import { firstName, STATUS_LABEL } from "@/lib/format";
import { useForegroundInterval } from "@/lib/hooks";
import { addressFor, getCurrentPosition, LocationError } from "@/lib/location";
import type { FreeDriver, LatLng, Trip } from "@/lib/types";
import { colors, font, radius, shadow, space } from "@/theme";

type Kind = "car" | "driver";

/**
 * Customer home: who is FREE near me right now.
 * Pick a car or a driver from the list and send them a request.
 */
export default function CustomerHome() {
  const { profile } = useAuth();
  const [here, setHere] = useState<LatLng | null>(null);
  const [locError, setLocError] = useState<string | null>(null);
  const [active, setActive] = useState<Trip | null>(null);
  const [kind, setKind] = useState<Kind>("car");
  const [list, setList] = useState<FreeDriver[] | null>(null);
  const [markers, setMarkers] = useState<api.NearbyDriver[]>([]);

  const locate = useCallback(async () => {
    try {
      setLocError(null);
      const pos = await getCurrentPosition();
      setHere(pos);
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
      api.getMyActiveTrip("customer").then(setActive).catch(() => setActive(null));
    }, [locate]),
  );

  const loadFree = useCallback(async () => {
    if (!here) return;
    try {
      const [people, dots] = await Promise.all([
        api.getFreeDrivers(here.lat, here.lng, kind, 10),
        api.getNearbyDrivers(here.lat, here.lng, 10),
      ]);
      setList(people);
      setMarkers(kind === "car" ? dots.filter((d) => d.has_car) : dots);
    } catch {
      /* keep the last list */
    }
  }, [here, kind]);

  useEffect(() => {
    setList(null);
    loadFree();
  }, [loadFree]);
  // Drivers go free and busy all the time: refresh every 30 seconds.
  useForegroundInterval(loadFree, 30_000, !!here && !active);

  const openDriver = (d: FreeDriver) => {
    chosen.set(d);
    router.push(`/request?kind=${kind}`);
  };

  return (
    <View style={{ flex: 1 }}>
      <Map center={here} bottomInset={480} nearby={active ? undefined : markers} />

      <SafeAreaView edges={["top"]} style={styles.top} pointerEvents="box-none">
        <View style={styles.hello}>
          <Text style={styles.helloText}>Hi {firstName(profile?.full_name)} 👋</Text>
        </View>
        <IconButton icon="locate" label="Show my location" onPress={locate} background={colors.white} />
      </SafeAreaView>

      <BottomSheet style={{ maxHeight: "64%" }}>
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
            <Segmented
              value={kind}
              onChange={setKind}
              options={[
                { value: "car", label: "🚗  Car + driver" },
                { value: "driver", label: "🧑  Driver only" },
              ]}
            />

            <View style={styles.listHead}>
              <View style={[styles.liveDot, { backgroundColor: (list?.length ?? 0) > 0 ? colors.green : colors.textFaint }]} />
              <Text style={font.bodyStrong}>
                {list == null ? "Checking who is free…" : `${list.length} free near you`}
              </Text>
              {list == null && <ActivityIndicator color={colors.black} />}
            </View>

            <ScrollView style={{ flexGrow: 0 }} showsVerticalScrollIndicator={false}>
              {list?.map((d) => <FreeDriverCard key={d.id} driver={d} onPress={() => openDriver(d)} />)}

              {list && list.length === 0 && (
                <View style={styles.empty}>
                  <Text style={[font.body, { textAlign: "center" }]}>
                    No {kind === "car" ? "cars" : "drivers"} are free within 10 km right now.
                  </Text>
                  <Text style={[font.small, { textAlign: "center", marginTop: space.xs }]}>
                    Try again in a few minutes, or send a request to everyone nearby.
                  </Text>
                </View>
              )}

              {/* Send to everyone nearby (first to accept) */}
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push(kind === "driver" ? "/search?service=driver_only" : "/search")}
                style={({ pressed }) => [styles.everyone, pressed && { backgroundColor: colors.surfacePressed }]}
              >
                <Ionicons name="megaphone-outline" size={22} color={colors.black} />
                <View style={{ flex: 1 }}>
                  <Text style={font.bodyStrong}>Ask everyone nearby</Text>
                  <Text style={font.tiny}>Your request goes to all free {kind === "car" ? "cars" : "drivers"}. First to accept comes.</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textFaint} />
              </Pressable>

              <AdBanner />
            </ScrollView>
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
  listHead: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: space.lg, marginBottom: space.xs },
  liveDot: { width: 10, height: 10, borderRadius: 5 },
  empty: { paddingVertical: space.xl, paddingHorizontal: space.md },
  everyone: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space.lg,
    marginTop: space.md,
  },
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
