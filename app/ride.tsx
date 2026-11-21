import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, IconButton } from "@/components/Button";
import { Stepper } from "@/components/Choice";
import { Map } from "@/components/Map";
import { BottomSheet } from "@/components/Sheet";
import { showError } from "@/lib/alert";
import * as api from "@/lib/api";
import { useBookingDraft } from "@/lib/draft";
import { rupees, VEHICLE_HINT } from "@/lib/format";
import { distanceKm, roadKm } from "@/lib/location";
import type { ServiceType, TripType, VehicleType } from "@/lib/types";
import { colors, font, radius, space } from "@/theme";

const OUTSTATION_KM = 40; // longer than this = outstation fare

type OptionKey = VehicleType | "driver";
type Option = {
  key: OptionKey;
  service: ServiceType;
  vehicle: VehicleType | null;
  title: string;
  hint: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const CAR_OPTIONS: Option[] = [
  { key: "hatchback", service: "car_with_driver", vehicle: "hatchback", title: "Mini", hint: VEHICLE_HINT.hatchback, icon: "car-outline" },
  { key: "sedan", service: "car_with_driver", vehicle: "sedan", title: "Sedan", hint: VEHICLE_HINT.sedan, icon: "car-sport-outline" },
  { key: "suv", service: "car_with_driver", vehicle: "suv", title: "SUV", hint: VEHICLE_HINT.suv, icon: "bus-outline" },
];
const DRIVER_OPTION: Option = {
  key: "driver",
  service: "driver_only",
  vehicle: null,
  title: "Driver only",
  hint: "A driver drives your own car",
  icon: "person-outline",
};

/** Choose a ride (Mini / Sedan / SUV / Driver only) with price and pickup time, then book. */
export default function Ride() {
  const params = useLocalSearchParams<{ service?: string }>();
  const onlyDriver = params.service === "driver_only";
  const { pickup, drop } = useBookingDraft();

  const options = onlyDriver ? [DRIVER_OPTION] : [...CAR_OPTIONS, DRIVER_OPTION];
  const km = useMemo(() => (pickup && drop ? roadKm(pickup, drop) : null), [pickup, drop]);
  // No drop chosen = keep the car / driver for some hours
  const byHours = !drop;
  const tripType: TripType = byHours ? "hourly" : km != null && km > OUTSTATION_KM ? "outstation" : "local";
  const needsHours = (o: Option) => byHours || o.service === "driver_only";

  const [selected, setSelected] = useState<OptionKey>(onlyDriver ? "driver" : "hatchback");
  const [hours, setHours] = useState(() => (km ? Math.min(Math.max(Math.ceil(km / 30) + 2, 2), 24) : 4));
  const [fares, setFares] = useState<Partial<Record<OptionKey, number>>>({});
  const [loadingFares, setLoadingFares] = useState(true);
  const [nearby, setNearby] = useState<api.NearbyDriver[] | null>(null);
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [booking, setBooking] = useState(false);

  // Free drivers near pickup → "3 min away"
  useEffect(() => {
    if (!pickup) return;
    api.getNearbyDrivers(pickup.lat, pickup.lng, 10).then(setNearby).catch(() => setNearby([]));
  }, [pickup?.lat, pickup?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  // Prices for every option
  useEffect(() => {
    let alive = true;
    setLoadingFares(true);
    Promise.all(
      options.map((o) =>
        api
          .estimateFare({
            service: o.service,
            tripType,
            vehicle: o.vehicle,
            distanceKm: km,
            hours: needsHours(o) ? hours : null,
          })
          .then((f) => [o.key, f] as const)
          .catch(() => [o.key, undefined] as const),
      ),
    )
      .then((pairs) => alive && setFares(Object.fromEntries(pairs.filter(([, f]) => f != null))))
      .finally(() => alive && setLoadingFares(false));
    return () => {
      alive = false;
    };
  }, [km, tripType, hours]); // eslint-disable-line react-hooks/exhaustive-deps

  const etaFor = (o: Option): string => {
    if (!pickup || nearby == null) return "";
    const matching = nearby.filter((d) => (o.service === "driver_only" ? true : d.has_car && d.vehicle_type === o.vehicle));
    if (matching.length === 0) return "Busy now";
    const nearest = Math.min(...matching.map((d) => distanceKm(d, pickup)));
    const mins = Math.max(2, Math.round((nearest * 1.3) / 25 * 60) + 2); // ~25 km/h in town
    return `${mins} min away`;
  };

  const chosen = options.find((o) => o.key === selected) ?? options[0];
  const price = fares[chosen.key];

  if (!pickup) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={font.heading}>Choose a pickup first</Text>
        <Button title="Back" onPress={() => router.back()} style={{ marginTop: space.xl, alignSelf: "stretch" }} />
      </SafeAreaView>
    );
  }

  const book = async () => {
    setBooking(true);
    try {
      const res = await api.requestTrip({
        service: chosen.service,
        tripType,
        vehicle: chosen.vehicle,
        pickup,
        drop,
        hours: needsHours(chosen) ? hours : null,
        note,
      });
      try {
        router.dismissAll();
      } catch {
        /* nothing to dismiss */
      }
      router.push(`/trip/${res.trip_id}`);
    } catch (err) {
      showError(err, "Could not book");
    } finally {
      setBooking(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Map pickup={pickup} drop={drop} bottomInset={480} />
      <SafeAreaView edges={["top"]} style={styles.topBar} pointerEvents="box-none">
        <IconButton icon="arrow-back" label="Back" background={colors.white} onPress={() => router.back()} />
        {km != null && (
          <View style={styles.kmPill}>
            <Text style={styles.kmText}>
              {km} km{tripType === "outstation" ? " · Outstation" : ""}
            </Text>
          </View>
        )}
      </SafeAreaView>

      <BottomSheet style={{ maxHeight: "68%" }}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={[font.heading, { marginBottom: space.md }]}>{byHours ? "Book by hours" : "Choose a ride"}</Text>

          {options.map((o) => {
            const active = o.key === selected;
            const eta = etaFor(o);
            return (
              <Pressable
                key={o.key}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                onPress={() => setSelected(o.key)}
                style={[styles.option, active && styles.optionActive]}
              >
                <View style={styles.optionIcon}>
                  <Ionicons name={o.icon} size={30} color={colors.black} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionTitle}>{o.title}</Text>
                  <Text style={font.tiny} numberOfLines={1}>
                    {eta ? `${eta} · ` : ""}
                    {o.hint}
                  </Text>
                </View>
                {loadingFares ? (
                  <ActivityIndicator color={colors.black} />
                ) : (
                  <Text style={styles.optionPrice}>{rupees(fares[o.key])}</Text>
                )}
              </Pressable>
            );
          })}

          {needsHours(chosen) && (
            <View style={{ marginTop: space.sm }}>
              <Text style={[font.small, { marginBottom: space.sm }]}>
                {byHours ? "How many hours? Go to as many places as you like." : "How long do you need the driver?"}
              </Text>
              <Stepper value={hours} onChange={setHours} min={1} max={72} unit="hours" />
            </View>
          )}

          {/* Payment */}
          <View style={styles.payRow}>
            <Ionicons name="cash-outline" size={22} color={colors.green} />
            <Text style={[font.bodyStrong, { flex: 1 }]}>Cash / UPI</Text>
            <Text style={font.small}>Pay driver after trip</Text>
          </View>

          {/* Note */}
          {showNote ? (
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Note for driver, e.g. 2 bags, wait near temple"
              placeholderTextColor={colors.textFaint}
              style={styles.note}
              maxLength={300}
              autoFocus
            />
          ) : (
            <Pressable onPress={() => setShowNote(true)} style={styles.noteRow} accessibilityRole="button">
              <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.textMuted} />
              <Text style={font.small}>Add note for driver</Text>
            </Pressable>
          )}
        </ScrollView>

        <Button
          title={price != null ? `Book ${chosen.title} · ${rupees(price)}` : `Book ${chosen.title}`}
          onPress={book}
          loading={booking}
          disabled={price == null || loadingFares}
          style={{ marginTop: space.md }}
        />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: space.xl, backgroundColor: colors.white },
  topBar: {
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
  kmPill: { backgroundColor: colors.black, borderRadius: radius.pill, paddingHorizontal: space.lg, paddingVertical: space.sm },
  kmText: { color: colors.white, fontWeight: "700", fontSize: 15 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: "transparent",
    marginBottom: space.xs,
  },
  optionActive: { borderColor: colors.black, backgroundColor: colors.surface },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  optionTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
  optionPrice: { fontSize: 19, fontWeight: "800", color: colors.text },
  payRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    marginTop: space.md,
    paddingTop: space.md,
  },
  noteRow: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingVertical: space.md },
  note: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: space.lg,
    minHeight: 50,
    fontSize: 16,
    color: colors.text,
    marginTop: space.md,
  },
});
