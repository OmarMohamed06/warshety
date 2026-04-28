"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import en from "../../messages/en.json";
import ar from "../../messages/ar.json";

export type Locale = "en" | "ar";

const messages: Record<Locale, Record<string, unknown>> = { en, ar };

/** Resolve a dot-path key like "nav.cart" from a nested object */
function resolve(obj: Record<string, unknown>, path: string): string {
  const result = path.split(".").reduce<unknown>((cur, key) => {
    if (typeof cur !== "object" || cur === null) return undefined;
    return (cur as Record<string, unknown>)[key];
  }, obj);
  return typeof result === "string" ? result : path;
}

interface LanguageContextValue {
  locale: Locale;
  isRTL: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
  setLocale: (locale: Locale) => void;
  /** Prepends /{locale} to an internal path. Pass-through for #, http, already-prefixed paths. */
  localePath: (path: string) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  locale: "en",
  isRTL: false,
  t: (key) => key,
  setLocale: () => {},
  localePath: (path) => path,
});

export function LanguageProvider({
  children,
  defaultLocale = "en",
}: {
  children: ReactNode;
  defaultLocale?: Locale;
}) {
  const [locale, _setLocale] = useState<Locale>(defaultLocale);
  const isRTL = locale === "ar";

  // Keep <html lang dir> in sync on the client (handles instant visual flip
  // before the full-page reload triggered by setLocale)
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
  }, [locale, isRTL]);

  function t(key: string, params?: Record<string, string | number>): string {
    let value = resolve(messages[locale], key);
    if (value === key) value = resolve(messages.en, key);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        value = value.replace(`{${k}}`, String(v));
      }
    }
    return value;
  }

  /** Build a locale-prefixed path for internal navigation */
  const localePath = useCallback(
    (path: string): string => {
      if (!path) return `/${locale}`;
      // Pass through: anchors, external URLs, already-prefixed paths
      if (
        path.startsWith("#") ||
        path.startsWith("http") ||
        path.startsWith("//") ||
        path.startsWith("/en/") ||
        path.startsWith("/ar/") ||
        path === "/en" ||
        path === "/ar"
      ) {
        return path;
      }
      return `/${locale}${path.startsWith("/") ? path : `/${path}`}`;
    },
    [locale],
  );

  function setLocale(next: Locale) {
    // Swap the locale prefix in the current browser URL and navigate.
    // The middleware will handle setting the cookie + x-locale header.
    if (typeof window === "undefined") return;
    const currentPath = window.location.pathname;
    const search = window.location.search;
    const strippedPath = currentPath.replace(/^\/(en|ar)/, "") || "/";
    window.location.href = `/${next}${strippedPath}${search}`;
  }

  return (
    <LanguageContext.Provider
      value={{ locale, isRTL, t, setLocale, localePath }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
