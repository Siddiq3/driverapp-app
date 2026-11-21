import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, font, space } from "@/theme";
import { t } from "@/i18n";

/** Standard page: safe area, optional back button + title, scrolling content, sticky footer. */
export function Screen({
  title,
  subtitle,
  back,
  children,
  footer,
  scroll = true,
}: {
  title?: string;
  subtitle?: string;
  back?: boolean;
  children: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
}) {
  const body = (
    <>
      {(back || title) && (
        <View style={styles.header}>
          {back && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("Go back")}
              hitSlop={12}
              onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
              style={styles.back}
            >
              <Ionicons name="arrow-back" size={26} color={colors.black} />
            </Pressable>
          )}
          {title && <Text style={font.title}>{title}</Text>}
          {subtitle && <Text style={[font.small, { marginTop: space.xs }]}>{subtitle}</Text>}
        </View>
      )}
      {children}
    </>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {scroll ? (
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {body}
          </ScrollView>
        ) : (
          <View style={[styles.content, { flex: 1 }]}>{body}</View>
        )}
        {footer && <View style={styles.footer}>{footer}</View>}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Loading({ label }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.black} />
      {label && <Text style={[font.small, { marginTop: space.md }]}>{label}</Text>}
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={36} color={colors.black} />
      </View>
      <Text style={[font.heading, { textAlign: "center" }]}>{title}</Text>
      {message && <Text style={[font.small, { textAlign: "center", marginTop: space.sm }]}>{message}</Text>}
      {action && <View style={{ marginTop: space.xl, alignSelf: "stretch" }}>{action}</View>}
    </View>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <Text style={styles.section}>{children}</Text>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  content: { padding: space.xl, paddingBottom: space.xxl },
  header: { marginBottom: space.xl },
  back: { marginBottom: space.lg, alignSelf: "flex-start" },
  footer: {
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    paddingBottom: space.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
    gap: space.sm,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.white },
  empty: { alignItems: "center", paddingVertical: space.xxl * 2, paddingHorizontal: space.xl },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.lg,
  },
  section: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: space.xl,
    marginBottom: space.sm,
  },
});
