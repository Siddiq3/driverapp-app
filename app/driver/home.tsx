import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, IconButton } from "@/components/Button";
import { Map } from "@/components/Map";
import { OfferCard } from "@/components/OfferCard";
import { BottomSheet } from "@/components/Sheet";
import { RatingText } from "@/components/TripBits";
import { showError } from "@/lib/alert";
import * as api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { firstName, STATUS_LABEL } from "@/lib/format";
import { useForegroundInterval } from "@/lib/hooks";
import { getCurrentPosition } from "@/lib/location";
import type { LatLng, Trip } from "@/lib/types";
import { colors, font, radius, shadow, space } from "@/theme";
import { t } from "@/i18n";

const LOCATION_EVERY_MS = 2 * 60 * 1000; // send location every 2 minutes while Free
const OFFERS_POLL_MS = 20 * 1000; // backup check in case a live update is missed

type Offer = { trip: Trip; distance_km: number | null };

export default function DriverHome() {
  const { profile, driver, refresh } = useAuth();
  const [here, setHere] = useState<LatLng | null>(null);
  const [online, setOnline] = useState(!!driver?.is_available);
  const [switching, setSwitching] = useState(false);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [accepting, setAccepting] = useState(false);
  const [active, setActive] = useState<Trip | null>(null);

  useEffect(() => setOnline(!!driver?.is_available), [driver?.is_available]);

  const loadOffers = useCallback(async () => {
    try {
      setOffers(await api.getPendingOffers());
    } catch {
      /* try again next time */
    }
  }, []);

  const loadState = useCallback(async () => {
    try {
      const [trip] = await Promise.all([api.getMyActiveTrip("driver"), refresh()]);
      setActive(trip);
    } catch {
      /* offline */
    }
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      loadState();
      loadOffers();
      getCurrentPosition().then(setHere).catch(() => undefined);
    }, [loadState, loadOffers]),
  );

  // Live: new offers arrive here instantly
  useEffect(() => {
    if (!driver?.id) return;
    return api.watchMyOffers(driver.id, () => {
      loadOffers();
      refresh().catch(() => undefined); // auto-busy after missed requests
    });
  }, [driver?.id, loadOffers, refresh]);

  // While Free: keep location fresh and double-check offers
  useForegroundInterval(
    async () => {
      try {
        const pos = await getCurrentPosition();
        setHere(pos);
        await api.updateLocation(pos.lat, pos.lng);
      } catch {
        /* ignore */
      }
    },
    LOCATION_EVERY_MS,
    online,
  );
  useForegroundInterval(loadOffers, OFFERS_POLL_MS, online);

  const toggle = async () => {
    setSwitching(true);
    try {
      if (online) {
        await api.setAvailability(false);
        setOnline(false);
        setOffers([]);
      } else {
        const pos = await getCurrentPosition();
        setHere(pos);
        await api.setAvailability(true, pos);
        setOnline(true);
        loadOffers();
      }
      await refresh();
    } catch (err) {
      showError(err);
    } finally {
      setSwitching(false);
    }
  };

  const offer = online ? offers[0] : undefined;

  const accept = async () => {
    if (!offer) return;
    setAccepting(true);
    try {
      const won = await api.acceptTrip(offer.trip.id);
      if (won) {
        setOffers([]);
        router.push(`/drive/${offer.trip.id}`);
      } else {
        Alert.alert("Trip taken", t("Another driver accepted this trip first. Stay online for the next one."));
        loadOffers();
      }
    } catch (err) {
      showError(err);
      loadOffers();
    } finally {
      setAccepting(false);
    }
  };

  const skip = async () => {
    if (!offer) return;
    setOffers((o) => o.slice(1));
    api.skipTrip(offer.trip.id).catch(() => undefined);
  };

  const timeout = useCallback(() => {
    // The customer's search moved on; drop the card and re-check
    setOffers((o) => o.slice(1));
    loadOffers();
  }, [loadOffers]);

  const autoBusy = !online && (driver?.missed_streak ?? 0) >= 3;

  return (
    <View style={{ flex: 1 }}>
      <Map center={here} bottomInset={280} />

      <SafeAreaView edges={["top"]} style={styles.top} pointerEvents="box-none">
        <View style={[styles.statusPill, { backgroundColor: online ? colors.green : colors.black }]}>
          <View style={[styles.statusDot, { backgroundColor: online ? colors.white : colors.textFaint }]} />
          <Text style={styles.statusText}>{online ? t("You are FREE") : t("You are BUSY")}</Text>
        </View>
        <IconButton
          icon="locate"
          label={t("Show my location")}
          background={colors.white}
          onPress={() => getCurrentPosition().then(setHere).catch((e) => showError(e))}
        />
      </SafeAreaView>

      <BottomSheet>
        {active ? (
          <Pressable style={styles.active} onPress={() => router.push(`/drive/${active.id}`)} accessibilityRole="button">
            <Ionicons name="car-sport" size={28} color={colors.white} />
            <View style={{ flex: 1 }}>
              <Text style={[font.bodyStrong, { color: colors.white }]}>{STATUS_LABEL[active.status]}</Text>
              <Text style={{ color: "#CFCFCF", fontSize: 15 }}>{t("Tap to open your current trip")}</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.white} />
          </Pressable>
        ) : (
          <>
            <View style={styles.headRow}>
              <View style={{ flex: 1 }}>
                <Text style={font.heading}>{t("Hi {name}", { name: firstName(profile?.full_name) })}</Text>
                <Text style={font.small}>
                  {online ? t("Waiting for trips near you…") : t("Go free to start getting trips.")}
                </Text>
              </View>
              {driver && <RatingText avg={driver.rating_avg} count={driver.rating_count} />}
            </View>

            {autoBusy && (
              <View style={styles.warn}>
                <Ionicons name="alert-circle" size={20} color={colors.amber} />
                <Text style={styles.warnText}>
                  {t("We set you to Busy because 3 requests were not answered. Go free again when you're ready.")}
                </Text>
              </View>
            )}

            <Button
              title={online ? t("Go busy (stop trips)") : t("Go free (get trips)")}
              icon={online ? "pause" : "power"}
              variant={online ? "secondary" : "success"}
              onPress={toggle}
              loading={switching}
            />
          </>
        )}
      </BottomSheet>

      {offer && !active && (
        <OfferCard
          trip={offer.trip}
          distanceKm={offer.distance_km}
          accepting={accepting}
          onAccept={accept}
          onSkip={skip}
          onTimeout={timeout}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  top: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.pill,
    ...shadow,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { color: colors.white, fontWeight: "800", fontSize: 16, letterSpacing: 0.5 },
  headRow: { flexDirection: "row", alignItems: "flex-start", gap: space.md, marginBottom: space.lg },
  active: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: colors.black,
    borderRadius: radius.md,
    padding: space.lg,
  },
  warn: {
    flexDirection: "row",
    gap: space.sm,
    backgroundColor: colors.amberSoft,
    padding: space.md,
    borderRadius: radius.sm,
    marginBottom: space.md,
  },
  warnText: { flex: 1, color: colors.amber, fontSize: 14, fontWeight: "600" },
});
