import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { Screen, SectionLabel } from "@/components/Screen";
import { showError } from "@/lib/alert";
import * as api from "@/lib/api";
import { useBookingDraft } from "@/lib/draft";
import { rupees, VEHICLE_HINT } from "@/lib/format";
import type { ServiceType, VehicleType } from "@/lib/types";
import { colors, font, radius, space } from "@/theme";

const PACKAGES = [2, 4, 8, 12];

type Option = { key: string; service: ServiceType; vehicle: VehicleType | null; title: string; hint: string; icon: keyof typeof Ionicons.glyphMap };
const OPTIONS: Option[] = [
  { key: "hatchback", service: "car_with_driver", vehicle: "hatchback", title: "Mini", hint: VEHICLE_HINT.hatchback, icon: "car-outline" },
  { key: "sedan", service: "car_with_driver", vehicle: "sedan", title: "Sedan", hint: VEHICLE_HINT.sedan, icon: "car-sport-outline" },
  { key: "suv", service: "car_with_driver", vehicle: "suv", title: "SUV", hint: VEHICLE_HINT.suv, icon: "bus-outline" },
  { key: "driver", service: "driver_only", vehicle: null, title: "Driver only", hint: "For your own car", icon: "person-outline" },
];

/** Rental: keep a car + driver (or just a driver) for a few hours, many stops. */
export default function Rental() {
  const { pickup } = useBookingDraft();
  const [hours, setHours] = useState(4);
  const [selected, setSelected] = useState("hatchback");
  const [fares, setFares] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all(
      OPTIONS.map((o) =>
        api
          .estimateFare({ service: o.service, tripType: "hourly", vehicle: o.vehicle, distanceKm: null, hours })
          .then((f) => [o.key, f] as const)
          .catch(() => [o.key, undefined] as const),
      ),
    )
      .then((pairs) => alive && setFares(Object.fromEntries(pairs.filter(([, f]) => f != null)) as Record<string, number>))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [hours]);

  const chosen = OPTIONS.find((o) => o.key === selected)!;
  const price = fares[chosen.key];

  const book = async () => {
    if (!pickup) return;
    setBooking(true);
    try {
      const res = await api.requestTrip({
        service: chosen.service,
        tripType: "hourly",
        vehicle: chosen.vehicle,
        pickup,
        drop: null,
        hours,
        note: "",
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
    <Screen
      back
      title="Rental"
      subtitle="Keep the driver for a few hours. Go to many places."
      footer={
        <Button
          title={price != null ? `Book ${chosen.title} · ${rupees(price)}` : `Book ${chosen.title}`}
          onPress={book}
          loading={booking}
          disabled={!pickup || price == null || loading}
        />
      }
    >
      <Pressable
        style={styles.pickup}
        onPress={() => router.push("/pick-on-map?field=pickup")}
        accessibilityRole="button"
        accessibilityLabel="Change pickup"
      >
        <View style={styles.dot} />
        <View style={{ flex: 1 }}>
          <Text style={font.tiny}>Pickup</Text>
          <Text style={font.bodyStrong} numberOfLines={1}>
            {pickup?.address ?? "Choose pickup"}
          </Text>
        </View>
        <Text style={styles.change}>Change</Text>
      </Pressable>

      <SectionLabel>How many hours?</SectionLabel>
      <View style={styles.packages}>
        {PACKAGES.map((h) => (
          <Pressable
            key={h}
            onPress={() => setHours(h)}
            accessibilityRole="radio"
            accessibilityState={{ selected: hours === h }}
            style={[styles.pkg, hours === h && styles.pkgActive]}
          >
            <Text style={[styles.pkgHours, hours === h && { color: colors.white }]}>{h}</Text>
            <Text style={[styles.pkgUnit, hours === h && { color: colors.white }]}>hours</Text>
          </Pressable>
        ))}
      </View>

      <SectionLabel>Choose</SectionLabel>
      {OPTIONS.map((o) => {
        const active = o.key === selected;
        return (
          <Pressable
            key={o.key}
            onPress={() => setSelected(o.key)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            style={[styles.option, active && styles.optionActive]}
          >
            <View style={styles.optionIcon}>
              <Ionicons name={o.icon} size={28} color={colors.black} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.optionTitle}>{o.title}</Text>
              <Text style={font.tiny}>{o.hint}</Text>
            </View>
            {loading ? <ActivityIndicator color={colors.black} /> : <Text style={styles.price}>{rupees(fares[o.key])}</Text>}
          </Pressable>
        );
      })}

      <Text style={[font.small, { marginTop: space.md }]}>Go to as many places as you like within these hours.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pickup: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space.lg,
  },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.black },
  change: { fontSize: 15, fontWeight: "700", color: colors.blue },
  packages: { flexDirection: "row", gap: space.sm },
  pkg: {
    flex: 1,
    alignItems: "center",
    paddingVertical: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  pkgActive: { backgroundColor: colors.black },
  pkgHours: { fontSize: 24, fontWeight: "800", color: colors.text },
  pkgUnit: { fontSize: 13, color: colors.textMuted },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    marginBottom: space.sm,
  },
  optionActive: { borderColor: colors.black, backgroundColor: colors.surface },
  optionIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  optionTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
  price: { fontSize: 19, fontWeight: "800", color: colors.text },
});
