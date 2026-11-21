import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Avatar, RatingText } from "@/components/TripBits";
import { ratesText, VEHICLE_LABEL } from "@/lib/format";
import type { FreeDriver } from "@/lib/types";
import { colors, font, radius, space } from "@/theme";
import { t } from "@/i18n";

/** One free driver / car in the "near you" list. */
export function FreeDriverCard({ driver, onPress }: { driver: FreeDriver; onPress: () => void }) {
  const what = driver.has_car
    ? [driver.vehicle_type ? VEHICLE_LABEL[driver.vehicle_type] : t("Car"), driver.vehicle_model].filter(Boolean).join(" · ")
    : t("Driver only (for your car)");

  // Show the prices that fit what the customer is looking for
  const prices = ratesText({
    rate_per_km: driver.has_car ? driver.rate_per_km : null,
    rate_per_hour: driver.rate_per_hour,
    rate_per_day: driver.rate_per_day,
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${driver.full_name ?? t("Driver")}, ${what}, ${t("{km} km away", { km: driver.distance_km })}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { backgroundColor: colors.surface }]}
    >
      <Avatar name={driver.full_name} url={driver.avatar_url} size={52} />
      <View style={{ flex: 1 }}>
        <Text style={font.bodyStrong} numberOfLines={1}>
          {driver.full_name ?? t("Driver")}
        </Text>
        <View style={styles.line}>
          <Ionicons name={driver.has_car ? "car" : "person"} size={14} color={colors.textMuted} />
          <Text style={font.small} numberOfLines={1}>
            {what}
          </Text>
        </View>
        <View style={styles.line}>
          <RatingText avg={driver.rating_avg} count={driver.rating_count} />
        </View>
        {prices ? (
          <Text style={styles.prices} numberOfLines={1}>
            {prices}
          </Text>
        ) : null}
      </View>
      <View style={styles.right}>
        <Text style={styles.km}>{t("{km} km", { km: driver.distance_km })}</Text>
        <View style={styles.requestBtn}>
          <Text style={styles.requestText}>{t("Request")}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingVertical: space.md,
    paddingHorizontal: space.sm,
    borderRadius: radius.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  line: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  prices: { fontSize: 15, fontWeight: "700", color: colors.green, marginTop: 2 },
  right: { alignItems: "flex-end", gap: space.sm },
  km: { fontSize: 14, fontWeight: "700", color: colors.text },
  requestBtn: { backgroundColor: colors.black, borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: 8 },
  requestText: { color: colors.white, fontWeight: "700", fontSize: 14 },
});
