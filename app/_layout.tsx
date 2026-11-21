import * as Notifications from "expo-notifications";
import { router, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "@/lib/auth";
import { colors } from "@/theme";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

/** Opens the right screen when someone taps a notification. */
function NotificationRouter() {
  const { profile, ready } = useAuth();

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  useEffect(() => {
    const open = (data: Record<string, unknown> | undefined) => {
      const tripId = typeof data?.trip_id === "string" ? data.trip_id : null;
      if (!tripId) return;
      if (data?.type === "offer") router.navigate("/driver/home");
      else if (profile?.role === "driver") router.navigate(`/drive/${tripId}`);
      else router.navigate(`/trip/${tripId}`);
    };

    const sub = Notifications.addNotificationResponseReceivedListener((r) =>
      open(r.notification.request.content.data as Record<string, unknown>),
    );
    // App opened from a notification while it was closed
    Notifications.getLastNotificationResponseAsync().then((r) => {
      if (r) open(r.notification.request.content.data as Record<string, unknown>);
    });
    return () => sub.remove();
  }, [profile?.role]);

  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <NotificationRouter />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.white } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="welcome" options={{ gestureEnabled: false }} />
          <Stack.Screen name="location" options={{ gestureEnabled: false }} />
          <Stack.Screen name="setup" />
          <Stack.Screen name="driver-register" />
          <Stack.Screen name="driver-pending" options={{ gestureEnabled: false }} />
          <Stack.Screen name="customer" options={{ gestureEnabled: false }} />
          <Stack.Screen name="driver" options={{ gestureEnabled: false }} />
          <Stack.Screen name="search" options={{ animation: "slide_from_bottom" }} />
          <Stack.Screen name="pick-on-map" />
          <Stack.Screen name="ride" />
          <Stack.Screen name="trip/[id]" options={{ gestureEnabled: false }} />
          <Stack.Screen name="drive/[id]" options={{ gestureEnabled: false }} />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
