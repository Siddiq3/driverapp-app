import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { Button } from "@/components/Button";
import { OptionCard, Segmented } from "@/components/Choice";
import { Field } from "@/components/Field";
import { Screen, SectionLabel } from "@/components/Screen";
import { showError } from "@/lib/alert";
import * as api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { parseRupees, VEHICLE_HINT, VEHICLE_LABEL } from "@/lib/format";
import type { VehicleType } from "@/lib/types";
import { font, space } from "@/theme";
import { t } from "@/i18n";

export default function DriverRegister() {
  const { driver, refresh } = useAuth();

  const [hasCar, setHasCar] = useState<"yes" | "no">(driver ? (driver.has_car ? "yes" : "no") : "yes");
  const [vehicleType, setVehicleType] = useState<VehicleType>(driver?.vehicle_type ?? "hatchback");
  const [model, setModel] = useState(driver?.vehicle_model ?? "");
  const [number, setNumber] = useState(driver?.vehicle_number ?? "");
  const [licence, setLicence] = useState(driver?.licence_number ?? "");
  const [perKm, setPerKm] = useState(driver?.rate_per_km ? String(driver.rate_per_km) : "");
  const [perHour, setPerHour] = useState(driver?.rate_per_hour ? String(driver.rate_per_hour) : "");
  const [perDay, setPerDay] = useState(driver?.rate_per_day ? String(driver.rate_per_day) : "");
  const [rateNote, setRateNote] = useState(driver?.rate_note ?? "");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const car = hasCar === "yes";
    const next = {
      licence: licence.trim().length < 6 ? t("Enter your driving licence number") : undefined,
      number: car && number.trim().length < 6 ? t("Enter your car number, e.g. AP39AB1234") : undefined,
      price:
        (car && parseRupees(perKm)) || parseRupees(perHour) || parseRupees(perDay)
          ? undefined
          : t("Enter at least one price so customers know your rate"),
    };
    setErrors(next);
    if (next.licence || next.number || next.price) return;

    setBusy(true);
    try {
      await api.registerDriver({
        hasCar: car,
        vehicleType: car ? vehicleType : null,
        vehicleModel: model,
        vehicleNumber: number,
        licenceNumber: licence,
      });
      await api.setRates({
        perKm: car ? parseRupees(perKm) : null,
        perHour: parseRupees(perHour),
        perDay: parseRupees(perDay),
        note: rateNote,
      });
      await refresh();
      router.replace("/driver-pending");
    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      back
      title={t("Become a driver")}
      subtitle={t("We check every driver before they get trips. This keeps customers safe.")}
      footer={<Button title={t("Send for checking")} onPress={submit} loading={busy} />}
    >
      <Field
        label={t("Driving licence number")}
        icon="card-outline"
        value={licence}
        onChangeText={setLicence}
        placeholder={t("e.g. AP0920190012345")}
        autoCapitalize="characters"
        error={errors.licence}
      />

      <SectionLabel>{t("Do you have your own car?")}</SectionLabel>
      <Segmented
        value={hasCar}
        onChange={setHasCar}
        options={[
          { value: "yes", label: t("Yes, I have a car") },
          { value: "no", label: t("No, only driving") },
        ]}
      />
      <Text style={[font.small, { marginTop: space.sm }]}>
        {hasCar === "yes"
          ? t("You will get both kinds of trips: with your car, and driving a customer's car.")
          : t("You will get trips to drive a customer's own car.")}
      </Text>

      {hasCar === "yes" && (
        <View style={{ marginTop: space.lg }}>
          <SectionLabel>{t("Car type")}</SectionLabel>
          {(Object.keys(VEHICLE_LABEL) as VehicleType[]).map((v) => (
            <OptionCard
              key={v}
              icon={v === "suv" ? "bus-outline" : "car-outline"}
              title={VEHICLE_LABEL[v]}
              subtitle={VEHICLE_HINT[v]}
              selected={vehicleType === v}
              onPress={() => setVehicleType(v)}
            />
          ))}
          <View style={{ height: space.md }} />
          <Field label={t("Car model")} value={model} onChangeText={setModel} placeholder={t("e.g. Maruti Dzire")} />
          <Field
            label={t("Car number")}
            value={number}
            onChangeText={setNumber}
            placeholder={t("e.g. AP39AB1234")}
            autoCapitalize="characters"
            error={errors.number}
          />
        </View>
      )}

      <SectionLabel>{t("Your prices")}</SectionLabel>
      <Text style={[font.small, { marginBottom: space.md }]}>
        {t("Customers see these on your card. They can also offer their own price — you decide.")}
      </Text>
      {hasCar === "yes" && (
        <Field
          label={t("Price per km, with your car (₹)")}
          icon="speedometer-outline"
          value={perKm}
          onChangeText={setPerKm}
          placeholder={t("e.g. 12")}
          keyboardType="number-pad"
          maxLength={4}
        />
      )}
      <Field
        label={hasCar === "yes" ? t("Price per hour (₹)") : t("Price per hour, driving customer's car (₹)")}
        icon="time-outline"
        value={perHour}
        onChangeText={setPerHour}
        placeholder={hasCar === "yes" ? "e.g. 250" : "e.g. 150"}
        keyboardType="number-pad"
        maxLength={5}
      />
      <Field
        label={t("Price per day (₹)")}
        icon="sunny-outline"
        value={perDay}
        onChangeText={setPerDay}
        placeholder={hasCar === "yes" ? "e.g. 2000" : "e.g. 800"}
        keyboardType="number-pad"
        maxLength={6}
        error={errors.price}
      />
      <Field
        label={t("Anything else? (optional)")}
        icon="information-circle-outline"
        value={rateNote}
        onChangeText={setRateNote}
        placeholder={t("e.g. Night charges extra, toll extra")}
        maxLength={80}
      />

      <Text style={[font.small, { marginTop: space.md }]}>
        {hasCar === "yes"
          ? t("Our team may call you to see your licence, RC and insurance before approving.")
          : t("Our team may call you to see your licence before approving.")}
      </Text>
    </Screen>
  );
}
