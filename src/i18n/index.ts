// =============================================================================
// Languages
//
// The English sentence itself is the key:   t("Book now")
// Each language file maps English → that language. Anything missing simply
// shows in English, so the app never breaks while a translation is pending.
// Add a language: create xx.ts like te.ts and add it to LANGUAGES below.
// =============================================================================

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";
import { hi } from "./hi";
import { te } from "./te";

export type Lang = "en" | "te" | "hi";

export const LANGUAGES: { code: Lang; name: string; native: string }[] = [
  { code: "en", name: "English", native: "English" },
  { code: "te", name: "Telugu", native: "తెలుగు" },
  { code: "hi", name: "Hindi", native: "हिन्दी" },
];

const DICTS: Record<Lang, Record<string, string>> = { en: {}, te, hi };
const STORAGE_KEY = "app-language-v1";

let current: Lang = "en";
let chosen = false; // has the person picked a language yet?
const listeners = new Set<() => void>();

/** Translate. Use {name} placeholders: t("Waiting for {name}", { name: "Ravi" }). */
export function t(english: string, vars?: Record<string, string | number>): string {
  let out = DICTS[current][english] ?? english;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
  }
  return out;
}

/** Wraps a map of English labels so every read is translated, e.g. SERVICE_LABEL[x]. */
export function translated<T extends Record<string, string>>(map: T): T {
  return new Proxy(map, {
    get: (target, key) => {
      const v = target[key as keyof T];
      return typeof v === "string" ? t(v) : v;
    },
  });
}

export function getLanguage(): Lang {
  return current;
}

export function hasChosenLanguage(): boolean {
  return chosen;
}

/** Load the saved choice (call once at startup). Returns true if one was saved. */
export async function loadLanguage(): Promise<boolean> {
  try {
    const saved = (await AsyncStorage.getItem(STORAGE_KEY)) as Lang | null;
    if (saved && saved in DICTS) {
      current = saved;
      chosen = true;
      emit();
      return true;
    }
  } catch {
    /* use English */
  }
  return false;
}

export async function setLanguage(lang: Lang): Promise<void> {
  current = lang;
  chosen = true;
  emit();
  try {
    await AsyncStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* still changed for this session */
  }
}

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** Re-renders when the language changes. */
export function useLanguage(): Lang {
  return useSyncExternalStore(subscribe, getLanguage, getLanguage);
}
