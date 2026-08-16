"use client";

import { Languages } from "lucide-react";
import { APP_LANGUAGES } from "@/lib/i18n/config";
import { useLanguage } from "./LanguageProvider";

export default function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useLanguage();

  return (
    <label className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-900 shadow-sm backdrop-blur dark:border-slate-600 dark:bg-[#101c18] dark:text-white" title={t("language")}>
      <Languages className="h-4 w-4 shrink-0 text-radar" />
      {!compact && <span className="hidden sm:inline text-xs font-semibold text-slate-500 dark:text-slate-400">{t("language")}</span>}
      <select
        aria-label={t("language")}
        value={locale}
        onChange={(event) => setLocale(event.target.value as typeof locale)}
        className="ncg-language-select max-w-[132px] bg-transparent text-xs font-semibold text-slate-900 outline-none dark:text-white"
      >
        {APP_LANGUAGES.map((item) => (
          <option key={item.code} value={item.code} className="bg-white text-slate-950">{item.nativeLabel}</option>
        ))}
      </select>
    </label>
  );
}
