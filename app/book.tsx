import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { OptionCard, Segmented, Stepper } from "@/components/Choice";
import { Field } from "@/components/Field";
import { PlaceInput } from "@/components/PlaceInput";
import { Screen, SectionLabel } from "@/components/Screen";
import { showError } from "@/lib/alert";
import * as api from "@/lib/api";
import { rupees, SERVICE_LABEL, TRIP_LABEL, VEHICLE_HINT, VEHICLE_LABEL } from "@/lib/format";
import { addressFor, getCurrentPosition, roadKm } from "@/lib/location";
import type { Place, ServiceType, TripType, VehicleType } from "@/lib/types";
import { colors, font, radius, space } from "@/theme";

const VEHICLES: VehicleType[] = ["hatchback", "sedan", "suv"];
const DEFAULT_HOURS: Record<TripType, number> = { local: 4, outstation: 12, hourly: 4 };

export default function Book() {
  const params = useLocalSearchParams<{ service?: string }>();
  const service: ServiceType = params.service === "driver_only" ? "driver_only" : "car_with_driver";
  const isCar = service === "car_with_driver";

  const [tripType, setTripType] = useState<TripType>("local");
  const [pickup, setPickup] = useState<Place | null>(null);
  const [pickupKey, setPickupKey] = useState(0);
  const [locating, setLocating] = useState(false);
  const [drop, setDrop] = useState<Place | null>(null);
  const [hours, setHours] = useState(DEFAULT_HOURS.local);
  const [vehicle, setVehicle] = useState<VehicleType>("hatchback");
  const [note, setNote] = useState("");
  const [fares, setFares] = useState<Partial<Record<VehicleType | "any", number>>>({});
  const [fareLoading, setFareLoading] = useState(false);
  const [booking, setBooking] = useState(false);

  // Hours are needed for driver-only trips and for car trips "by hours".
  const needsHours = !isCar || tripType === "hourly";
  // Drop is needed for car trips in town / outstation.
  const needsDrop = isCar && tripType !== "hourly";

  const useMyLocation = useCallback(async () => {
    setLocating(true);
    try {
      const pos = await getCurrentPosition();
      const address = await addressFor(pos);
      setPickup({ ...pos, address });
      setPickupKey((k) => k + 1);
    } catch (err) {
      showError(err, "Location needed");
    } finally {
      setLocating(false);
    }
  }, []);

  useEffect(() => {
    useMyLocation();
  }, [useMyLocation]);

  useEffect(() => {
    setHours(DEFAULT_HOURS[tripType]);
  }, [tripType]);

  const distanceKm = useMemo(() => (pickup && drop ? roadKm(pickup, drop) : null), [pickup, drop]);

  // Fetch prices whenever the booking details change.
  useEffect(() => {
    let alive = true;
    const ready = needsDrop ? distanceKm != null : true;
    if (!ready) {
      setFares({});
      return;
    }
    setFareLoading(true);
    const keys: (VehicleType | null)[] = isCar ? VEHICLES : [null];
    Promise.all(
      keys.map((v) =>
        api
          .estimateFare({ service, tripType, vehicle: v, distanceKm, hours: needsHours ? hours : null })
          .then((f) => [v ?? "any", f] as const)
          .catch(() => [v ?? "any", undefined] as const),
      ),
    )
      .then((pairs) => {
        if (alive) setFares(Object.fromEntries(pairs.filter(([, f]) => f != null)));
      })
      .finally(() => alive && setFareLoading(false));
    return () => {
      alive = false;
    };
  }, [service, isCar, tripType, distanceKm, hours, needsHours, needsDrop]);

  const fare = isCar ? fares[vehicle] : fares.any;
  const canBook = !!pickup && (!needsDrop || !!drop) && fare != null && !booking;

  const submit = async () => {
    if (!pickup) return;
    setBooking(true);
    try {
      const res = await api.requestTrip({
        service,
        tripType,
        vehicle: isCar ? vehicle : null,
        pickup,
        drop,
        hours: needsHours ? hours : null,
        note,
      });
      router.replace(`/trip/${res.trip_id}`);
    } catch (err) {
      showError(err, "Could not book");
    } finally {
      setBooking(false);
    }
  };

  return (
    <Screen
      back
      title={SERVICE_LABEL[service]}
      subtitle={isCar ? "We send a car with a driver." : "A driver comes to drive your car."}
      footer={
        <View>
          <View style={styles.total}>
            <View>
              <Text style={font.small}>Estimated price</Text>
              <Text style={font.tiny}>Pay the driver by cash or UPI</Text>
            </View>
            {fareLoading ? <ActivityIndicator color={colors.black} /> : <Text style={font.price}>{rupees(fare)}</Text>}
          </View>
          <Button title="Book now" onPress={submit} loading={booking} disabled={!canBook} />
        </View>
      }
    >
      <Segmented
        value={tripType}
        onChange={setTripType}
        options={(Object.keys(TRIP_LABEL) as TripType[]).map((t) => ({ value: t, label: TRIP_LABEL[t] }))}
      />
      <View style={{ height: space.xl }} />

      <PlaceInput
        key={`pickup-${pickupKey}`}
        label="Pickup"
        marker="dot"
        value={pickup}
        onChange={setPickup}
        near={pickup}
        placeholder={locating ? "Finding your location…" : "Where should the driver come?"}
        right={
          <Pressable onPress={useMyLocation} hitSlop={10} accessibilityRole="button" accessibilityLabel="Use my current location">
            <Ionicons name="locate" size={24} color={colors.black} />
          </Pressable>
        }
      />

      {(needsDrop || !isCar) && (
        <PlaceInput
          label={needsDrop ? "Drop" : "Going to (optional)"}
          marker="square"
          value={drop}
          onChange={setDrop}
          near={pickup}
          placeholder={tripType === "outstation" ? "Which town?" : "Where to?"}
        />
      )}

      {distanceKm != null && (
        <Text style={[font.small, { marginBottom: space.md }]}>About {distanceKm} km by road</Text>
      )}

      {needsHours && (
        <>
          <SectionLabel>How long do you need the driver?</SectionLabel>
          <Stepper value={hours} onChange={setHours} min={1} max={tripType === "outstation" ? 72 : 24} unit="hours" />
        </>
      )}

      {isCar && (
        <>
          <SectionLabel>Choose car</SectionLabel>
          {VEHICLES.map((v) => (
            <OptionCard
              key={v}
              icon={v === "suv" ? "bus-outline" : "car-outline"}
              title={VEHICLE_LABEL[v]}
              subtitle={VEHICLE_HINT[v]}
              selected={vehicle === v}
              onPress={() => setVehicle(v)}
              right={<Text style={styles.cardPrice}>{fares[v] != null ? rupees(fares[v]) : needsDrop && !drop ? "" : "—"}</Text>}
            />
          ))}
        </>
      )}

      <SectionLabel>Note for driver (optional)</SectionLabel>
      <Field
        value={note}
        onChangeText={setNote}
        placeholder={isCar ? "e.g. 2 bags, wait near temple" : "e.g. Automatic car, going to Vijayawada"}
        maxLength={300}
        multiline
      />

      <View style={styles.info}>
        <Ionicons name="information-circle-outline" size={20} color={colors.textMuted} />
        <Text style={[font.small, { flex: 1 }]}>
          Your request goes to all free drivers near you. The first one to accept gets the trip.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  total: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: space.md,
  },
  cardPrice: { fontSize: 18, fontWeight: "800", color: colors.text },
  info: {
    flexDirection: "row",
    gap: space.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space.md,
  },
});
