import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { bookingDraft, getRecentPlaces, saveRecentPlace, useBookingDraft } from "@/lib/draft";
import { addressFor, getCurrentPosition, suggestPlaces, type Suggestion } from "@/lib/location";
import type { Place } from "@/lib/types";
import { showError } from "@/lib/alert";
import { colors, font, radius, space } from "@/theme";

type Field = "pickup" | "drop";
type Row =
  | { kind: "map" }
  | { kind: "current" }
  | { kind: "suggestion"; place: Suggestion }
  | { kind: "recent"; place: Place }
  | { kind: "header"; title: string }
  | { kind: "searching" }
  | { kind: "none" };

/** "Where to?" screen: pickup + drop boxes, suggestions while typing, recent places, choose on map. */
export default function Search() {
  const params = useLocalSearchParams<{ service?: string; field?: Field }>();
  const service = params.service === "driver_only" ? "driver_only" : "car_with_driver";
  const { pickup, drop } = useBookingDraft();

  const [field, setField] = useState<Field>(params.field === "pickup" ? "pickup" : "drop");
  const [pickupText, setPickupText] = useState(pickup?.address ?? "");
  const [dropText, setDropText] = useState(drop?.address ?? "");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [recents, setRecents] = useState<Place[]>([]);
  const dropRef = useRef<TextInput>(null);
  const pickupRef = useRef<TextInput>(null);

  useEffect(() => {
    getRecentPlaces().then(setRecents);
  }, []);

  // Keep the boxes in sync when a place is chosen on the map screen
  useEffect(() => setPickupText(pickup?.address ?? ""), [pickup?.address]);
  useEffect(() => setDropText(drop?.address ?? ""), [drop?.address]);

  const query = field === "pickup" ? pickupText : dropText;
  const typed = field === "pickup" ? pickupText !== (pickup?.address ?? "") : dropText !== (drop?.address ?? "");

  // Search as you type (waits until the person stops typing)
  useEffect(() => {
    if (!typed || query.trim().length < 3) {
      setSuggestions([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    let alive = true;
    const t = setTimeout(async () => {
      const res = await suggestPlaces(query, pickup);
      if (alive) {
        setSuggestions(res);
        setSearching(false);
      }
    }, 600);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [query, typed, pickup]);

  const choose = (place: Place) => {
    if (field === "pickup") {
      bookingDraft.setPickup(place);
      setField("drop");
      setTimeout(() => dropRef.current?.focus(), 50);
      return;
    }
    bookingDraft.setDrop(place);
    saveRecentPlace(place);
    router.push(`/ride?service=${service}`);
  };

  const useCurrent = async () => {
    try {
      const pos = await getCurrentPosition();
      const address = await addressFor(pos);
      choose({ ...pos, address });
    } catch (err) {
      showError(err, "Location needed");
    }
  };

  const rows: Row[] = [];
  rows.push({ kind: "map" });
  if (field === "pickup") rows.push({ kind: "current" });
  if (typed && query.trim().length >= 3) {
    if (searching) rows.push({ kind: "searching" });
    else if (suggestions.length === 0) rows.push({ kind: "none" });
    suggestions.forEach((s) => rows.push({ kind: "suggestion", place: s }));
  }
  if (recents.length > 0) {
    rows.push({ kind: "header", title: "Recent" });
    recents.forEach((p) => rows.push({ kind: "recent", place: p }));
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.head}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={26} color={colors.black} />
        </Pressable>
        <Text style={font.heading}>{service === "driver_only" ? "Driver for my car" : "Plan your ride"}</Text>
      </View>

      <View style={styles.boxes}>
        <View style={styles.rail}>
          <View style={styles.dot} />
          <View style={styles.railLine} />
          <View style={styles.square} />
        </View>
        <View style={{ flex: 1, gap: space.sm }}>
          <TextInput
            ref={pickupRef}
            value={pickupText}
            onChangeText={setPickupText}
            onFocus={() => setField("pickup")}
            placeholder="Pickup location"
            placeholderTextColor={colors.textFaint}
            style={[styles.input, field === "pickup" && styles.inputActive]}
            selectTextOnFocus
            accessibilityLabel="Pickup location"
          />
          <TextInput
            ref={dropRef}
            value={dropText}
            onChangeText={setDropText}
            onFocus={() => setField("drop")}
            autoFocus={field === "drop"}
            placeholder="Where to?"
            placeholderTextColor={colors.textFaint}
            style={[styles.input, field === "drop" && styles.inputActive]}
            returnKeyType="search"
            accessibilityLabel="Drop location"
          />
        </View>
      </View>

      <Pressable
        style={styles.skip}
        onPress={() => {
          bookingDraft.setDrop(null);
          router.push(`/ride?service=${service}`);
        }}
        accessibilityRole="button"
      >
        <Ionicons name="hourglass-outline" size={18} color={colors.blue} />
        <Text style={styles.skipText}>No drop? Book by hours</Text>
      </Pressable>

      <FlatList
        data={rows}
        keyboardShouldPersistTaps="handled"
        keyExtractor={(r, i) => `${r.kind}-${i}`}
        renderItem={({ item }) => {
          switch (item.kind) {
            case "map":
              return (
                <RowItem
                  icon="map"
                  title="Choose on map"
                  subtitle={`Move the map to set your ${field === "pickup" ? "pickup" : "drop"}`}
                  onPress={() => router.push(`/pick-on-map?field=${field}&service=${service}`)}
                />
              );
            case "current":
              return <RowItem icon="locate" title="Use my current location" onPress={useCurrent} />;
            case "searching":
              return (
                <View style={styles.status}>
                  <ActivityIndicator color={colors.black} />
                  <Text style={font.small}>Searching…</Text>
                </View>
              );
            case "none":
              return (
                <View style={styles.status}>
                  <Text style={font.small}>Not found. Try adding the area or town, or choose on map.</Text>
                </View>
              );
            case "header":
              return <Text style={styles.header}>{item.title}</Text>;
            case "suggestion":
              return (
                <RowItem
                  icon="location"
                  title={item.place.title}
                  subtitle={item.place.subtitle}
                  right={item.place.km != null ? `${item.place.km} km` : undefined}
                  onPress={() => choose(item.place)}
                />
              );
            case "recent":
              return <RowItem icon="time-outline" title={item.place.address} onPress={() => choose(item.place)} />;
          }
        }}
      />
    </SafeAreaView>
  );
}

function RowItem({
  icon,
  title,
  subtitle,
  right,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  right?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surface }]}
    >
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={20} color={colors.black} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text style={font.small} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      {right && <Text style={font.tiny}>{right}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  head: { flexDirection: "row", alignItems: "center", gap: space.lg, paddingHorizontal: space.xl, paddingVertical: space.md },
  boxes: { flexDirection: "row", gap: space.md, paddingHorizontal: space.xl, paddingBottom: space.md },
  rail: { alignItems: "center", paddingTop: 22 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.black },
  railLine: { width: 2, height: 46, backgroundColor: colors.border, marginVertical: 4 },
  square: { width: 10, height: 10, backgroundColor: colors.black },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: space.lg,
    minHeight: 52,
    fontSize: 17,
    color: colors.text,
    borderWidth: 2,
    borderColor: "transparent",
  },
  inputActive: { borderColor: colors.black, backgroundColor: colors.white },
  skip: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-end", paddingHorizontal: space.xl, paddingBottom: space.sm },
  skipText: { fontSize: 15, fontWeight: "700", color: colors.blue },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.xl, minHeight: 64 },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { fontSize: 17, fontWeight: "600", color: colors.text },
  status: { flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.xl, paddingVertical: space.lg },
  header: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
    paddingBottom: space.xs,
  },
});
