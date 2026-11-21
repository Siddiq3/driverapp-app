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
import { VEHICLE_HINT, VEHICLE_LABEL } from "@/lib/format";
import type { VehicleType } from "@/lib/types";
import { font, space } from "@/theme";

export default function DriverRegister() {
  const { driver, refresh } = useAuth();

  const [hasCar, setHasCar] = useState<"yes" | "no">(driver ? (driver.has_car ? "yes" : "no") : "yes");
  const [vehicleType, setVehicleType] = useState<VehicleType>(driver?.vehicle_type ?? "hatchback");
  const [model, setModel] = useState(driver?.vehicle_model ?? "");
  const [number, setNumber] = useState(driver?.vehicle_number ?? "");
  const [licence, setLicence] = useState(driver?.licence_number ?? "");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const car = hasCar === "yes";
    const next = {
      licence: licence.trim().length < 6 ? "Enter your driving licence number" : undefined,
      number: car && number.trim().length < 6 ? "Enter your car number, e.g. AP39AB1234" : undefined,
    };
    setErrors(next);
    if (next.licence || next.number) return;

    setBusy(true);
    try {
      await api.registerDriver({
        hasCar: car,
        vehicleType: car ? vehicleType : null,
        vehicleModel: model,
        vehicleNumber: number,
        licenceNumber: licence,
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
      title="Become a driver"
      subtitle="We check every driver before they get trips. This keeps customers safe."
      footer={<Button title="Send for checking" onPress={submit} loading={busy} />}
    >
      <Field
        label="Driving licence number"
        icon="card-outline"
        value={licence}
        onChangeText={setLicence}
        placeholder="e.g. AP0920190012345"
        autoCapitalize="characters"
        error={errors.licence}
      />

      <SectionLabel>Do you have your own car?</SectionLabel>
      <Segmented
        value={hasCar}
        onChange={setHasCar}
        options={[
          { value: "yes", label: "Yes, I have a car" },
          { value: "no", label: "No, only driving" },
        ]}
      />
      <Text style={[font.small, { marginTop: space.sm }]}>
        {hasCar === "yes"
          ? "You will get both kinds of trips: with your car, and driving a customer's car."
          : "You will get trips to drive a customer's own car."}
      </Text>

      {hasCar === "yes" && (
        <View style={{ marginTop: space.lg }}>
          <SectionLabel>Car type</SectionLabel>
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
          <Field label="Car model" value={model} onChangeText={setModel} placeholder="e.g. Maruti Dzire" />
          <Field
            label="Car number"
            value={number}
            onChangeText={setNumber}
            placeholder="e.g. AP39AB1234"
            autoCapitalize="characters"
            error={errors.number}
          />
        </View>
      )}

      <Text style={[font.small, { marginTop: space.md }]}>
        Our team may call you to see your licence{hasCar === "yes" ? ", RC and insurance" : ""} before approving.
      </Text>
    </Screen>
  );
}
