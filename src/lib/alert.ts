import { Alert, Linking } from "react-native";

export function showError(err: unknown, title = "Sorry") {
  const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
  Alert.alert(title, message);
}

export function confirm(title: string, message: string, yesLabel = "Yes", destructive = false): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: "No", style: "cancel", onPress: () => resolve(false) },
      { text: yesLabel, style: destructive ? "destructive" : "default", onPress: () => resolve(true) },
    ]);
  });
}

export function callNumber(phone: string | null | undefined) {
  if (!phone) return Alert.alert("No phone number", "This person has not added a phone number.");
  Linking.openURL(`tel:${phone}`).catch(() => Alert.alert("Could not open the phone app"));
}

/** Opens Google Maps directions (free, no API key). */
export function navigateTo(lat: number, lng: number) {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
  Linking.openURL(url).catch(() => Alert.alert("Could not open maps"));
}

export function openWhatsApp(phoneDigits: string, text: string) {
  const url = `https://wa.me/${phoneDigits}?text=${encodeURIComponent(text)}`;
  Linking.openURL(url).catch(() => Alert.alert("Could not open WhatsApp"));
}
