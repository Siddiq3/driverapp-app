import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

/** Seconds left until an ISO time; updates every second. */
export function useSecondsLeft(untilIso: string | null | undefined): number {
  const calc = () => (untilIso ? Math.max(0, (new Date(untilIso).getTime() - Date.now()) / 1000) : 0);
  const [left, setLeft] = useState(calc);

  useEffect(() => {
    setLeft(calc());
    if (!untilIso) return;
    const t = setInterval(() => setLeft(calc()), 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [untilIso]);

  return left;
}

/** Runs `fn` every `ms` while the screen is focused AND the app is open. */
export function useForegroundInterval(fn: () => void, ms: number, enabled = true) {
  const saved = useRef(fn);
  saved.current = fn;

  useFocusEffect(
    useCallback(() => {
      if (!enabled) return;
      let timer: ReturnType<typeof setInterval> | null = setInterval(() => saved.current(), ms);
      const sub = AppState.addEventListener("change", (s) => {
        if (s === "active" && !timer) {
          saved.current();
          timer = setInterval(() => saved.current(), ms);
        } else if (s !== "active" && timer) {
          clearInterval(timer);
          timer = null;
        }
      });
      return () => {
        if (timer) clearInterval(timer);
        sub.remove();
      };
    }, [ms, enabled]),
  );
}

/** Re-runs `fn` whenever the app comes back to the foreground. */
export function useOnAppActive(fn: () => void) {
  const saved = useRef(fn);
  saved.current = fn;
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") saved.current();
    });
    return () => sub.remove();
  }, []);
}
