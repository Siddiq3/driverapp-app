import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/Button";
import { useAuth } from "@/lib/auth";
import { useOnAppActive } from "@/lib/hooks";
import { askLocation, locationAccess, type LocationAccess } from "@/lib/location";
import { colors, font, radius, space } from "@/theme";
import { t } from "@/i18n";

/** Shown right after login until the person allows location. */
export default function LocationPermission() {
  const { profile } = useAuth();
  const isDriver = profile?.role === "driver";
  const [state, setState] = useState<LocationAccess>("ask");
  const [busy, setBusy] = useState(false);

  const done = () => router.replace("/");

  // Coming back from phone Settings: continue if they turned it on there.
  const recheck = useCallback(async () => {
    const s = await locationAccess();
    setState(s);
    if (s === "granted") done();
  }, []);
  useOnAppActive(recheck);

  const allow = async () => {
    setBusy(true);
    try {
      const s = await askLocation();
      setState(s);
      if (s === "granted") done();
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.body}>
        <View style={styles.icon}>
          <Ionicons name="location" size={56} color={colors.white} />
        </View>
        <Text style={[font.title, styles.center]}>{t("Allow your location")}</Text>
        <Text style={[font.body, styles.center, { color: colors.textMuted, marginTop: space.md }]}>
          {isDriver
            ? t("So we can send you trips from customers near you.")
            : t("So we can show free drivers near you and fill your pickup point.")}
        </Text>

        <View style={styles.points}>
          <Point icon="car" text={isDriver ? t("Get trips close to you") : t("See drivers around you")} />
          <Point icon="flash" text={isDriver ? t("Less driving to reach customers") : t("Faster pickup")} />
          <Point icon="lock-closed" text={t("Used only while the app is open")} />
        </View>

        {state === "blocked" && (
          <View style={styles.warn}>
            <Ionicons name="settings-outline" size={20} color={colors.amber} />
            <Text style={styles.warnText}>
              {t("Location is turned off for this app. Tap \"Open settings\", then Permissions → Location → Allow.")}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        {state === "blocked" ? (
          <Button title={t("Open settings")} icon="settings" onPress={() => Linking.openSettings()} />
        ) : (
          <Button title={t("Allow location")} icon="location" onPress={allow} loading={busy} />
        )}
      </View>
    </SafeAreaView>
  );
}

function Point({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.point}>
      <View style={styles.pointIcon}>
        <Ionicons name={icon} size={20} color={colors.black} />
      </View>
      <Text style={font.body}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  body: { flex: 1, padding: space.xl, justifyContent: "center" },
  center: { textAlign: "center" },
  icon: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: colors.black,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: space.xl,
  },
  points: { marginTop: space.xxl, gap: space.lg },
  point: { flexDirection: "row", alignItems: "center", gap: space.md },
  pointIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  warn: {
    flexDirection: "row",
    gap: space.sm,
    backgroundColor: colors.amberSoft,
    padding: space.md,
    borderRadius: radius.sm,
    marginTop: space.xl,
  },
  warnText: { flex: 1, color: colors.amber, fontSize: 14, fontWeight: "600" },
  footer: { padding: space.xl },
});
