"use client";

import { Languages } from "lucide-react";
import { APP_LANGUAGES } from "@/lib/i18n/config";
import { useLanguage } from "./LanguageProvider";

export default function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useLanguage();

  return (
    <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white/90 px-2.5 py-2 text-sm shadow-sm backdrop-blur dark:border-midnight-border dark:bg-midnight/90" title={t("language")}>
      <Languages className="h-4 w-4 shrink-0 text-radar" />
      {!compact && <span className="hidden sm:inline text-xs font-semibold text-slate-500 dark:text-slate-400">{t("language")}</span>}
      <select
        aria-label={t("language")}
        value={locale}
        onChange={(event) => setLocale(event.target.value as typeof locale)}
        className="max-w-[132px] bg-transparent text-xs font-semibold outline-none"
      >
        {APP_LANGUAGES.map((item) => (
          <option key={item.code} value={item.code}>{item.nativeLabel}</option>
        ))}
      </select>
    </label>
  );
}
