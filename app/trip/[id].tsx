import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Linking, Share, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, IconButton } from "@/components/Button";
import { Field } from "@/components/Field";
import { Map } from "@/components/Map";
import { Pulse } from "@/components/Pulse";
import { Loading } from "@/components/Screen";
import { BottomSheet } from "@/components/Sheet";
import { AdBanner } from "@/components/AdBanner";
import { Avatar, InfoRow, RatingText, Route, Stars } from "@/components/TripBits";
import { chosen } from "@/lib/draft";
import { callNumber, confirm, showError } from "@/lib/alert";
import * as api from "@/lib/api";
import { firstName, mmss, SERVICE_LABEL, TRIP_LABEL, VEHICLE_LABEL } from "@/lib/format";
import { useOnAppActive, useSecondsLeft } from "@/lib/hooks";
import { getCurrentPosition } from "@/lib/location";
import type { DriverPublic, Trip } from "@/lib/types";
import { colors, font, radius, space } from "@/theme";

export default function CustomerTrip() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [driver, setDriver] = useState<DriverPublic | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const t = await api.getTrip(id);
      if (!t) setNotFound(true);
      setTrip(t);
    } catch {
      /* keep last known state */
    }
  }, [id]);

  // Initial load + live updates
  useEffect(() => {
    load();
    if (!id) return;
    return api.watchTrip(id, (t) => setTrip((old) => ({ ...(old ?? t), ...t })));
  }, [id, load]);
  useOnAppActive(load);

  // Load driver details once a driver is assigned
  useEffect(() => {
    if (trip?.driver_id && trip.driver_id !== driver?.id) {
      api.getTripDriver(trip.driver_id).then(setDriver).catch(() => undefined);
    }
  }, [trip?.driver_id, driver?.id]);

  if (notFound) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={font.heading}>Trip not found</Text>
        <Button title="Go home" onPress={() => router.replace("/")} style={{ marginTop: space.xl, alignSelf: "stretch" }} />
      </SafeAreaView>
    );
  }
  if (!trip) return <Loading label="Loading your trip…" />;

  const pickup = { lat: trip.pickup_lat, lng: trip.pickup_lng };
  const drop = trip.drop_lat != null && trip.drop_lng != null ? { lat: trip.drop_lat, lng: trip.drop_lng } : null;

  return (
    <View style={{ flex: 1 }}>
      <Map pickup={pickup} drop={drop} bottomInset={360} />
      <SafeAreaView edges={["top"]} style={styles.topBar} pointerEvents="box-none">
        <IconButton icon="close" label="Close" background={colors.white} onPress={() => router.replace("/customer/home")} />
      </SafeAreaView>

      <BottomSheet>
        {trip.status === "searching" && <Searching trip={trip} onChange={setTrip} />}
        {(trip.status === "accepted" || trip.status === "arrived" || trip.status === "started") && (
          <OnTrip trip={trip} driver={driver} />
        )}
        {trip.status === "completed" && <Completed trip={trip} driver={driver} />}
        {(trip.status === "cancelled" || trip.status === "expired") && <Ended trip={trip} />}
      </BottomSheet>
    </View>
  );
}

// ---------------------------------------------------------------------------

