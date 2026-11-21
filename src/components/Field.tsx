import { Ionicons } from "@expo/vector-icons";
import { forwardRef } from "react";
import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { colors, radius, space } from "@/theme";

type Props = TextInputProps & {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  error?: string | null;
  hint?: string;
};

export const Field = forwardRef<TextInput, Props>(function Field({ label, icon, error, hint, style, ...rest }, ref) {
  return (
    <View style={styles.wrap}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.box, !!error && styles.boxError]}>
        {icon && <Ionicons name={icon} size={20} color={colors.textMuted} style={{ marginRight: space.sm }} />}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.textFaint}
          style={[styles.input, style]}
          {...rest}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { marginBottom: space.lg },
  label: { fontSize: 15, fontWeight: "600", color: colors.text, marginBottom: space.sm },
  box: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    minHeight: 56,
    borderWidth: 2,
    borderColor: "transparent",
  },
  boxError: { borderColor: colors.red },
  input: { flex: 1, fontSize: 17, color: colors.text, paddingVertical: space.md },
  error: { color: colors.red, fontSize: 14, marginTop: space.xs },
  hint: { color: colors.textMuted, fontSize: 14, marginTop: space.xs },
});
