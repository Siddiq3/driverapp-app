import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { homeRouteFor, useAuth } from "@/lib/auth";
import type { UserRole } from "@/lib/types";
import { colors } from "@/theme";

/** Bottom tabs shared by the customer and driver sides: Home · Trips · Account. */
export function TabsLayout({ mode }: { mode: UserRole }) {
  const { ready, session, profile, driver } = useAuth();

  if (ready && !session) return <Redirect href="/welcome" />;
  if (ready && profile) {
    const target = homeRouteFor(profile, driver);
    const expected = mode === "driver" ? "/driver/home" : "/customer/home";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (target !== expected) return <Redirect href={target as any} />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.black,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarLabelStyle: { fontSize: 13, fontWeight: "600" },
        tabBarStyle: { height: 64, paddingTop: 6, borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: "Trips",
          tabBarIcon: ({ color, size }) => <Ionicons name="time" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
