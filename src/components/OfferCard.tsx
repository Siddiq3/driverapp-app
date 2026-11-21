import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Button } from "@/components/Button";
import { Route } from "@/components/TripBits";
import { mmss, rupees, SERVICE_LABEL, TRIP_LABEL, VEHICLE_LABEL } from "@/lib/format";
import { useSecondsLeft } from "@/lib/hooks";
import type { Trip } from "@/lib/types";
import { colors, font, radius, space } from "@/theme";

/** Full-screen new trip request for drivers: big price, where, Accept / Skip. */
export function OfferCard({
  trip,
  distanceKm,
  accepting,
  onAccept,
  onSkip,
  onTimeout,
}: {
  trip: Trip;
  distanceKm: number | null;
  accepting: boolean;
  onAccept: () => void;
  onSkip: () => void;
  onTimeout: () => void;
}) {
  const left = useSecondsLeft(trip.expires_at);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
  }, [trip.id]);

  useEffect(() => {
    if (left <= 0) onTimeout();
  }, [left, onTimeout]);

  const details = [
    SERVICE_LABEL[trip.service_type],
    TRIP_LABEL[trip.trip_type],
    trip.vehicle_type ? VEHICLE_LABEL[trip.vehicle_type] : null,
    trip.hours ? `${trip.hours} hrs` : null,
    trip.distance_km ? `${trip.distance_km} km trip` : null,
  ].filter(Boolean);

  return (
    <Modal visible animationType="slide" transparent statusBarTranslucent onRequestClose={onSkip}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.headRow}>
            <Text style={styles.newLabel}>NEW TRIP</Text>
            <View style={styles.timer}>
              <Ionicons name="time-outline" size={16} color={colors.white} />
              <Text style={styles.timerText}>{mmss(left)}</Text>
            </View>
          </View>

          <Text style={styles.price}>{rupees(trip.fare_estimate)}</Text>
          <Text style={font.small}>{details.join(" · ")}</Text>

          <View style={styles.away}>
            <Ionicons name="navigate" size={20} color={colors.black} />
            <Text style={font.bodyStrong}>
              {distanceKm != null ? `${distanceKm} km from you` : "Near you"}
            </Text>
          </View>

          <Route pickup={trip.pickup_address} drop={trip.drop_address} dropFallback={trip.hours ? `${trip.hours} hours of driving` : undefined} />

          {trip.customer_note && (
            <View style={styles.note}>
              <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.textMuted} />
              <Text style={[font.small, { flex: 1, color: colors.text }]}>{trip.customer_note}</Text>
            </View>
          )}

          <Button title="Accept trip" variant="success" onPress={onAccept} loading={accepting} style={{ marginTop: space.xl }} />
          <Button title="Skip" variant="ghost" size="md" onPress={onSkip} disabled={accepting} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
  card: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.lg + 8,
    borderTopRightRadius: radius.lg + 8,
    padding: space.xl,
    paddingBottom: space.xxl,
  },
  headRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: space.md },
  newLabel: { fontSize: 14, fontWeight: "800", letterSpacing: 1, color: colors.green },
  timer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.black,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 6,
  },
  timerText: { color: colors.white, fontWeight: "700", fontSize: 15 },
  price: { fontSize: 44, fontWeight: "800", color: colors.text },
  away: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: space.md,
    marginVertical: space.lg,
  },
  note: {
    flexDirection: "row",
    gap: space.sm,
    marginTop: space.lg,
    backgroundColor: colors.surface,
    padding: space.md,
    borderRadius: radius.sm,
  },
});
