"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { APP_LANGUAGES, AppLocale, isAppLocale, LOCALE_STORAGE_KEY } from "@/lib/i18n/config";
import { MESSAGES, MessageKey } from "@/lib/i18n/messages";
import { translateActionOSExact } from "@/lib/i18n/action-os";

type LanguageContextValue = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  t: (key: MessageKey) => string;
  languageLabel: string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

const ACTION_OS_PATHS = ["/action-center", "/drill", "/emergency-pack"];

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>("en");

  useEffect(() => {
    const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isAppLocale(saved)) setLocaleState(saved);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    document.documentElement.lang = locale === "pcm" ? "en-NG" : locale;
    document.documentElement.dataset.locale = locale;
  }, [locale]);

  useEffect(() => {
    if (!ACTION_OS_PATHS.some((path) => window.location.pathname.startsWith(path))) return;

    let applying = false;
    const translateTree = (root: Node) => {
      if (applying) return;
      applying = true;
      try {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        const nodes: Text[] = [];
        let current = walker.nextNode();
        while (current) {
          nodes.push(current as Text);
          current = walker.nextNode();
        }
        for (const node of nodes) {
          const parent = node.parentElement;
          if (!parent || ["SCRIPT", "STYLE", "NOSCRIPT"].includes(parent.tagName)) continue;
          const raw = node.nodeValue || "";
          const trimmed = raw.trim();
          if (!trimmed) continue;
          const translated = translateActionOSExact(trimmed, locale);
          if (translated !== trimmed) node.nodeValue = raw.replace(trimmed, translated);
        }
      } finally {
        applying = false;
      }
    };

    translateTree(document.body);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") translateTree(mutation.target);
        else mutation.addedNodes.forEach((node) => translateTree(node));
      }
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true });
    return () => observer.disconnect();
  }, [locale]);

  const value = useMemo<LanguageContextValue>(() => ({
    locale,
    setLocale: (next) => setLocaleState(next),
    t: (key) => MESSAGES[locale]?.[key] || MESSAGES.en[key],
    languageLabel: APP_LANGUAGES.find((item) => item.code === locale)?.nativeLabel || "English",
  }), [locale]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLanguage must be used inside LanguageProvider");
  return value;
}
