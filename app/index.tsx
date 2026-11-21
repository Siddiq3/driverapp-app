import { Redirect } from "expo-router";
import { Loading } from "@/components/Screen";
import { homeRouteFor, useAuth } from "@/lib/auth";

/** Sends each person to the right place when the app opens. */
export default function Index() {
  const { ready, session, profile, driver } = useAuth();

  if (!ready) return <Loading />;
  if (!session) return <Redirect href="/welcome" />;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <Redirect href={homeRouteFor(profile, driver) as any} />;
}
