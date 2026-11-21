import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Button } from "@/components/Button";
import { EmptyState, Screen } from "@/components/Screen";
import { openWhatsApp, showError } from "@/lib/alert";
import * as api from "@/lib/api";
import { homeRouteFor, useAuth } from "@/lib/auth";
import { useOnAppActive } from "@/lib/hooks";
import { t } from "@/i18n";

const SUPPORT = process.env.EXPO_PUBLIC_SUPPORT_PHONE ?? "";

export default function DriverPending() {
  const { driver, profile, refresh } = useAuth();
  const [busy, setBusy] = useState(false);

  const check = useCallback(async () => {
    try {
      await refresh();
      const [p, d] = await Promise.all([api.getMyProfile(), api.getMyDriver()]);
      if (d?.status === "approved") router.replace(homeRouteFor(p, d) as never);
    } catch {
      /* stay here */
    }
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      check();
    }, [check]),
  );
  useOnAppActive(check);

  const switchToCustomer = async () => {
    setBusy(true);
    try {
      await api.setMode("customer");
      await refresh();
      router.replace("/customer/home");
    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  };

  const rejected = driver?.status === "rejected";
  const blocked = driver?.status === "blocked";

  return (
    <Screen
      footer={
        <>
          {SUPPORT ? (
            <Button
              title={t("Message us on WhatsApp")}
              icon="logo-whatsapp"
              variant="secondary"
              onPress={() => openWhatsApp(SUPPORT, t("Hi, I am {name}. About my driver account.", { name: profile?.full_name ?? "" }))}
            />
          ) : null}
          {rejected && <Button title={t("Edit my details")} onPress={() => router.push("/driver-register")} />}
          <Button title={t("Book a trip instead")} variant="ghost" onPress={switchToCustomer} loading={busy} />
        </>
      }
    >
      {blocked ? (
        <EmptyState icon="lock-closed" title={t("Account on hold")} message={t("Please contact us to know more.")} />
      ) : rejected ? (
        <EmptyState
          icon="close-circle"
          title={t("Not approved yet")}
          message={t("Some details could not be checked. Please correct them or message us.")}
        />
      ) : (
        <EmptyState
          icon="hourglass"
          title={t("We are checking your details")}
          message={t("This usually takes less than a day. We may call you. You will be able to go online once approved.")}
          action={<Button title={t("Check again")} variant="secondary" onPress={async () => { try { await check(); } catch (e) { showError(e); } }} />}
        />
      )}
    </Screen>
  );
}
