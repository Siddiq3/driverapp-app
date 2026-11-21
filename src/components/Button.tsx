import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { colors, radius, space } from "@/theme";

type Variant = "primary" | "secondary" | "danger" | "success" | "ghost";

type Props = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  size?: "lg" | "md";
  style?: ViewStyle;
};

const palette: Record<Variant, { bg: string; fg: string; pressed: string }> = {
  primary: { bg: colors.black, fg: colors.white, pressed: "#262626" },
  secondary: { bg: colors.surface, fg: colors.black, pressed: colors.surfacePressed },
  danger: { bg: colors.red, fg: colors.white, pressed: "#B51F33" },
  success: { bg: colors.green, fg: colors.white, pressed: "#047A41" },
  ghost: { bg: "transparent", fg: colors.black, pressed: colors.surface },
};

export function Button({ title, onPress, variant = "primary", icon, loading, disabled, size = "lg", style }: Props) {
  const p = palette[variant];
  const off = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={off}
      onPress={() => {
        Haptics.selectionAsync().catch(() => undefined);
        onPress();
      }}
      style={({ pressed }) => [
        styles.base,
        size === "md" && styles.md,
        { backgroundColor: pressed ? p.pressed : p.bg, opacity: disabled ? 0.4 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={p.fg} />
      ) : (
        <View style={styles.row}>
          {icon && <Ionicons name={icon} size={size === "lg" ? 22 : 18} color={p.fg} />}
          <Text style={[styles.text, size === "md" && styles.textMd, { color: p.fg }]} numberOfLines={1}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

/** Round icon button, e.g. call / share / back. */
export function IconButton({
  icon,
  onPress,
  label,
  color = colors.black,
  background = colors.surface,
  size = 48,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  label: string;
  color?: string;
  background?: string;
  size?: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        { width: size, height: size, borderRadius: size / 2, backgroundColor: background, opacity: pressed ? 0.7 : 1 },
        styles.icon,
      ]}
    >
      <Ionicons name={icon} size={size * 0.48} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 58,
    borderRadius: radius.md,
    paddingHorizontal: space.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  md: { minHeight: 46, paddingHorizontal: space.lg },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm },
  text: { fontSize: 18, fontWeight: "700" },
  textMd: { fontSize: 16 },
  icon: { alignItems: "center", justifyContent: "center" },
});
