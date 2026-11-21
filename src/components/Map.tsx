import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, type MapViewProps } from "react-native-maps";
import { colors } from "@/theme";
import type { LatLng } from "@/lib/types";

// A calm, grey map style so the app's black buttons stand out (Google Maps on Android).
const quietStyle = [
  { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#e5f0e5" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#e0e0e0" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#d6e4f0" }] },
];

const INDIA = { lat: 20.5937, lng: 78.9629 };

type Props = Omit<MapViewProps, "region" | "initialRegion"> & {
  /** Where the camera should look. The map moves smoothly when this changes. */
  center?: LatLng | null;
  pickup?: LatLng | null;
  drop?: LatLng | null;
  /** Leave room at the bottom for the sheet (pixels). */
  bottomInset?: number;
};

export function Map({ center, pickup, drop, bottomInset = 0, style, ...rest }: Props) {
  const ref = useRef<MapView>(null);
  const focus = center ?? pickup ?? null;

  useEffect(() => {
    const map = ref.current;
    if (!map) return;
    if (pickup && drop) {
      map.fitToCoordinates(
        [
          { latitude: pickup.lat, longitude: pickup.lng },
          { latitude: drop.lat, longitude: drop.lng },
        ],
        { edgePadding: { top: 120, right: 60, bottom: bottomInset + 60, left: 60 }, animated: true },
      );
    } else if (focus) {
      map.animateToRegion(
        { latitude: focus.lat, longitude: focus.lng, latitudeDelta: 0.015, longitudeDelta: 0.015 },
        500,
      );
    }
  }, [focus?.lat, focus?.lng, pickup?.lat, pickup?.lng, drop?.lat, drop?.lng, bottomInset]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = focus ?? INDIA;

  return (
    <MapView
      ref={ref}
      provider={PROVIDER_GOOGLE}
      style={[StyleSheet.absoluteFill, style]}
      customMapStyle={quietStyle}
      showsUserLocation
      showsMyLocationButton={false}
      showsCompass={false}
      toolbarEnabled={false}
      mapPadding={{ top: 0, right: 0, bottom: bottomInset, left: 0 }}
      initialRegion={{
        latitude: start.lat,
        longitude: start.lng,
        latitudeDelta: focus ? 0.015 : 20,
        longitudeDelta: focus ? 0.015 : 20,
      }}
      {...rest}
    >
      {pickup && (
        <Marker coordinate={{ latitude: pickup.lat, longitude: pickup.lng }} title="Pickup" tracksViewChanges={false}>
          <View style={styles.pickup} />
        </Marker>
      )}
      {drop && (
        <Marker coordinate={{ latitude: drop.lat, longitude: drop.lng }} title="Drop" tracksViewChanges={false}>
          <View style={styles.drop} />
        </Marker>
      )}
    </MapView>
  );
}

const styles = StyleSheet.create({
  pickup: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.black,
    borderWidth: 6,
    borderColor: colors.white,
  },
  drop: {
    width: 20,
    height: 20,
    backgroundColor: colors.black,
    borderWidth: 5,
    borderColor: colors.white,
  },
});
