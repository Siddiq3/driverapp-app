import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { colors } from "@/theme";

/** Calm pulsing circle shown while we look for a driver. */
export function Pulse({ icon = "car" }: { icon?: keyof typeof Ionicons.glyphMap }) {
  const a = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(a, { toValue: 1, duration: 1800, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [a]);

  const ring = {
    transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.6] }) }],
    opacity: a.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
  };

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.ring, ring]} />
      <View style={styles.core}>
        <Ionicons name={icon} size={36} color={colors.white} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 140, height: 140, alignItems: "center", justifyContent: "center", alignSelf: "center" },
  ring: { position: "absolute", width: 140, height: 140, borderRadius: 70, backgroundColor: colors.black },
  core: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.black,
    alignItems: "center",
    justifyContent: "center",
  },
});
