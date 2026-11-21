import { Ionicons } from "@expo/vector-icons";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { Screen, SectionLabel } from "@/components/Screen";
import { Avatar, RatingText } from "@/components/TripBits";
import { showError } from "@/lib/alert";
import * as api from "@/lib/api";
import { chosen, useBookingDraft } from "@/lib/draft";
import { firstName, parseRupees, ratesText, VEHICLE_LABEL } from "@/lib/format";
import { colors, font, radius, space } from "@/theme";

/** Send a request to the one driver the customer picked from the "free near you" list. */
export default function RequestDriver() {
  const params = useLocalSearchParams<{ kind?: string }>();
  const driver = chosen.get();
  const { pickup } = useBookingDraft();
  const wantsCar = params.kind !== "driver" && !!driver?.has_car;

  const [where, setWhere] = useState("");
  const [note, setNote] = useState("");
  const [offer, setOffer] = useState("");
  const [sending, setSending] = useState(false);

  if (!driver) return <Redirect href="/customer/home" />;

  const name = firstName(driver.full_name);
  const prices = ratesText({
    rate_per_km: wantsCar ? driver.rate_per_km : null,
    rate_per_hour: driver.rate_per_hour,
    rate_per_day: driver.rate_per_day,
  });
  const offerValue = parseRupees(offer);
  const offerError = offer.trim() && (offerValue == null || offerValue < 50) ? "Enter at least ₹50" : null;

  const send = async () => {
    if (!pickup || offerError) return;
    setSending(true);
    try {
      const details = [where.trim() ? `Going to: ${where.trim()}` : null, note.trim() || null].filter(Boolean).join(" · ");
      const res = await api.requestTrip({
        service: wantsCar ? "car_with_driver" : "driver_only",
        tripType: "local",
        vehicle: wantsCar ? driver.vehicle_type : null,
        pickup,
        drop: null,
        hours: null,
        note: details,
        driverId: driver.id,
        offer: offerValue,
      });
      try {
        router.dismissAll();
      } catch {
        /* nothing to dismiss */
      }
      router.push(`/trip/${res.trip_id}`);
    } catch (err) {
      showError(err, "Could not send");
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen
      back
      footer={
        <Button title={`Send request to ${name}`} icon="paper-plane" onPress={send} loading={sending} disabled={!pickup} />
      }
    >
      <View style={styles.card}>
        <Avatar name={driver.full_name} url={driver.avatar_url} size={72} />
        <View style={{ flex: 1 }}>
          <Text style={font.heading}>{driver.full_name ?? "Driver"}</Text>
          <RatingText avg={driver.rating_avg} count={driver.rating_count} />
          <Text style={[font.small, { marginTop: 4 }]}>
            {wantsCar
              ? [driver.vehicle_type ? VEHICLE_LABEL[driver.vehicle_type] : "Car", driver.vehicle_model].filter(Boolean).join(" · ")
              : "Will drive your car"}
            {"  ·  "}
            {driver.distance_km} km away
          </Text>
        </View>
      </View>

      {(prices || driver.rate_note) && (
        <View style={styles.rate}>
          <Ionicons name="pricetag-outline" size={20} color={colors.green} />
          <View style={{ flex: 1 }}>
            <Text style={font.tiny}>{name}'s prices</Text>
            {prices ? <Text style={styles.prices}>{prices}</Text> : null}
            {driver.rate_note ? <Text style={font.small}>{driver.rate_note}</Text> : null}
          </View>
        </View>
      )}

      <SectionLabel>Pickup</SectionLabel>
      <Pressable
        style={styles.pickup}
        onPress={() => router.push("/pick-on-map?field=pickup")}
        accessibilityRole="button"
        accessibilityLabel="Change pickup"
      >
        <View style={styles.dot} />
        <Text style={[font.body, { flex: 1 }]} numberOfLines={2}>
          {pickup?.address ?? "Finding your location…"}
        </Text>
        <Text style={styles.change}>Change</Text>
      </Pressable>

      <SectionLabel>Trip details (optional)</SectionLabel>
      <Field
        icon="flag-outline"
        value={where}
        onChangeText={setWhere}
        placeholder="Where to? e.g. Guntur, hospital"
        maxLength={120}
      />
      <Field
        icon="chatbubble-ellipses-outline"
        value={note}
        onChangeText={setNote}
        placeholder="When / how long? e.g. now, 2 days"
        maxLength={150}
      />

      <SectionLabel>Your price offer (optional)</SectionLabel>
      <Field
        icon="cash-outline"
        value={offer}
        onChangeText={setOffer}
        placeholder="e.g. 500"
        keyboardType="number-pad"
        maxLength={6}
        error={offerError}
        hint={`Leave empty to go with ${name}'s prices. ${name} can accept your offer or call you to discuss.`}
      />

      <View style={styles.info}>
        <Ionicons name="call-outline" size={20} color={colors.textMuted} />
        <Text style={[font.small, { flex: 1 }]}>
          After {name} accepts, call each other to confirm. Pay the driver directly by cash or UPI.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: space.lg },
  rate: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space.md,
    marginTop: space.lg,
  },
  prices: { fontSize: 18, fontWeight: "800", color: colors.green },
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
  info: { flexDirection: "row", gap: space.sm, backgroundColor: colors.surface, borderRadius: radius.md, padding: space.md, marginTop: space.sm },
});
