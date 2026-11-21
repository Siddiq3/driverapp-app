import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Screen, SectionLabel } from "@/components/Screen";
import { Avatar, RatingText } from "@/components/TripBits";
import { confirm, openWhatsApp, showError } from "@/lib/alert";
import * as api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { VEHICLE_LABEL } from "@/lib/format";
import type { UserRole } from "@/lib/types";
import { colors, font, radius, space } from "@/theme";

const SUPPORT = process.env.EXPO_PUBLIC_SUPPORT_PHONE ?? "";

export function Account({ mode }: { mode: UserRole }) {
  const { profile, driver, refresh, signOut } = useAuth();
  const [busy, setBusy] = useState(false);

  const switchMode = async () => {
    const next: UserRole = mode === "driver" ? "customer" : "driver";
    setBusy(true);
    try {
      if (mode === "driver" && driver?.is_available) await api.setAvailability(false);
      await api.setMode(next);
      await refresh();
      router.replace("/");
    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    if (!(await confirm("Sign out?", "You will need to sign in again to book or drive.", "Sign out", true))) return;
    try {
      if (driver?.is_available) await api.setAvailability(false);
    } catch {
      /* ignore */
    }
    await signOut();
    router.replace("/welcome");
  };

  return (
    <Screen>
      <View style={styles.head}>
        <Avatar name={profile?.full_name} url={profile?.avatar_url} size={72} />
        <View style={{ flex: 1 }}>
          <Text style={font.heading}>{profile?.full_name ?? "—"}</Text>
          <Text style={font.small}>{profile?.phone ?? "No phone added"}</Text>
          {mode === "driver" && driver && <RatingText avg={driver.rating_avg} count={driver.rating_count} />}
        </View>
      </View>

      {mode === "driver" && driver && (
        <>
          <SectionLabel>Your driver details</SectionLabel>
          <View style={styles.box}>
            <Text style={font.body}>
              {driver.has_car
                ? `${VEHICLE_LABEL[driver.vehicle_type ?? "hatchback"]} · ${driver.vehicle_model ?? ""} · ${driver.vehicle_number ?? ""}`
                : "Driving only (no own car)"}
            </Text>
            <Text style={[font.small, { marginTop: 4 }]}>Licence: {driver.licence_number}</Text>
            <Text style={[font.small, { marginTop: 4 }]}>Your rate: {driver.rate_note ?? "not set"}</Text>
          </View>
        </>
      )}

      <SectionLabel>Settings</SectionLabel>
      <Row icon="create-outline" label="Edit name and phone" onPress={() => router.push("/setup?edit=1")} />
      {mode === "driver" && <Row icon="car-outline" label="Edit car, licence or rate" onPress={() => router.push("/driver-register")} />}
      <Row
        icon="swap-horizontal"
        label={mode === "driver" ? "Switch to booking trips" : "Switch to driver mode"}
        onPress={switchMode}
        disabled={busy}
      />
      {SUPPORT ? (
        <Row
          icon="logo-whatsapp"
          label="Help on WhatsApp"
          onPress={() => openWhatsApp(SUPPORT, "Hi, I need help with the app.")}
        />
      ) : null}
      <Row icon="log-out-outline" label="Sign out" onPress={logout} danger />

      <Text style={styles.version}>Version {Constants.expoConfig?.version ?? "1.0.0"}</Text>
    </Screen>
  );
}

function Row({
  icon,
  label,
  onPress,
  danger,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  const color = danger ? colors.red : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surface }, disabled && { opacity: 0.5 }]}
    >
      <Ionicons name={icon} size={24} color={color} />
      <Text style={[styles.rowText, { color }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={20} color={colors.textFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: space.lg, marginBottom: space.md },
  box: { backgroundColor: colors.surface, borderRadius: radius.md, padding: space.lg },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.lg,
    minHeight: 60,
    paddingHorizontal: space.sm,
    borderRadius: radius.sm,
  },
  rowText: { flex: 1, fontSize: 17, fontWeight: "500" },
  version: { textAlign: "center", color: colors.textFaint, marginTop: space.xxl, fontSize: 13 },
});
