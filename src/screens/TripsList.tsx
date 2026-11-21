import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AdBanner } from "@/components/AdBanner";
import { Button } from "@/components/Button";
import { EmptyState, Loading } from "@/components/Screen";
import { Route, StatusBadge } from "@/components/TripBits";
import * as api from "@/lib/api";
import { dateTime, SERVICE_LABEL, TRIP_LABEL } from "@/lib/format";
import { ACTIVE_STATUSES, type Trip, type UserRole } from "@/lib/types";
import { colors, font, radius, space } from "@/theme";

export function TripsList({ mode }: { mode: UserRole }) {
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setTrips(await api.getMyTrips(mode));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load trips");
    }
  }, [mode]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const open = (t: Trip) => {
    if (mode === "driver") router.push(`/drive/${t.id}`);
    else router.push(`/trip/${t.id}`);
  };

  if (!trips && !error) return <Loading />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }} edges={["top"]}>
      <FlatList
        data={trips ?? []}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ padding: space.xl, paddingBottom: space.xxl }}
        ListHeaderComponent={<Text style={[font.title, { marginBottom: space.lg }]}>Your trips</Text>}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
        ListEmptyComponent={
          error ? (
            <EmptyState icon="cloud-offline" title="Could not load" message={error} action={<Button title="Try again" onPress={load} />} />
          ) : (
            <EmptyState
              icon="car-outline"
              title="No trips yet"
              message={mode === "driver" ? "Go online to start getting trips." : "Your booked trips will show here."}
            />
          )
        }
        ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
        ListFooterComponent={mode === "customer" ? <AdBanner /> : null}
        renderItem={({ item: t }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => open(t)}
            style={({ pressed }) => [styles.card, pressed && { backgroundColor: colors.surface }]}
          >
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={font.bodyStrong}>
                  {SERVICE_LABEL[t.service_type]} · {TRIP_LABEL[t.trip_type]}
                </Text>
                <Text style={font.small}>{dateTime(t.created_at)}</Text>
              </View>
            </View>
            <Route pickup={t.pickup_address} drop={t.drop_address} dropFallback={t.hours ? `${t.hours} hours` : undefined} />
            <View style={{ marginTop: space.md, flexDirection: "row", alignItems: "center", gap: space.sm }}>
              <StatusBadge status={t.status} />
              {ACTIVE_STATUSES.includes(t.status) && <Text style={styles.live}>Tap to open</Text>}
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: space.lg },
  cardTop: { flexDirection: "row", alignItems: "flex-start", marginBottom: space.md, gap: space.md },
  price: { fontSize: 20, fontWeight: "800", color: colors.text },
  live: { fontSize: 14, fontWeight: "600", color: colors.blue },
});