function Searching({ trip, onChange }: { trip: Trip; onChange: (t: Trip) => void }) {
  const direct = !!trip.requested_driver_id;
  const picked = chosen.get();
  const directName = picked && picked.id === trip.requested_driver_id ? firstName(picked.full_name) : "the driver";
  const left = useSecondsLeft(trip.expires_at);
  const [cancelling, setCancelling] = useState(false);
  const widening = useRef(false);

  // When time runs out, search a wider area (5 → 10 → 20 km), then give up.
  useEffect(() => {
    if (left > 0 || widening.current) return;
    widening.current = true;
    api
      .widenSearch(trip.id)
      .then(() => api.getTrip(trip.id))
      .then((t) => t && onChange(t))
      .catch(() => undefined)
      .finally(() => {
        setTimeout(() => (widening.current = false), 3000);
      });
  }, [left, trip.id, onChange]);

  const cancel = async () => {
    if (!(await confirm("Cancel this request?", "Drivers near you will stop seeing it.", "Cancel request", true))) return;
    setCancelling(true);
    try {
      await api.cancelTrip(trip.id, "Customer cancelled while searching");
      router.replace("/customer/home");
    } catch (err) {
      showError(err);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <View>
      <Pulse icon={trip.service_type === "driver_only" ? "person" : "car"} />
      <Text style={[font.heading, styles.centerText]}>
        {direct ? `Waiting for ${directName} to accept` : "Finding a driver near you"}
      </Text>
      <Text style={[font.small, styles.centerText, { marginTop: space.xs }]}>
        {direct ? mmss(left) : `Looking within ${trip.search_radius_km} km · ${mmss(left)}`}
      </Text>
      <Text style={[font.small, styles.centerText, { marginTop: space.xs }]}>
        You can close the app. We will notify you.
      </Text>
      <View style={{ height: space.xl }} />
      <Route pickup={trip.pickup_address} drop={trip.drop_address} dropFallback={trip.hours ? `${trip.hours} hours` : undefined} />
      <View style={{ height: space.xl }} />
      <Button title="Cancel request" variant="secondary" onPress={cancel} loading={cancelling} />
      <AdBanner />
    </View>
  );
}

function OnTrip({ trip, driver }: { trip: Trip; driver: DriverPublic | null }) {
  const [cancelling, setCancelling] = useState(false);
  const [pin, setPin] = useState<string | null>(null);

  // Ride PIN: the driver needs it to start the trip (like Uber / Rapido)
  useEffect(() => {
    if (trip.status === "accepted" || trip.status === "arrived") {
      api.getTripPin(trip.id).then(setPin).catch(() => undefined);
    } else {
      setPin(null);
    }
  }, [trip.id, trip.status]);

  const headline =
    trip.status === "accepted" ? "Driver is on the way" : trip.status === "arrived" ? "Driver has arrived" : "Enjoy your trip";

  const share = async () => {
    const lines = [
      `I'm on a trip booked with DriverApp.`,
      driver ? `Driver: ${driver.full_name ?? ""} (${driver.phone ?? ""})` : "",
      driver?.vehicle_number ? `Car: ${driver.vehicle_model ?? ""} ${driver.vehicle_number}` : "",
      `From: ${trip.pickup_address}`,
      trip.drop_address ? `To: ${trip.drop_address}` : "",
    ].filter(Boolean);
    try {
      await Share.share({ message: lines.join("\n") });
    } catch {
      /* ignore */
    }
  };

  const sos = async () => {
    Alert.alert("Emergency?", "We will alert our team. You can also call 112 (police / ambulance).", [
      { text: "Close", style: "cancel" },
      {
        text: "Alert team",
        onPress: async () => {
          try {
            const pos = await getCurrentPosition().catch(() => undefined);
            await api.triggerSos(trip.id, pos);
            Alert.alert("Team alerted", "We will call you right away.");
          } catch (err) {
            showError(err);
          }
        },
      },
      { text: "Call 112", style: "destructive", onPress: () => Linking.openURL("tel:112") },
    ]);
  };

  const cancel = async () => {
    if (!(await confirm("Cancel this trip?", "The driver is already coming for you.", "Cancel trip", true))) return;
    setCancelling(true);
    try {
      await api.cancelTrip(trip.id, "Customer cancelled after driver accepted");
      router.replace("/customer/home");
    } catch (err) {
      showError(err);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <View>
      <View style={styles.statusRow}>
        <Text style={font.heading}>{headline}</Text>
      </View>
      {trip.status === "accepted" && (
        <Text style={[font.small, { marginBottom: space.sm }]}>Call your driver to agree on the price and time.</Text>
      )}
      {trip.status === "arrived" && (
        <Text style={[font.small, { marginBottom: space.md }]}>Please meet your driver at the pickup point.</Text>
      )}

      {pin && (
        <View style={styles.pinBox} accessibilityLabel={`Your ride PIN is ${pin.split("").join(" ")}`}>
          <View style={{ flex: 1 }}>
            <Text style={font.bodyStrong}>Your ride PIN</Text>
            <Text style={font.tiny}>Tell this to the driver to start the trip</Text>
          </View>
          <View style={styles.pinDigits}>
            {pin.split("").map((d, i) => (
              <Text key={i} style={styles.pinDigit}>
                {d}
              </Text>
            ))}
          </View>
        </View>
      )}

      <View style={styles.driverCard}>
        <Avatar name={driver?.full_name} url={driver?.avatar_url} size={60} />
        <View style={{ flex: 1 }}>
          <Text style={font.subheading}>{driver?.full_name ?? "Your driver"}</Text>
          {driver && <RatingText avg={driver.rating_avg} count={driver.rating_count} />}
          {trip.service_type === "car_with_driver" && driver?.vehicle_number && (
            <View style={styles.plateRow}>
              <Text style={styles.plate}>{driver.vehicle_number}</Text>
              <Text style={font.small} numberOfLines={1}>
                {driver.vehicle_model ?? VEHICLE_LABEL[driver.vehicle_type ?? "hatchback"]}
              </Text>
            </View>
          )}
        </View>
        <IconButton icon="call" label="Call driver" background={colors.black} color={colors.white} size={54} onPress={() => callNumber(driver?.phone)} />
      </View>

      <View style={styles.actions}>
        <Button title="Share trip" icon="share-social-outline" variant="secondary" size="md" onPress={share} style={{ flex: 1 }} />
        <Button title="SOS" icon="alert-circle" variant="danger" size="md" onPress={sos} style={{ flex: 1 }} />
      </View>

      <Route pickup={trip.pickup_address} drop={trip.drop_address} dropFallback={trip.hours ? `${trip.hours} hours` : undefined} />

      {trip.status !== "started" && (
        <Button title="Cancel trip" variant="ghost" size="md" onPress={cancel} loading={cancelling} style={{ marginTop: space.md }} />
      )}
    </View>
  );
}

function Completed({ trip, driver }: { trip: Trip; driver: DriverPublic | null }) {
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<boolean | null>(null);

  useEffect(() => {
    api.hasRated(trip.id).then(setDone).catch(() => setDone(false));
  }, [trip.id]);

  const submit = async () => {
    setSaving(true);
    try {
      await api.rateTrip(trip.id, stars, comment);
      router.replace("/customer/home");
    } catch (err) {
      showError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View>
      <View style={styles.doneIcon}>
        <Ionicons name="checkmark" size={36} color={colors.white} />
      </View>
      <Text style={[font.heading, styles.centerText]}>Trip completed</Text>
      <Text style={[font.small, styles.centerText, { marginTop: space.xs }]}>Pay your driver the agreed price by cash or UPI.</Text>

      <InfoRow icon="car-outline" label="Trip" value={`${SERVICE_LABEL[trip.service_type]} · ${TRIP_LABEL[trip.trip_type]}`} />

      {done === false ? (
        <>
          <Text style={[font.subheading, styles.centerText, { marginTop: space.lg, marginBottom: space.md }]}>
            How was {driver?.full_name?.split(" ")[0] ?? "your driver"}?
          </Text>
          <Stars value={stars} onChange={setStars} />
          {stars > 0 && (
            <View style={{ marginTop: space.lg }}>
              <Field value={comment} onChangeText={setComment} placeholder="Anything to tell us? (optional)" maxLength={500} />
            </View>
          )}
          <Button title="Submit" onPress={submit} loading={saving} disabled={stars === 0} style={{ marginTop: space.md }} />
          <Button title="Skip" variant="ghost" size="md" onPress={() => router.replace("/customer/home")} />
        </>
      ) : (
        <Button title="Done" onPress={() => router.replace("/customer/home")} style={{ marginTop: space.lg }} />
      )}
    </View>
  );
}

function Ended({ trip }: { trip: Trip }) {
  const expired = trip.status === "expired";
  const direct = !!trip.requested_driver_id;
  const byDriver = trip.status === "cancelled" && trip.cancelled_by === trip.driver_id;
  return (
    <View>
      <View style={[styles.doneIcon, { backgroundColor: colors.surface }]}>
        <Ionicons name={expired ? "time-outline" : "close"} size={36} color={colors.black} />
      </View>
      <Text style={[font.heading, styles.centerText]}>
        {expired ? (direct ? "The driver didn't answer" : "No driver free right now") : byDriver ? "Driver cancelled" : "Trip cancelled"}
      </Text>
      <Text style={[font.small, styles.centerText, { marginTop: space.sm }]}>
        {expired
          ? direct
            ? "They may be driving. Please choose another free driver."
            : "All drivers near you are busy. Please try again in a few minutes."
          : byDriver
            ? "Sorry about that. Please choose another driver."
            : "This trip was cancelled."}
      </Text>
      <Button title="Choose another driver" onPress={() => router.replace("/customer/home")} style={{ marginTop: space.xl }} />
      <AdBanner />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: space.xl, backgroundColor: colors.white },
  topBar: { position: "absolute", top: 0, left: 0, right: 0, paddingHorizontal: space.lg, paddingTop: space.sm },
  centerText: { textAlign: "center" },
  statusRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: space.sm },
  fare: { fontSize: 22, fontWeight: "800", color: colors.text },
  driverCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space.lg,
    marginVertical: space.md,
  },
  plateRow: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: 4 },
  plate: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.black,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.black,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    letterSpacing: 0.5,
  },
  actions: { flexDirection: "row", gap: space.sm, marginBottom: space.lg },
  pinBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    borderWidth: 2,
    borderColor: colors.black,
    borderRadius: radius.md,
    padding: space.md,
  },
  pinDigits: { flexDirection: "row", gap: 6 },
  pinDigit: {
    width: 36,
    height: 44,
    borderRadius: 6,
    backgroundColor: colors.black,
    color: colors.white,
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 44,
    overflow: "hidden",
  },
  doneIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: space.md,
  },
});
