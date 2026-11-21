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
import { firstName, mmss, rupees, SERVICE_LABEL, TRIP_LABEL, VEHICLE_LABEL } from "@/lib/format";
import { useOnAppActive, useSecondsLeft } from "@/lib/hooks";
import { getCurrentPosition } from "@/lib/location";
import type { DriverPublic, Trip } from "@/lib/types";
import { colors, font, radius, space } from "@/theme";
import { t } from "@/i18n";

export default function CustomerTrip() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [driver, setDriver] = useState<DriverPublic | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const fresh = await api.getTrip(id);
      if (!fresh) setNotFound(true);
      setTrip(fresh);
    } catch {
      /* keep last known state */
    }
  }, [id]);

  // Initial load + live updates
  useEffect(() => {
    load();
    if (!id) return;
    return api.watchTrip(id, (fresh) => setTrip((old) => ({ ...(old ?? fresh), ...fresh })));
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
        <Text style={font.heading}>{t("Trip not found")}</Text>
        <Button title={t("Go home")} onPress={() => router.replace("/")} style={{ marginTop: space.xl, alignSelf: "stretch" }} />
      </SafeAreaView>
    );
  }
  if (!trip) return <Loading label={t("Loading your trip…")} />;

  const pickup = { lat: trip.pickup_lat, lng: trip.pickup_lng };
  const drop = trip.drop_lat != null && trip.drop_lng != null ? { lat: trip.drop_lat, lng: trip.drop_lng } : null;

  return (
    <View style={{ flex: 1 }}>
      <Map pickup={pickup} drop={drop} bottomInset={360} />
      <SafeAreaView edges={["top"]} style={styles.topBar} pointerEvents="box-none">
        <IconButton icon="close" label={t("Close")} background={colors.white} onPress={() => router.replace("/customer/home")} />
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
  const directName = picked && picked.id === trip.requested_driver_id ? firstName(picked.full_name) : t("the driver");
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
      .then((fresh) => fresh && onChange(fresh))
      .catch(() => undefined)
      .finally(() => {
        setTimeout(() => (widening.current = false), 3000);
      });
  }, [left, trip.id, onChange]);

  const cancel = async () => {
    if (!(await confirm(t("Cancel this request?"), t("Drivers near you will stop seeing it."), t("Cancel request"), true))) return;
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
        {direct ? t("Waiting for {name} to accept", { name: directName }) : t("Finding a driver near you")}
      </Text>
      <Text style={[font.small, styles.centerText, { marginTop: space.xs }]}>
        {direct ? mmss(left) : t("Looking within {km} km · {time}", { km: trip.search_radius_km, time: mmss(left) })}
      </Text>
      <Text style={[font.small, styles.centerText, { marginTop: space.xs }]}>
        {t("You can close the app. We will notify you.")}
      </Text>
      <View style={{ height: space.xl }} />
      <Route pickup={trip.pickup_address} drop={trip.drop_address} dropFallback={trip.hours ? `${trip.hours} hours` : undefined} />
      <View style={{ height: space.xl }} />
      <Button title={t("Cancel request")} variant="secondary" onPress={cancel} loading={cancelling} />
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
    trip.status === "accepted" ? t("Driver is on the way") : trip.status === "arrived" ? t("Driver has arrived") : t("Enjoy your trip");

  const share = async () => {
    const lines = [
      t("I'm on a trip booked with DriverApp."),
      driver ? `${t("Driver")}: ${driver.full_name ?? ""} (${driver.phone ?? ""})` : "",
      driver?.vehicle_number ? `${t("Car")}: ${driver.vehicle_model ?? ""} ${driver.vehicle_number}` : "",
      `${t("From")}: ${trip.pickup_address}`,
      trip.drop_address ? `${t("To")}: ${trip.drop_address}` : "",
    ].filter(Boolean);
    try {
      await Share.share({ message: lines.join("\n") });
    } catch {
      /* ignore */
    }
  };

  const sos = async () => {
    Alert.alert(t("Emergency?"), t("We will alert our team. You can also call 112 (police / ambulance)."), [
      { text: t("Close"), style: "cancel" },
      {
        text: t("Alert team"),
        onPress: async () => {
          try {
            const pos = await getCurrentPosition().catch(() => undefined);
            await api.triggerSos(trip.id, pos);
            Alert.alert("Team alerted", t("We will call you right away."));
          } catch (err) {
            showError(err);
          }
        },
      },
      { text: t("Call 112"), style: "destructive", onPress: () => Linking.openURL("tel:112") },
    ]);
  };

  const cancel = async () => {
    if (!(await confirm(t("Cancel this trip?"), t("The driver is already coming for you."), t("Cancel trip"), true))) return;
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
        <Text style={[font.small, { marginBottom: space.sm }]}>
          {trip.customer_offer
            ? t("Your offer: {price}. Call your driver to confirm.", { price: rupees(trip.customer_offer) })
            : t("Call your driver to confirm the price and time.")}
        </Text>
      )}
      {trip.status === "arrived" && (
        <Text style={[font.small, { marginBottom: space.md }]}>{t("Please meet your driver at the pickup point.")}</Text>
      )}

      {pin && (
        <View style={styles.pinBox} accessibilityLabel={t("Your ride PIN is {pin}", { pin: pin.split("").join(" ") })}>
          <View style={{ flex: 1 }}>
            <Text style={font.bodyStrong}>{t("Your ride PIN")}</Text>
            <Text style={font.tiny}>{t("Tell this to the driver to start the trip")}</Text>
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
          <Text style={font.subheading}>{driver?.full_name ?? t("Your driver")}</Text>
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
        <IconButton icon="call" label={t("Call driver")} background={colors.black} color={colors.white} size={54} onPress={() => callNumber(driver?.phone)} />
      </View>

      <View style={styles.actions}>
        <Button title={t("Share trip")} icon="share-social-outline" variant="secondary" size="md" onPress={share} style={{ flex: 1 }} />
        <Button title={t("SOS")} icon="alert-circle" variant="danger" size="md" onPress={sos} style={{ flex: 1 }} />
      </View>

      <Route pickup={trip.pickup_address} drop={trip.drop_address} dropFallback={trip.hours ? `${trip.hours} hours` : undefined} />

      {trip.status !== "started" && (
        <Button title={t("Cancel trip")} variant="ghost" size="md" onPress={cancel} loading={cancelling} style={{ marginTop: space.md }} />
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
      <Text style={[font.heading, styles.centerText]}>{t("Trip completed")}</Text>
      <Text style={[font.small, styles.centerText, { marginTop: space.xs }]}>{t("Pay your driver the agreed price by cash or UPI.")}</Text>

      <InfoRow icon="car-outline" label={t("Trip")} value={`${SERVICE_LABEL[trip.service_type]} · ${TRIP_LABEL[trip.trip_type]}`} />

      {done === false ? (
        <>
          <Text style={[font.subheading, styles.centerText, { marginTop: space.lg, marginBottom: space.md }]}>
            {t("How was {name}?", { name: driver?.full_name?.split(" ")[0] ?? t("your driver") })}
          </Text>
          <Stars value={stars} onChange={setStars} />
          {stars > 0 && (
            <View style={{ marginTop: space.lg }}>
              <Field value={comment} onChangeText={setComment} placeholder={t("Anything to tell us? (optional)")} maxLength={500} />
            </View>
          )}
          <Button title={t("Submit")} onPress={submit} loading={saving} disabled={stars === 0} style={{ marginTop: space.md }} />
          <Button title={t("Skip")} variant="ghost" size="md" onPress={() => router.replace("/customer/home")} />
        </>
      ) : (
        <Button title={t("Done")} onPress={() => router.replace("/customer/home")} style={{ marginTop: space.lg }} />
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
        {expired ? (direct ? t("The driver didn't answer") : t("No driver free right now")) : byDriver ? t("Driver cancelled") : t("Trip cancelled")}
      </Text>
      <Text style={[font.small, styles.centerText, { marginTop: space.sm }]}>
        {expired
          ? direct
            ? t("They may be driving. Please choose another free driver.")
            : t("All drivers near you are busy. Please try again in a few minutes.")
          : byDriver
            ? t("Sorry about that. Please choose another driver.")
            : t("This trip was cancelled.")}
      </Text>
      <Button title={t("Choose another driver")} onPress={() => router.replace("/customer/home")} style={{ marginTop: space.xl }} />
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
