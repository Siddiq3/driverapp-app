import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { getLanguage, hasChosenLanguage, LANGUAGES, setLanguage, t, type Lang } from "@/i18n";
import { colors, radius, space } from "@/theme";

/** First screen of the app (and in Account): pick a language. */
export default function LanguagePicker() {
  const { session } = useAuth();
  const current = hasChosenLanguage() ? getLanguage() : null;

  const pick = async (lang: Lang) => {
    await setLanguage(lang);
    // Notifications are sent in this language too
    if (session) api.updateMyProfile({ language: lang }).catch(() => undefined);
    router.replace("/");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.body}>
        <View style={styles.icon}>
          <Ionicons name="language" size={44} color={colors.white} />
        </View>
        {/* Shown in all languages so everyone can read it */}
        <Text style={styles.title}>Choose your language</Text>
        <Text style={styles.subtitle}>మీ భాషను ఎంచుకోండి · अपनी भाषा चुनें</Text>

        <View style={{ gap: space.md, marginTop: space.xxl }}>
          {LANGUAGES.map((l) => {
            const active = current === l.code;
            return (
              <Pressable
                key={l.code}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={l.name}
                onPress={() => pick(l.code)}
                style={({ pressed }) => [styles.option, active && styles.optionActive, pressed && { opacity: 0.85 }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.native, active && { color: colors.white }]}>{l.native}</Text>
                  {l.native !== l.name && <Text style={[styles.name, active && { color: "#CFCFCF" }]}>{l.name}</Text>}
                </View>
                <Ionicons
                  name={active ? "checkmark-circle" : "chevron-forward"}
                  size={26}
                  color={active ? colors.white : colors.textFaint}
                />
              </Pressable>
            );
          })}
        </View>
      </View>
      {current && (
        <Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button">
          <Text style={styles.backText}>{t("Back")}</Text>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  body: { flex: 1, padding: space.xl, justifyContent: "center" },
  icon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.black,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: space.xl,
  },
  title: { fontSize: 28, fontWeight: "800", color: colors.text, textAlign: "center" },
  subtitle: { fontSize: 17, color: colors.textMuted, textAlign: "center", marginTop: space.sm },
  option: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 76,
    paddingHorizontal: space.xl,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  optionActive: { backgroundColor: colors.black },
  native: { fontSize: 24, fontWeight: "800", color: colors.text },
  name: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  back: { alignSelf: "center", padding: space.xl },
  backText: { fontSize: 17, fontWeight: "700", color: colors.text },
});
