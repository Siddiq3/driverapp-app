import { Ionicons } from "@expo/vector-icons";
import { useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { searchPlace } from "@/lib/location";
import type { LatLng, Place } from "@/lib/types";
import { colors, radius, space } from "@/theme";

/**
 * Type a place and press Search. Uses the phone's free geocoder (no paid API).
 * Shows a green tick when the place is found.
 */
export function PlaceInput({
  label,
  marker,
  value,
  onChange,
  near,
  placeholder,
  right,
}: {
  label: string;
  marker: "dot" | "square";
  value: Place | null;
  onChange: (p: Place | null) => void;
  near?: LatLng | null;
  placeholder: string;
  right?: ReactNode;
}) {
  const [text, setText] = useState(value?.address ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep text in sync when the parent fills the value (e.g. current location)
  const shown = value && text === "" ? value.address : text;

  const search = async () => {
    const q = shown.trim();
    if (q.length < 3) {
      setError("Type at least 3 letters");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const place = await searchPlace(q, near ?? undefined);
      if (!place) {
        setError("Place not found. Add the area or town name, e.g. 'Bus stand, Tenali'.");
        onChange(null);
      } else {
        onChange(place);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ marginBottom: space.md }}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.box, !!error && { borderColor: colors.red }]}>
        <View style={marker === "dot" ? styles.dot : styles.square} />
        <TextInput
          value={shown}
          onChangeText={(t) => {
            setText(t);
            if (value && t !== value.address) onChange(null);
          }}
          placeholder={placeholder}
          placeholderTextColor={colors.textFaint}
          style={styles.input}
          returnKeyType="search"
          onSubmitEditing={search}
          accessibilityLabel={label}
        />
        {busy ? (
          <ActivityIndicator color={colors.black} />
        ) : value ? (
          <Ionicons name="checkmark-circle" size={26} color={colors.green} accessibilityLabel="Place found" />
        ) : (
          <Pressable onPress={search} hitSlop={10} accessibilityRole="button" accessibilityLabel="Search place" style={styles.searchBtn}>
            <Text style={styles.searchText}>Find</Text>
          </Pressable>
        )}
        {right}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 15, fontWeight: "600", color: colors.text, marginBottom: space.sm },
  box: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    minHeight: 58,
    borderWidth: 2,
    borderColor: "transparent",
  },
  input: { flex: 1, fontSize: 17, color: colors.text, paddingVertical: space.md },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.black },
  square: { width: 12, height: 12, backgroundColor: colors.black },
  searchBtn: { backgroundColor: colors.black, borderRadius: radius.sm, paddingHorizontal: space.md, paddingVertical: 8 },
  searchText: { color: colors.white, fontWeight: "700", fontSize: 15 },
  error: { color: colors.red, fontSize: 14, marginTop: space.xs },
});
