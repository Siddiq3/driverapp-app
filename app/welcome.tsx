import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/Button";
import { homeRouteFor, useAuth } from "@/lib/auth";
import { showError } from "@/lib/alert";
import * as api from "@/lib/api";
import { colors, space } from "@/theme";

export default function Welcome() {
  const { signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);

  const onGoogle = async () => {
    setBusy(true);
    try {
      await signInWithGoogle();
      const [profile, driver] = await Promise.all([api.getMyProfile(), api.getMyDriver()]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.replace(homeRouteFor(profile, driver) as any);
    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.top}>
        <View style={styles.logo}>
          <Ionicons name="car-sport" size={44} color={colors.black} />
        </View>
        <Text style={styles.brand}>DriverApp</Text>
        <Text style={styles.tagline}>A car or a driver,{"\n"}in a few minutes.</Text>

        <View style={styles.points}>
          <Point icon="flash" text="No more calling driver after driver" />
          <Point icon="shield-checkmark" text="Every driver is checked by us" />
          <Point icon="cash" text="Fair price shown before you book" />
        </View>
      </View>

      <View style={styles.bottom}>
        <Button
          title="Continue with Google"
          icon="logo-google"
          variant="secondary"
          onPress={onGoogle}
          loading={busy}
        />
        <Text style={styles.legal}>By continuing you agree to our Terms and Privacy Policy.</Text>
      </View>
    </SafeAreaView>
  );
}

function Point({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.point}>
      <Ionicons name={icon} size={22} color={colors.white} />
      <Text style={styles.pointText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.black },
  top: { flex: 1, padding: space.xl, justifyContent: "center" },
  logo: {
    width: 76,
    height: 76,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.lg,
  },
  brand: { fontSize: 22, fontWeight: "700", color: colors.white, opacity: 0.8 },
  tagline: { fontSize: 38, fontWeight: "800", color: colors.white, marginTop: space.sm, lineHeight: 46 },
  points: { marginTop: space.xxl, gap: space.lg },
  point: { flexDirection: "row", alignItems: "center", gap: space.md },
  pointText: { fontSize: 17, color: colors.white, flex: 1 },
  bottom: { padding: space.xl, gap: space.md },
  legal: { fontSize: 13, color: "#A6A6A6", textAlign: "center" },
});
