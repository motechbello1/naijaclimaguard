"use client";

import { Headphones, Loader2, Square } from "lucide-react";
import { useLanguage } from "./LanguageProvider";
import { useSpeech } from "./SpeechProvider";

interface Props {
  targetId: string;
  compact?: boolean;
  label?: string;
  className?: string;
}

const labelByLocale: Record<string, string> = {
  en: "Listen to this",
  pcm: "Hear this one",
  ha: "Saurari wannan",
  yo: "Gbọ́ èyí",
  ig: "Gee nke a",
};

export default function ReadSectionButton({ targetId, compact = false, label, className = "" }: Props) {
  const { locale } = useLanguage();
  const { speaking, loading, activeTarget, speakTarget, stop, error } = useSpeech();
  const active = activeTarget === targetId && (speaking || loading);

  return (
    <div className={`inline-flex flex-col items-start gap-1 ${className}`}>
      <button
        type="button"
        onClick={() => active ? stop() : speakTarget(targetId)}
        className="inline-flex min-h-10 items-center gap-2 rounded-full border border-black/10 bg-white/85 px-3.5 py-2 text-xs font-extrabold text-[#0d1f19] shadow-sm transition hover:border-emerald-600/30 dark:border-white/12 dark:bg-white/[.07] dark:text-white"
        aria-label={active ? "Stop audio" : (label || labelByLocale[locale] || labelByLocale.en)}
      >
        {loading && active ? <Loader2 className="h-4 w-4 animate-spin text-emerald-700 dark:text-[#d9ff57]" /> : active ? <Square className="h-3.5 w-3.5 fill-current text-emerald-700 dark:text-[#d9ff57]" /> : <Headphones className="h-4 w-4 text-emerald-700 dark:text-[#d9ff57]" />}
        {!compact && <span>{active ? (locale === "pcm" ? "Stop am" : locale === "ha" ? "Tsaya" : locale === "yo" ? "Dúró" : locale === "ig" ? "Kwụsị" : "Stop") : (label || labelByLocale[locale] || labelByLocale.en)}</span>}
      </button>
      {error && activeTarget === targetId ? <span className="max-w-[240px] text-[10px] leading-4 text-rose-600 dark:text-rose-300">{error}</span> : null}
    </div>
  );
}
