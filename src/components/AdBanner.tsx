import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import mobileAds, { BannerAd, BannerAdSize, TestIds } from "react-native-google-mobile-ads";
import { colors, space } from "@/theme";
import { t } from "@/i18n";

// v1 earns from ads only. Google test ads are used until real IDs are set in .env.
const UNIT_ID = process.env.EXPO_PUBLIC_ADMOB_BANNER_ID || TestIds.ADAPTIVE_BANNER;

let started = false;
/** Call once when the app opens. */
export function startAds() {
  if (started) return;
  started = true;
  mobileAds()
    .initialize()
    .catch(() => undefined);
}

/** A small banner ad. Hides itself if no ad loads, so it never leaves an empty gap. */
export function AdBanner({ label = true }: { label?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <View style={styles.wrap}>
      {label && <Text style={styles.label}>{t("Ad")}</Text>}
      <BannerAd
        unitId={UNIT_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        onAdFailedToLoad={() => setFailed(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", marginVertical: space.md },
  label: { alignSelf: "flex-start", fontSize: 11, color: colors.textFaint, marginBottom: 2 },
});
