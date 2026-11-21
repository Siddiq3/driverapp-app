import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, space } from "@/theme";
import { t } from "@/i18n";

/** Pill tabs, e.g. In town / Outstation / By hours. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segment} accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              Haptics.selectionAsync().catch(() => undefined);
              onChange(o.value);
            }}
            style={[styles.segmentItem, active && styles.segmentActive]}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Big tappable card with icon, title, subtitle and optional right side (e.g. price). */
export function OptionCard({
  icon,
  title,
  subtitle,
  right,
  selected,
  onPress,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: !!selected }}
      onPress={() => {
        Haptics.selectionAsync().catch(() => undefined);
        onPress();
      }}
      style={({ pressed }) => [styles.card, selected && styles.cardSelected, pressed && { opacity: 0.85 }]}
    >
      {icon && (
        <View style={styles.cardIcon}>
          <Ionicons name={icon} size={26} color={colors.black} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{title}</Text>
        {subtitle && <Text style={styles.cardSub}>{subtitle}</Text>}
      </View>
      {right}
    </Pressable>
  );
}

/** − 4 hours + */
export function Stepper({
  value,
  onChange,
  min = 1,
  max = 24,
  unit,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  unit: string;
}) {
  const btn = (icon: "remove" | "add", next: number, disabled: boolean) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={icon === "add" ? t("More") : t("Less")}
      disabled={disabled}
      onPress={() => {
        Haptics.selectionAsync().catch(() => undefined);
        onChange(next);
      }}
      style={[styles.stepBtn, disabled && { opacity: 0.3 }]}
    >
      <Ionicons name={icon} size={26} color={colors.black} />
    </Pressable>
  );
  return (
    <View style={styles.stepper}>
      {btn("remove", value - 1, value <= min)}
      <Text style={styles.stepValue}>
        {value} {t(unit)}
      </Text>
      {btn("add", value + 1, value >= max)}
    </View>
  );
}

const styles = StyleSheet.create({
  segment: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    padding: 4,
  },
  segmentItem: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
  },
  segmentActive: { backgroundColor: colors.black },
  segmentText: { fontSize: 15, fontWeight: "600", color: colors.text },
  segmentTextActive: { color: colors.white },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.white,
    marginBottom: space.sm,
  },
  cardSelected: { borderColor: colors.black, backgroundColor: colors.surface },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  cardSub: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space.sm,
  },
  stepBtn: {
    width: 52,
    height: 52,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  stepValue: { fontSize: 20, fontWeight: "700", color: colors.text },
});
