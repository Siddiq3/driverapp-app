import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, Linking, Modal, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, IconButton } from "@/components/Button";
import { Map } from "@/components/Map";
import { Loading } from "@/components/Screen";
import { BottomSheet } from "@/components/Sheet";
import { Avatar, Route, Stars } from "@/components/TripBits";
import { callNumber, confirm, navigateTo, showError } from "@/lib/alert";
import * as api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { rupees, SERVICE_LABEL, TRIP_LABEL, VEHICLE_LABEL } from "@/lib/format";
import { useOnAppActive } from "@/lib/hooks";
import { getCurrentPosition } from "@/lib/location";
import type { Trip, TripPerson } from "@/lib/types";
import { colors, font, radius, space } from "@/theme";

const NEXT: Partial<Record<Trip["status"], { status: "arrived" | "started" | "completed"; label: string; ask: string }>> = {
  accepted: { status: "arrived", label: "I have arrived", ask: "Are you at the pickup point?" },
  arrived: { status: "started", label: "Start trip", ask: "" }, // needs the customer's PIN
  started: { status: "completed", label: "Complete trip", ask: "Have you reached and finished the trip?" },
};

export default function DriverTrip() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { refresh } = useAuth();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [customer, setCustomer] = useState<TripPerson | null>(null);
  const [busy, setBusy] = useState(false);
  const [askPin, setAskPin] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setTrip(await api.getTrip(id));
    } catch {
      /* keep last state */
    }
  }, [id]);

  useEffect(() => {
    load();
    if (!id) return;
    return api.watchTrip(id, (t) => setTrip((old) => ({ ...(old ?? t), ...t })));
  }, [id, load]);
  useOnAppActive(load);

  useEffect(() => {
    if (trip?.customer_id && trip.customer_id !== customer?.id) {
      api.getPerson(trip.customer_id).then(setCustomer).catch(() => undefined);
    }
  }, [trip?.customer_id, customer?.id]);

  if (!trip) return <Loading label="Loading trip…" />;

  const pickup = { lat: trip.pickup_lat, lng: trip.pickup_lng };
  const drop = trip.drop_lat != null && trip.drop_lng != null ? { lat: trip.drop_lat, lng: trip.drop_lng } : null;
  const next = NEXT[trip.status];
  // Before the trip starts, navigate to pickup; after, to the drop.
  const navTarget = trip.status === "started" && drop ? drop : pickup;

  const advance = async () => {
    if (!next) return;
    if (next.status === "started") {
      setAskPin(true);
      return;
    }
    if (!(await confirm(next.label, next.ask, "Yes"))) return;
    setBusy(true);
    try {
      await api.updateTripStatus(trip.id, next.status);
      await load();
    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  };

  const startWithPin = async (pin: string) => {
    setBusy(true);
    try {
      await api.updateTripStatus(trip.id, "started", pin);
      setAskPin(false);
      await load();
    } catch (err) {
      showError(err, "Could not start");
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (!(await confirm("Cancel this trip?", "The customer is waiting for you. Cancel only if you really cannot come.", "Cancel trip", true))) return;
    setBusy(true);
    try {
      await api.cancelTrip(trip.id, "Driver cancelled");
      await refresh();
      router.replace("/driver/home");
    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  };

  const sos = () => {
    Alert.alert("Emergency?", "We will alert our team. You can also call 112.", [
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

  const live = trip.status === "accepted" || trip.status === "arrived" || trip.status === "started";

  return (
    <View style={{ flex: 1 }}>
      <Map pickup={pickup} drop={drop} bottomInset={380} />
      <SafeAreaView edges={["top"]} style={styles.topBar} pointerEvents="box-none">
        <IconButton icon="arrow-back" label="Back" background={colors.white} onPress={() => router.replace("/driver/home")} />
        {live && <IconButton icon="alert-circle" label="SOS" background={colors.red} color={colors.white} onPress={sos} />}
      </SafeAreaView>

      <BottomSheet>
        {live && (
          <View>
            <View style={styles.headRow}>
              <Text style={font.heading}>
                {trip.status === "accepted" ? "Go to pickup" : trip.status === "arrived" ? "Waiting for customer" : "On trip"}
              </Text>
            </View>
            <Text style={[font.small, { marginBottom: space.md }]}>
              {[
                SERVICE_LABEL[trip.service_type],
                TRIP_LABEL[trip.trip_type],
                trip.vehicle_type ? VEHICLE_LABEL[trip.vehicle_type] : null,
                trip.hours ? `${trip.hours} hrs` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </Text>

            <View style={styles.personCard}>
              <Avatar name={customer?.full_name} url={customer?.avatar_url} size={52} />
              <View style={{ flex: 1 }}>
                <Text style={font.subheading}>{customer?.full_name ?? "Customer"}</Text>
                <Text style={font.small}>
                  {trip.customer_offer ? `Offered ${rupees(trip.customer_offer)} · confirm on call` : "Your prices · confirm on call"}
                </Text>
              </View>
              <IconButton icon="call" label="Call customer" background={colors.black} color={colors.white} size={52} onPress={() => callNumber(customer?.phone)} />
            </View>

            <Route pickup={trip.pickup_address} drop={trip.drop_address} dropFallback={trip.hours ? `${trip.hours} hours of driving` : undefined} />

            {trip.customer_note && (
              <View style={styles.note}>
                <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.textMuted} />
                <Text style={[font.small, { flex: 1, color: colors.text }]}>{trip.customer_note}</Text>
              </View>
            )}

            <View style={styles.row}>
              <Button
                title={trip.status === "started" && drop ? "Navigate to drop" : "Navigate to pickup"}
                icon="navigate"
                variant="secondary"
                size="md"
                onPress={() => navigateTo(navTarget.lat, navTarget.lng)}
                style={{ flex: 1 }}
              />
            </View>

            {next && (
              <Button
                title={next.label}
                variant={next.status === "completed" ? "success" : "primary"}
                onPress={advance}
                loading={busy}
                style={{ marginTop: space.sm }}
              />
            )}
            {trip.status !== "started" && (
              <Button title="Cancel trip" variant="ghost" size="md" onPress={cancel} disabled={busy} />
            )}
          </View>
        )}

        {trip.status === "completed" && <RateCustomer trip={trip} customer={customer} />}

        {askPin && <PinPrompt busy={busy} onCancel={() => setAskPin(false)} onSubmit={startWithPin} />}

        {(trip.status === "cancelled" || trip.status === "expired" || trip.status === "searching") && (
          <View>
            <Text style={[font.heading, { textAlign: "center" }]}>
              {trip.status === "cancelled"
                ? trip.cancelled_by === trip.driver_id
                  ? "You cancelled this trip"
                  : "Customer cancelled the trip"
                : "This trip is no longer available"}
            </Text>
            <Button title="Back to home" onPress={() => router.replace("/driver/home")} style={{ marginTop: space.xl }} />
          </View>
        )}
      </BottomSheet>
    </View>
  );
}

/** Driver types the customer's 4-digit PIN to start the trip. */
function PinPrompt({ busy, onCancel, onSubmit }: { busy: boolean; onCancel: () => void; onSubmit: (pin: string) => void }) {
  const [pin, setPin] = useState("");
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalBack}>
        <View style={styles.modalCard}>
          <Text style={[font.heading, { textAlign: "center" }]}>Enter ride PIN</Text>
          <Text style={[font.small, { textAlign: "center", marginTop: space.xs }]}>
            Ask the customer for the 4-digit PIN in their app.
          </Text>
          <TextInput
            value={pin}
            onChangeText={(t) => setPin(t.replace(/\D/g, "").slice(0, 4))}
            keyboardType="number-pad"
            maxLength={4}
            autoFocus
            style={styles.pinInput}
            placeholder="• • • •"
            placeholderTextColor={colors.textFaint}
            accessibilityLabel="Ride PIN"
            onSubmitEditing={() => pin.length === 4 && onSubmit(pin)}
          />
          <Button title="Start trip" onPress={() => onSubmit(pin)} loading={busy} disabled={pin.length !== 4} />
          <Button title="Cancel" variant="ghost" size="md" onPress={onCancel} disabled={busy} />
        </View>
      </View>
    </Modal>
  );
}

function RateCustomer({ trip, customer }: { trip: Trip; customer: TripPerson | null }) {
  const { refresh } = useAuth();
  const [stars, setStars] = useState(0);
  const [done, setDone] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.hasRated(trip.id).then(setDone).catch(() => setDone(false));
  }, [trip.id]);

  /** After a trip, offer to go Free again straight away. */
  const finish = async (goFree: boolean) => {
    setBusy(true);
    try {
      if (stars > 0 && !done) await api.rateTrip(trip.id, stars);
      if (goFree) {
        const pos = await getCurrentPosition();
        await api.setAvailability(true, pos);
      }
      await refresh();
      router.replace("/driver/home");
    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <View style={styles.doneIcon}>
        <Ionicons name="checkmark" size={36} color={colors.white} />
      </View>
      <Text style={[font.heading, { textAlign: "center" }]}>Trip completed</Text>
      <Text style={[font.small, { textAlign: "center", marginTop: space.xs }]}>Collect the agreed price by cash or UPI.</Text>

      {done === false && (
        <>
          <Text style={[font.subheading, { textAlign: "center", marginVertical: space.md }]}>
            Rate {customer?.full_name?.split(" ")[0] ?? "the customer"}
          </Text>
          <Stars value={stars} onChange={setStars} />
        </>
      )}

      <Button title="Go free for next trip" variant="success" onPress={() => finish(true)} loading={busy} style={{ marginTop: space.xl }} />
      <Button title="Stay busy" variant="ghost" size="md" onPress={() => finish(false)} disabled={busy} />
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
  },
  headRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  fare: { fontSize: 22, fontWeight: "800", color: colors.text },
  personCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space.lg,
    marginBottom: space.lg,
  },
  note: {
    flexDirection: "row",
    gap: space.sm,
    marginTop: space.md,
    backgroundColor: colors.surface,
    padding: space.md,
    borderRadius: radius.sm,
  },
  row: { flexDirection: "row", gap: space.sm, marginTop: space.lg },
  modalBack: { flex: 1, backgroundColor: colors.overlay, justifyContent: "center", padding: space.xl },
  modalCard: { backgroundColor: colors.white, borderRadius: radius.lg, padding: space.xl },
  pinInput: {
    fontSize: 40,
    fontWeight: "800",
    letterSpacing: 16,
    textAlign: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginVertical: space.xl,
    paddingVertical: space.md,
    color: colors.text,
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
