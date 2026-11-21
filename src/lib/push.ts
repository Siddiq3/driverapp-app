import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { updateMyProfile } from "./api";

// Show notifications even when the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function createChannels() {
  if (Platform.OS !== "android") return;
  // Loud, high-priority channel so drivers notice new trips while driving.
  await Notifications.setNotificationChannelAsync("trip-requests", {
    name: "New trip requests",
    importance: Notifications.AndroidImportance.MAX,
    sound: "default",
    vibrationPattern: [0, 500, 250, 500, 250, 500],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
  await Notifications.setNotificationChannelAsync("trip-updates", {
    name: "Trip updates",
    importance: Notifications.AndroidImportance.HIGH,
    sound: "default",
  });
}

/** Asks permission, gets this phone's Expo push token, and saves it to the profile. */
export async function registerForPush(): Promise<string | null> {
  try {
    await createChannels();
    if (!Device.isDevice) return null;

    const current = await Notifications.getPermissionsAsync();
    let granted = current.granted;
    if (!granted) {
      const asked = await Notifications.requestPermissionsAsync();
      granted = asked.granted;
    }
    if (!granted) return null;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    await updateMyProfile({ push_token: token });
    return token;
  } catch (err) {
    console.warn("Push registration failed", err);
    return null;
  }
}
