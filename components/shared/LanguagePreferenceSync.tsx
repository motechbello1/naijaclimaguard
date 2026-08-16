"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useLanguage } from "./LanguageProvider";
import type { AppLocale } from "@/lib/i18n/config";

const TO_SERVER: Record<AppLocale, string> = {
  en: "ENGLISH",
  pcm: "PIDGIN",
  ha: "HAUSA",
  yo: "YORUBA",
  ig: "IGBO",
};

const FROM_SERVER: Record<string, AppLocale> = {
  ENGLISH: "en",
  PIDGIN: "pcm",
  HAUSA: "ha",
  YORUBA: "yo",
  IGBO: "ig",
};

export default function LanguagePreferenceSync() {
  const { data: session, status } = useSession();
  const { locale, setLocale } = useLanguage();
  const hydrated = useRef(false);
  const previousLocale = useRef(locale);
  const isFounder = (session?.user as { role?: string } | undefined)?.role === "FOUNDER";

  useEffect(() => {
    if (status !== "authenticated" || isFounder || hydrated.current) return;
    hydrated.current = true;
    fetch("/api/profile/delivery", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        const saved = FROM_SERVER[String(data?.delivery?.platformLanguage || "")];
        if (saved) {
          previousLocale.current = saved;
          setLocale(saved);
        }
      })
      .catch(() => undefined);
  }, [isFounder, status, setLocale]);

  useEffect(() => {
    if (status !== "authenticated" || isFounder || !hydrated.current) {
      previousLocale.current = locale;
      return;
    }
    if (previousLocale.current === locale) return;
    previousLocale.current = locale;
    fetch("/api/profile/delivery", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platformLanguage: TO_SERVER[locale] }),
    }).catch(() => undefined);
  }, [isFounder, locale, status]);

  return null;
}
