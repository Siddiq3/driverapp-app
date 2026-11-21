import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { initials, STATUS_LABEL } from "@/lib/format";
import type { TripStatus } from "@/lib/types";
import { colors, radius, space } from "@/theme";
import { t } from "@/i18n";

/** Pickup ● and drop ■ addresses joined by a line. */
export function Route({ pickup, drop, dropFallback }: { pickup: string; drop?: string | null; dropFallback?: string }) {
  const dropText = drop ?? dropFallback;
  return (
    <View style={styles.route}>
      <View style={styles.routeRow}>
        <View style={styles.dot} />
        <Text style={styles.routeText} numberOfLines={2}>
          {pickup}
        </Text>
      </View>
      {dropText && (
        <>
          <View style={styles.line} />
          <View style={styles.routeRow}>
            <View style={styles.square} />
            <Text style={styles.routeText} numberOfLines={2}>
              {dropText}
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

export function Avatar({ name, url, size = 56 }: { name?: string | null; url?: string | null; size?: number }) {
  if (url) {
    return <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={{ color: colors.white, fontWeight: "700", fontSize: size * 0.36 }}>{initials(name)}</Text>
    </View>
  );
}

const BADGE: Record<TripStatus, { bg: string; fg: string }> = {
  searching: { bg: colors.amberSoft, fg: colors.amber },
  accepted: { bg: colors.surface, fg: colors.black },
  arrived: { bg: colors.greenSoft, fg: colors.green },
  started: { bg: colors.greenSoft, fg: colors.green },
  completed: { bg: colors.greenSoft, fg: colors.green },
  cancelled: { bg: colors.redSoft, fg: colors.red },
  expired: { bg: colors.surface, fg: colors.textMuted },
};

export function StatusBadge({ status }: { status: TripStatus }) {
  const c = BADGE[status];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeText, { color: c.fg }]}>{STATUS_LABEL[status]}</Text>
    </View>
  );
}

export function Stars({
  value,
  onChange,
  size = 40,
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
}) {
  return (
    <View style={{ flexDirection: "row", gap: space.sm, justifyContent: "center" }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable
          key={n}
          disabled={!onChange}
          accessibilityRole="button"
          accessibilityLabel={t("{n} stars", { n })}
          onPress={() => onChange?.(n)}
          hitSlop={6}
        >
          <Ionicons name={n <= value ? "star" : "star-outline"} size={size} color={n <= value ? "#F5A623" : colors.textFaint} />
        </Pressable>
      ))}
    </View>
  );
}

export function RatingText({ avg, count }: { avg: number; count: number }) {
  if (!count) return <Text style={styles.ratingNew}>{t("New driver")}</Text>;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <Ionicons name="star" size={15} color="#F5A623" />
      <Text style={styles.rating}>
        {Number(avg).toFixed(1)} <Text style={{ color: colors.textMuted }}>({count})</Text>
      </Text>
    </View>
  );
}

/** Small "label: value" row used on trip details. */
export function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.info}>
      <Ionicons name={icon} size={20} color={colors.textMuted} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  route: { gap: 2 },
  routeRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  routeText: { flex: 1, fontSize: 16, color: colors.text },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.black },
  square: { width: 12, height: 12, backgroundColor: colors.black },
  line: { width: 2, height: 18, backgroundColor: colors.border, marginLeft: 5 },
  avatar: { backgroundColor: colors.black, alignItems: "center", justifyContent: "center" },
  badge: { paddingHorizontal: space.md, paddingVertical: 4, borderRadius: radius.pill, alignSelf: "flex-start" },
  badgeText: { fontSize: 13, fontWeight: "700" },
  rating: { fontSize: 15, fontWeight: "600", color: colors.text },
  ratingNew: { fontSize: 14, fontWeight: "600", color: colors.green },
  info: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.sm },
  infoLabel: { flex: 1, fontSize: 16, color: colors.textMuted },
  infoValue: { fontSize: 16, fontWeight: "600", color: colors.text },
});
