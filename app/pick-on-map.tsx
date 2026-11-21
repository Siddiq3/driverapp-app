import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, IconButton } from "@/components/Button";
import { Map } from "@/components/Map";
import { BottomSheet } from "@/components/Sheet";
import { bookingDraft, saveRecentPlace } from "@/lib/draft";
import { addressFor } from "@/lib/location";
import type { LatLng } from "@/lib/types";
import { colors, font, shadow, space } from "@/theme";

/** Move the map under the pin to choose a place (free reverse geocoding by the phone). */
export default function PickOnMap() {
  const params = useLocalSearchParams<{ field?: string; service?: string }>();
  const field = params.field === "pickup" ? "pickup" : "drop";
  const service = params.service === "driver_only" ? "driver_only" : "car_with_driver";

  const start = useRef<LatLng | null>(
    (field === "pickup" ? bookingDraft.get().pickup : bookingDraft.get().drop) ?? bookingDraft.get().pickup,
  ).current;

  const [center, setCenter] = useState<LatLng | null>(start);
  const [address, setAddress] = useState<string | null>(null);
  const [looking, setLooking] = useState(false);

  useEffect(() => {
    if (!center) return;
    let alive = true;
    setLooking(true);
    const t = setTimeout(async () => {
      const a = await addressFor(center);
      if (alive) {
        setAddress(a);
        setLooking(false);
      }
    }, 400);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [center?.lat, center?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  const confirm = () => {
    if (!center || !address) return;
    const place = { ...center, address };
    if (field === "pickup") {
      bookingDraft.setPickup(place);
      router.back();
    } else {
      bookingDraft.setDrop(place);
      saveRecentPlace(place);
      router.replace(`/ride?service=${service}`);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Map
        center={start}
        bottomInset={220}
        showsUserLocation
        onRegionChangeComplete={(r: { latitude: number; longitude: number }) =>
          setCenter({ lat: r.latitude, lng: r.longitude })
        }
      />

      {/* Fixed pin in the middle of the map area */}
      <View pointerEvents="none" style={styles.pinWrap}>
        <View style={styles.pinHead}>
          <View style={styles.pinDot} />
        </View>
        <View style={styles.pinStick} />
      </View>

      <SafeAreaView edges={["top"]} style={styles.topBar} pointerEvents="box-none">
        <IconButton icon="arrow-back" label="Back" background={colors.white} onPress={() => router.back()} />
      </SafeAreaView>

      <BottomSheet>
        <Text style={font.small}>{field === "pickup" ? "Pickup point" : "Drop point"}</Text>
        <View style={styles.addressRow}>
          <Ionicons name="location" size={22} color={colors.black} />
          {looking ? (
            <ActivityIndicator color={colors.black} />
          ) : (
            <Text style={[font.subheading, { flex: 1 }]} numberOfLines={2}>
              {address ?? "Move the map to choose"}
            </Text>
          )}
        </View>
        <Button
          title={field === "pickup" ? "Confirm pickup" : "Confirm drop"}
          onPress={confirm}
          disabled={!address || looking}
        />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { position: "absolute", top: 0, left: 0, right: 0, paddingHorizontal: space.lg, paddingTop: space.sm },
  // Sits a little above centre because the bottom sheet covers the lower part
  pinWrap: { position: "absolute", left: 0, right: 0, top: 0, bottom: 220, alignItems: "center", justifyContent: "center" },
  pinHead: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.black,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 0,
    ...shadow,
  },
  pinDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.white },
  pinStick: { width: 3, height: 18, backgroundColor: colors.black, marginBottom: 52 }, // tip lands on the map centre
  addressRow: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: space.xs, marginBottom: space.lg, minHeight: 48 },
});
