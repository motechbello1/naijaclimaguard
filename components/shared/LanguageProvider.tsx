"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { APP_LANGUAGES, AppLocale, isAppLocale, LOCALE_STORAGE_KEY } from "@/lib/i18n/config";
import { MESSAGES, MessageKey } from "@/lib/i18n/messages";

type LanguageContextValue = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  t: (key: MessageKey) => string;
  languageLabel: string;
  hydrated: boolean;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>("en");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isAppLocale(saved)) setLocaleState(saved);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    document.documentElement.lang = locale === "pcm" ? "en-NG" : locale;
    document.documentElement.dataset.locale = locale;
    window.dispatchEvent(new CustomEvent("naijaclimaguard:locale-change", { detail: locale }));
  }, [locale, hydrated]);

  const setLocale = (next: AppLocale) => {
    setLocaleState(next);
  };

  const value = useMemo<LanguageContextValue>(() => ({
    locale,
    setLocale,
    t: (key) => MESSAGES[locale]?.[key] || MESSAGES.en[key],
    languageLabel: APP_LANGUAGES.find((item) => item.code === locale)?.nativeLabel || "English",
    hydrated,
  }), [locale, hydrated]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLanguage must be used inside LanguageProvider");
  return value;
}
