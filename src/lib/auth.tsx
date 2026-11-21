import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import type { Session } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as api from "./api";
import { registerForPush } from "./push";
import { supabase } from "./supabase";
import { getLanguage } from "@/i18n";
import type { Driver, Profile } from "./types";
import { t } from "@/i18n";

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  scopes: ["profile", "email"],
});

type AuthState = {
  ready: boolean;
  session: Session | null;
  profile: Profile | null;
  driver: Driver | null;
  /** Reload profile + driver details from the server. */
  refresh: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [driver, setDriver] = useState<Driver | null>(null);

  const load = useCallback(async (s: Session | null) => {
    if (!s) {
      setProfile(null);
      setDriver(null);
      return;
    }
    const [p, d] = await Promise.all([api.getMyProfile(), api.getMyDriver()]);
    setProfile(p);
    setDriver(d);
    // Notifications are sent in the app's language
    if (p && p.language !== getLanguage()) api.updateMyProfile({ language: getLanguage() }).catch(() => undefined);
  }, []);

  useEffect(() => {
    let alive = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      setSession(data.session);
      try {
        await load(data.session);
      } catch {
        /* offline: screens will retry */
      }
      if (alive) setReady(true);
      if (data.session) registerForPush();
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "SIGNED_IN") {
        load(s).catch(() => undefined);
        registerForPush();
      }
      if (event === "SIGNED_OUT") load(null);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [load]);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await load(data.session);
  }, [load]);

  const signInWithGoogle = useCallback(async () => {
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const res = await GoogleSignin.signIn();
      if (!isSuccessResponse(res)) return; // user closed the dialog
      const idToken = res.data.idToken;
      if (!idToken) throw new api.ApiError(t("Google sign-in failed. Please try again."));
      await api.signInWithGoogleIdToken(idToken);
      const { data } = await supabase.auth.getSession();
      await load(data.session);
    } catch (err) {
      if (isErrorWithCode(err)) {
        if (err.code === statusCodes.IN_PROGRESS) return;
        if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          throw new api.ApiError(t("Please update Google Play services and try again."));
        }
      }
      throw err;
    }
  }, [load]);

  const signOut = useCallback(async () => {
    await api.signOut();
    try {
      await GoogleSignin.signOut();
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({ ready, session, profile, driver, refresh, signInWithGoogle, signOut }),
    [ready, session, profile, driver, refresh, signInWithGoogle, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

/** Where a signed-in user should land, based on their account. */
export function homeRouteFor(profile: Profile | null, driver: Driver | null): string {
  if (!profile || !profile.full_name || !profile.phone) return "/setup";
  if (profile.role === "driver") {
    if (!driver) return "/driver-register";
    if (driver.status !== "approved") return "/driver-pending";
    return "/driver/home";
  }
  return "/customer/home";
}
