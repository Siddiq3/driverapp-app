import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text } from "react-native";
import { Button } from "@/components/Button";
import { OptionCard } from "@/components/Choice";
import { Field } from "@/components/Field";
import { Screen, SectionLabel } from "@/components/Screen";
import { showError } from "@/lib/alert";
import * as api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { normalisePhone } from "@/lib/format";
import type { UserRole } from "@/lib/types";
import { font, space } from "@/theme";

/** First-time setup (name, phone, customer or driver). Also used to edit the profile. */
export default function Setup() {
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const editing = edit === "1";
  const { profile, refresh } = useAuth();

  const [name, setName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [role, setRole] = useState<UserRole>(profile?.role ?? "customer");
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const cleanPhone = normalisePhone(phone);
    const next = {
      name: name.trim().length < 2 ? "Please enter your name" : undefined,
      phone: cleanPhone ? undefined : "Enter a 10-digit mobile number",
    };
    setErrors(next);
    if (next.name || next.phone) return;

    setBusy(true);
    try {
      await api.updateMyProfile({ full_name: name.trim(), phone: cleanPhone!, ...(editing ? {} : { role }) });
      await refresh();
      if (editing) {
        router.back();
        return;
      }
      router.replace("/");
    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      back={editing}
      title={editing ? "Your details" : "Welcome!"}
      subtitle={editing ? undefined : "Tell us a little about you."}
      footer={<Button title={editing ? "Save" : "Continue"} onPress={save} loading={busy} />}
    >
      <Field
        label="Your name"
        icon="person-outline"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Ravi Kumar"
        autoCapitalize="words"
        error={errors.name}
      />
      <Field
        label="Mobile number"
        icon="call-outline"
        value={phone}
        onChangeText={setPhone}
        placeholder="10-digit number"
        keyboardType="phone-pad"
        maxLength={14}
        error={errors.phone}
        hint="Your driver or customer will call you on this number."
      />

      {!editing && (
        <>
          <SectionLabel>How will you use the app?</SectionLabel>
          <OptionCard
            icon="person"
            title="I need a car or driver"
            subtitle="Book trips"
            selected={role === "customer"}
            onPress={() => setRole("customer")}
          />
          <OptionCard
            icon="car-sport"
            title="I am a driver"
            subtitle="Get trips near you"
            selected={role === "driver"}
            onPress={() => setRole("driver")}
          />
          <Text style={[font.small, { marginTop: space.sm }]}>You can switch later from your account.</Text>
        </>
      )}
    </Screen>
  );
}
