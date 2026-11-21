import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { Loading } from "@/components/Screen";
import { homeRouteFor, useAuth } from "@/lib/auth";
import { locationAccess, type LocationAccess } from "@/lib/location";

/**
 * Sends each person to the right place when the app opens:
 * not signed in → welcome · no location permission → location · then setup / home.
 */
export default function Index() {
  const { ready, session, profile, driver } = useAuth();
  const [access, setAccess] = useState<LocationAccess | null>(null);

  useEffect(() => {
    if (!session) return;
    locationAccess()
      .then(setAccess)
      .catch(() => setAccess("granted")); // never trap the user on an error
  }, [session]);

  if (!ready) return <Loading />;
  if (!session) return <Redirect href="/welcome" />;
  if (!access) return <Loading />;
  if (access !== "granted") return <Redirect href="/location" />;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <Redirect href={homeRouteFor(profile, driver) as any} />;
}
