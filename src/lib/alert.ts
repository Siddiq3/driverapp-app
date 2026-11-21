import { Alert, Linking } from "react-native";
import { t } from "@/i18n";

export function showError(err: unknown, title?: string) {
  const message = err instanceof Error ? t(err.message) : t("Something went wrong. Please try again.");
  Alert.alert(title ?? t("Sorry"), message);
}

export function confirm(title: string, message: string, yesLabel?: string, destructive = false): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: t("No"), style: "cancel", onPress: () => resolve(false) },
      { text: yesLabel ?? t("Yes"), style: destructive ? "destructive" : "default", onPress: () => resolve(true) },
    ]);
  });
}

export function callNumber(phone: string | null | undefined) {
  if (!phone) return Alert.alert(t("No phone number"), t("This person has not added a phone number."));
  Linking.openURL(`tel:${phone}`).catch(() => Alert.alert(t("Could not open the phone app")));
}

/** Opens Google Maps directions (free, no API key). */
export function navigateTo(lat: number, lng: number) {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
  Linking.openURL(url).catch(() => Alert.alert(t("Could not open maps")));
}

export function openWhatsApp(phoneDigits: string, text: string) {
  const url = `https://wa.me/${phoneDigits}?text=${encodeURIComponent(text)}`;
  Linking.openURL(url).catch(() => Alert.alert(t("Could not open WhatsApp")));
}
